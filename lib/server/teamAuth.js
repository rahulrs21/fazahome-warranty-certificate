import { getAdminAuth } from "../../firebase/admin.mjs";
import { isProtectedAccount } from "../protectedAccount.mjs";
import { registrationStatus } from "../registration.mjs";

export const SESSION_COOKIE = "faza_session";
export const SESSION_DURATION = 8 * 60 * 60 * 1000;
const ROLES = new Set(["admin", "member"]);

export function authError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function teamRole(record) {
  if (isProtectedAccount(record) && !record.disabled) return "admin";
  const registration = registrationStatus(record);
  if (registration) {
    return !record.disabled && registration === "approved" && record.customClaims?.fazaRole === "member" ? "member" : null;
  }
  const role = record.customClaims?.fazaRole;
  return !record.disabled && ROLES.has(role) ? role : null;
}

export function publicUser(record) {
  return { uid: record.uid, email: record.email || "", name: record.displayName || "",
    role: isProtectedAccount(record) ? "admin" : registrationStatus(record) ? "member" : ROLES.has(record.customClaims?.fazaRole) ? record.customClaims.fazaRole : null,
    disabled: Boolean(record.disabled), protected: isProtectedAccount(record), registrationStatus: registrationStatus(record),
    registeredAt: record.metadata?.creationTime || null };
}

export function sessionCookie(value, expires = SESSION_DURATION) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(expires / 1000)}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function assertSameOrigin(req) {
  try {
    const origin = new URL(req.headers.origin);
    if (origin.host === req.headers.host && ["http:", "https:"].includes(origin.protocol) &&
      (!req.headers["sec-fetch-site"] || req.headers["sec-fetch-site"] === "same-origin")) return;
  } catch { /* Missing and malformed origins are rejected. */ }
  throw authError(403, "This request must come from the Faza Home website.");
}

export function preventCaching(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
}

export async function getSessionUser(req) {
  const cookie = req.cookies?.[SESSION_COOKIE];
  if (!cookie) return null;
  try {
    const auth = getAdminAuth();
    const token = await auth.verifySessionCookie(cookie, true);
    // Read current membership on every request: role removal/disable takes effect immediately.
    const record = await auth.getUser(token.uid);
    return teamRole(record) ? publicUser(record) : null;
  } catch (error) {
    if (error.status === 503) throw error;
    if (String(error.code).startsWith("auth/")) return null;
    throw authError(503, "Sign-in is temporarily unavailable. Please try again later.");
  }
}

export async function requireTeamApi(req, res, adminOnly = false) {
  preventCaching(res);
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) assertSameOrigin(req);
  const user = await getSessionUser(req);
  if (!user) throw authError(401, "Please sign in with an approved team account.");
  if (adminOnly && user.role !== "admin") throw authError(403, "Only administrators can manage team accounts.");
  return user;
}

export function sendAuthError(res, error) {
  const status = error.status || 500;
  if (status >= 500) console.error("Team authentication request failed:", error.code || error.status || "server-error");
  res.status(status).json({ error: status >= 500 && status !== 503
    ? "The request could not be completed. Please try again." : error.message });
}

export async function getTeamPageProps(context, adminOnly = false) {
  preventCaching(context.res);
  let user;
  try { user = await getSessionUser(context.req); } catch { user = null; }
  if (!user) {
    context.res.setHeader("Set-Cookie", sessionCookie("", 0));
    return { redirect: { destination: `/login/?next=${adminOnly ? "%2Fadmin%2F" : "%2F"}`, permanent: false } };
  }
  if (adminOnly && user.role !== "admin") return { redirect: { destination: "/", permanent: false } };
  return { props: { user } };
}
