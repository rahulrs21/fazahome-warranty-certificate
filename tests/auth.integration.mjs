import assert from "node:assert/strict";
import { getAdminAuth } from "../firebase/admin.mjs";
import { jsPDF } from "jspdf";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!emulator || !/^(127\.0\.0\.1|localhost):\d+$/.test(emulator) || !projectId?.startsWith("demo-")) {
  throw new Error("These tests require a local Auth emulator and a demo- project. See FIREBASE_AUTH_SETUP.md.");
}
const base = process.env.AUTH_TEST_BASE_URL || "http://127.0.0.1:3101";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error("Tests must target a local app server.");
process.env.FIREBASE_ADMIN_PROJECT_ID = "not-a-demo-project";
assert.throws(() => getAdminAuth(), { status: 503 }, "Real projects must not accept emulator tokens");
process.env.FIREBASE_ADMIN_PROJECT_ID = projectId;
const auth = getAdminAuth();
const password = "Faza-Test-Password42!";
const ids = [];
const suffix = Date.now();
const testPdf = new jsPDF();
testPdf.text("Faza Home notification attachment test", 20, 20);
const pdfBase64 = Buffer.from(testPdf.output("arraybuffer")).toString("base64");

async function request(path, { method = "GET", body, cookie, origin = base, site } = {}) {
  const url = new URL(path, base);
  if (url.pathname.startsWith("/api/") && !url.pathname.endsWith("/")) url.pathname += "/";
  const response = await fetch(url, { method, redirect: "manual", headers: {
    ...(cookie ? { Cookie: cookie } : {}),
    ...(method !== "GET" ? { Origin: origin } : {}),
    ...(site ? { "Sec-Fetch-Site": site } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status, data, headers: response.headers };
}

async function account(label, role) {
  const record = await auth.createUser({ email: `${label}-${suffix}@faza-test.example`, password, displayName: `Test ${label}` });
  ids.push(record.uid);
  if (role) await auth.setCustomUserClaims(record.uid, { fazaRole: role });
  return record;
}

async function idToken(email) {
  const response = await fetch(`http://${emulator}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result.idToken;
}

async function login(email) {
  const result = await request("/api/auth/session", { method: "POST", body: { idToken: await idToken(email) } });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const cookieHeader = result.headers.get("set-cookie");
  assert.ok(cookieHeader.includes("HttpOnly") && cookieHeader.includes("SameSite=Lax"));
  assert.ok(cookieHeader.includes("Max-Age=28800"));
  return cookieHeader.split(";")[0];
}

async function signup(label) {
  const email = `${label}-${suffix}@faza-test.example`;
  const response = await fetch(`http://${emulator}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  ids.push(result.localId);
  return { uid: result.localId, email, idToken: result.idToken };
}

try {
  for (const path of ["/", "/admin/", "/components/AnimatedBg/", "/components/lastUploadedFile/", "/components/pdfdownload/"]) {
    const result = await request(path);
    assert.equal(result.status, 307, path);
    assert.ok(result.headers.get("location").startsWith("/login/"));
    assert.ok(result.headers.get("cache-control").includes("no-store"));
  }
  for (const path of ["/api/admin/users", "/api/certificate-stamp", "/api/hello", "/api/auth/session"]) {
    assert.equal((await request(path)).status, 401, path);
  }
  assert.equal((await request("/api/extract", { method: "POST", body: {} })).status, 401);
  assert.equal((await request("/api/pdf-download", { method: "POST", body: { filename: "test.pdf" } })).status, 401);
  assert.equal((await request("/api/admin/permissions")).status, 401);
  assert.equal((await request("/api/auth/register")).status, 405);
  assert.equal((await request("/api/auth/register", { method: "POST", body: { idToken: "fake", name: "Test" }, origin: "https://attacker.example" })).status, 403);
  assert.equal((await request("/api/auth/register", { method: "POST", body: { idToken: "fake", name: "Test" } })).status, 401);
  assert.equal((await request("/authorised-signature-faza.png")).status, 404, "Stamp must not be publicly served");
  assert.equal((await request("/api/admin/users", { cookie: "faza_session=forged" })).status, 401);
  assert.equal((await request("/api/auth/session", { method: "POST", body: { idToken: "fake" }, origin: "https://attacker.example" })).status, 403);
  assert.equal((await request("/api/auth/session", { method: "POST", body: { idToken: "fake" }, site: "cross-site" })).status, 403);
  console.log("PASS: anonymous routes/APIs/stamp blocked; forged sessions and CSRF rejected");

  const admin = await account("admin", "admin");
  const member = await account("member", "member");
  const outsider = await account("outsider");
  assert.equal((await request("/api/auth/session", { method: "POST", body: { idToken: await idToken(outsider.email) } })).status, 403);
  const adminCookie = await login(admin.email);
  const memberCookie = await login(member.email);
  const owner = await auth.createUser({ email: "fazahomeae@gmail.com", password, displayName: "Faza Home" });
  ids.push(owner.uid);
  const ownerCookie = await login(owner.email);
  assert.equal((await request("/api/admin/users", { cookie: ownerCookie })).status, 200, "Existing owner can administer without a role claim");
  for (const change of [{ method: "DELETE", body: { uid: owner.uid } },
    ...[{ disabled: true }, { role: null }, { role: "member" }, { role: "member", disabled: false }]
      .map((patch) => ({ method: "PATCH", body: { uid: owner.uid, ...patch } }))]) {
    assert.equal((await request("/api/admin/users", { cookie: adminCookie, ...change })).status, 403, JSON.stringify(change));
    assert.equal((await auth.getUser(owner.uid)).disabled, false);
    assert.equal((await request("/api/admin/users", { cookie: ownerCookie })).status, 200);
  }
  const ownerInList = (await request("/api/admin/users", { cookie: adminCookie })).data.users.find((item) => item.uid === owner.uid);
  assert.equal(ownerInList.protected, true); assert.equal(ownerInList.role, "admin");
  console.log("PASS: protected owner sign-in, deletion/disable/demotion blocked through direct API requests");

  assert.equal((await request("/api/admin/permissions", { cookie: memberCookie })).status, 403);
  const applicant = await signup("registration");
  const application = await request("/api/auth/register", { method: "POST", body: { idToken: applicant.idToken, name: "  New Applicant  ", role: "admin", uid: owner.uid, fazaRegistration: "approved" } });
  assert.equal(application.status, 201, JSON.stringify(application.data));
  assert.equal(application.data.status, "pending"); assert.equal(application.headers.get("set-cookie"), null);
  const pendingRecord = await auth.getUser(applicant.uid);
  assert.equal(pendingRecord.displayName, "New Applicant");
  assert.equal(pendingRecord.customClaims.fazaRole, "member");
  assert.equal(pendingRecord.customClaims.fazaRegistration, "pending");
  assert.equal((await request("/api/auth/register", { method: "POST", body: { idToken: applicant.idToken, name: "Retry" } })).status, 200, "Interrupted submissions can be retried without changing membership");
  const pendingSignIn = await request("/api/auth/session", { method: "POST", body: { idToken: await idToken(applicant.email) } });
  assert.equal(pendingSignIn.status, 403); assert.match(pendingSignIn.data.error, /approval/);
  assert.equal(pendingSignIn.headers.get("set-cookie"), null);
  const pendingCookie = `faza_session=${await auth.createSessionCookie(await idToken(applicant.email), { expiresIn: 28800000 })}`;
  assert.equal((await request("/", { cookie: pendingCookie })).status, 307, "Even a valid Firebase session cannot bypass pending approval");
  for (const path of ["/api/auth/session", "/api/certificate-stamp", "/api/admin/permissions"]) {
    assert.equal((await request(path, { cookie: pendingCookie })).status, 401);
  }
  const permissionList = await request("/api/admin/permissions", { cookie: adminCookie });
  assert.ok(permissionList.data.requests.some((record) => record.uid === applicant.uid && record.name === "New Applicant" && record.email === applicant.email && record.role === "member" && record.registeredAt));
  assert.ok(!JSON.stringify(permissionList.data).includes(password));
  assert.ok(!(await request("/api/admin/users", { cookie: adminCookie })).data.users.some((record) => record.uid === applicant.uid));
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: applicant.uid, role: "admin" } })).status, 409);
  assert.equal((await request("/api/admin/permissions", { cookie: memberCookie, method: "POST", body: { uid: applicant.uid, decision: "approve" } })).status, 403);
  assert.equal((await request("/api/admin/permissions", { cookie: adminCookie, method: "POST", body: { uid: applicant.uid, decision: "approve" }, origin: "https://attacker.example" })).status, 403);
  assert.equal((await request("/api/admin/permissions", { cookie: adminCookie, method: "POST", body: { uid: owner.uid, decision: "deny" } })).status, 403);
  const approved = await request("/api/admin/permissions", { cookie: adminCookie, method: "POST", body: { uid: applicant.uid, decision: "approve", role: "admin" } });
  assert.equal(approved.status, 200, JSON.stringify(approved.data));
  assert.equal(approved.data.user.role, "member"); assert.equal(approved.data.user.registrationStatus, "approved");
  const applicantCookie = await login(applicant.email);
  assert.equal((await request("/", { cookie: applicantCookie })).status, 200);
  assert.equal((await request("/admin/", { cookie: applicantCookie })).status, 307);
  assert.equal((await request("/api/admin/permissions", { cookie: applicantCookie })).status, 403);
  assert.ok((await request("/api/admin/users", { cookie: adminCookie })).data.users.some((record) => record.uid === applicant.uid && record.role === "member"));
  assert.ok(!(await request("/api/admin/permissions", { cookie: adminCookie })).data.requests.some((record) => record.uid === applicant.uid));
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: applicant.uid, role: "admin" } })).status, 403);
  assert.equal((await request("/api/admin/permissions", { cookie: adminCookie, method: "POST", body: { uid: applicant.uid, decision: "deny" } })).status, 409);
  assert.equal((await request("/api/auth/register", { method: "POST", body: { idToken: await idToken(applicant.email), name: "Overwrite" } })).status, 409);
  console.log("PASS: registration is member-only; pending sessions blocked; admin-only approval moves account to team without granting admin access");

  const deniedApplicant = await signup("denied-registration");
  assert.equal((await request("/api/auth/register", { method: "POST", body: { idToken: deniedApplicant.idToken, name: "Denied Applicant" } })).status, 201);
  assert.equal((await request("/api/admin/permissions", { cookie: adminCookie, method: "POST", body: { uid: deniedApplicant.uid, decision: "deny" } })).status, 200);
  const deniedSignIn = await request("/api/auth/session", { method: "POST", body: { idToken: await idToken(deniedApplicant.email) } });
  assert.equal(deniedSignIn.status, 403); assert.match(deniedSignIn.data.error, /denied/);
  assert.ok(!(await request("/api/admin/users", { cookie: adminCookie })).data.users.some((record) => record.uid === deniedApplicant.uid));
  assert.equal((await request("/api/auth/register", { method: "POST", body: { idToken: await idToken(deniedApplicant.email), name: "Retry denied" } })).status, 403);
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: deniedApplicant.uid, role: "member", disabled: false } })).status, 409);
  assert.equal((await request("/api/auth/register", { method: "POST", body: { idToken: await idToken(owner.email), name: "Replace owner" } })).status, 403);
  assert.equal((await request("/api/auth/register", { method: "POST", body: { idToken: await idToken(member.email), name: "Replace member" } })).status, 409);
  console.log("PASS: denial blocks sign-in/reapplication; existing accounts and protected administrator cannot be overwritten by registration");

  assert.equal((await request("/api/pdf-download", { cookie: memberCookie })).status, 405);
  assert.equal((await request("/api/pdf-download", { cookie: memberCookie, method: "POST", origin: "https://attacker.example", body: { filename: "test.pdf" } })).status, 403);
  for (const filename of [null, "", "file.txt", "bad\r\nname.pdf", `${"x".repeat(240)}.pdf`]) {
    assert.equal((await request("/api/pdf-download", { cookie: memberCookie, method: "POST", body: { filename } })).status, 400);
  }
  for (const attachment of [undefined, "", "not-a-pdf", Buffer.from("not a PDF").toString("base64")]) {
    assert.equal((await request("/api/pdf-download", { cookie: memberCookie, method: "POST", body: { filename: "test.pdf", pdfBase64: attachment } })).status, 400);
  }
  assert.equal((await request("/api/pdf-download", { cookie: memberCookie, method: "POST", body: { filename: "test.pdf", pdfBase64: "A".repeat(4194308) } })).status, 413);
  // Run the local app without SMTP credentials: this must fail visibly and never send real mail.
  assert.equal((await request("/api/pdf-download", { cookie: memberCookie, method: "POST", body: { filename: "test.pdf", pdfBase64 } })).status, 503);
  console.log("PASS: PDF notification authentication, CSRF, filename/attachment validation, upload limits, unconfigured mail failure");
  assert.equal((await request("/", { cookie: memberCookie })).status, 200);
  assert.equal((await request("/admin/", { cookie: memberCookie })).status, 307);
  assert.equal((await request("/admin/", { cookie: adminCookie })).status, 200);
  assert.equal((await request("/api/admin/users", { cookie: memberCookie })).status, 403);
  assert.equal((await request("/api/admin/users", { cookie: memberCookie, method: "PATCH", body: { uid: member.uid, role: "admin" } })).status, 403);
  const list = await request("/api/admin/users", { cookie: adminCookie });
  assert.equal(list.status, 200); assert.ok(list.data.users.some((item) => item.uid === outsider.uid && item.role === null));
  const stamp = await request("/api/certificate-stamp", { cookie: memberCookie });
  assert.equal(stamp.status, 200); assert.ok(stamp.headers.get("content-type").includes("image/png"));
  assert.ok(stamp.headers.get("cache-control").includes("no-store"));
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: admin.uid, role: "member" } })).status, 400);
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "DELETE", body: { uid: admin.uid } })).status, 400);
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", origin: "https://attacker.example", body: { uid: member.uid, role: "admin" } })).status, 403);
  console.log("PASS: admin/member permissions, unapproved account rejection, private stamp, self-protection");

  const created = await request("/api/admin/users", { cookie: adminCookie, method: "POST", body: { name: "New test member", email: `new-${suffix}@faza-test.example`, role: "member" } });
  assert.equal(created.status, 201, JSON.stringify(created.data)); ids.push(created.data.user.uid);
  assert.equal(created.data.user.role, "member"); assert.ok(created.data.setupLink);
  const oobCode = new URL(created.data.setupLink).searchParams.get("oobCode"); assert.ok(oobCode);
  const reset = await fetch(`http://${emulator}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-key`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oobCode, newPassword: password }),
  });
  assert.equal(reset.status, 200);
  const newCookie = await login(created.data.user.email);
  assert.equal((await request("/", { cookie: newCookie })).status, 200);
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "POST", body: { name: "Duplicate", email: created.data.user.email, role: "member" } })).status, 409);
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: member.uid, role: "owner" } })).status, 400);
  await auth.setCustomUserClaims(outsider.uid, { anotherAppClaim: true });
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: outsider.uid, role: "member" } })).status, 200);
  assert.equal((await auth.getUser(outsider.uid)).customClaims.anotherAppClaim, true);
  assert.equal((await request("/", { cookie: await login(outsider.email) })).status, 200);
  console.log("PASS: member creation, real password setup link, duplicate validation, role approval, existing claims preserved");

  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: member.uid, disabled: true } })).status, 200);
  assert.equal((await request("/api/auth/session", { cookie: memberCookie })).status, 401);
  assert.equal((await request("/api/certificate-stamp", { cookie: memberCookie })).status, 401);
  assert.equal((await request("/api/pdf-download", { cookie: memberCookie, method: "POST", body: { filename: "test.pdf" } })).status, 401);
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: member.uid, disabled: false, role: "admin" } })).status, 200);
  const promotedCookie = await login(member.email);
  assert.equal((await request("/api/admin/users", { cookie: promotedCookie })).status, 200);
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "PATCH", body: { uid: member.uid, role: null } })).status, 200);
  assert.equal((await request("/api/admin/users", { cookie: promotedCookie })).status, 401);
  assert.equal((await request("/api/admin/users", { cookie: adminCookie, method: "DELETE", body: { uid: created.data.user.uid } })).status, 200);
  assert.equal((await request("/api/auth/session", { cookie: newCookie })).status, 401);
  const logout = await request("/api/auth/session", { cookie: adminCookie, method: "DELETE" });
  assert.equal(logout.status, 200); assert.ok(logout.headers.get("set-cookie").includes("Max-Age=0"));
  console.log("PASS: disable/re-enable, promotion/removal, old-session rejection, deletion and logout");
} finally {
  await Promise.all(ids.map((uid) => auth.deleteUser(uid).catch(() => {})));
}
