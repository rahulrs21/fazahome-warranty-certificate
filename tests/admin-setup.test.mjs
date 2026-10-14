import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { getAdminSetupStatus, getAdminAuth, normalizePrivateKey } from "../firebase/admin.mjs";

const keys = ["FIREBASE_ADMIN_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_AUTH_EMULATOR_HOST"];
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const privateKey = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } }).privateKey;

function configure(values = {}) {
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, values);
}

test("login readiness rejects missing, placeholder, malformed and mismatched credentials", () => {
  try {
    configure(); assert.equal(getAdminSetupStatus().ready, false);
    assert.equal(getAdminSetupStatus().issues.length, 3);
    configure({ FIREBASE_ADMIN_PROJECT_ID: "faza-test", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "faza-test", FIREBASE_ADMIN_CLIENT_EMAIL: "the-client_email-from-your-json", FIREBASE_ADMIN_PRIVATE_KEY: "the-private_key-from-your-json" });
    const placeholder = getAdminSetupStatus();
    assert.equal(placeholder.ready, false); assert.equal(placeholder.issues.length, 2);
    assert.ok(placeholder.issues.every((issue) => !issue.includes("the-client_email") && !issue.includes("the-private_key")), "Diagnostics must never echo credential values");
    assert.throws(() => getAdminAuth(), { status: 503 });
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "test@faza-test.iam.gserviceaccount.com";
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = privateKey;
    assert.equal(getAdminSetupStatus().ready, true);
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");
    assert.equal(getAdminSetupStatus().ready, true, "JSON-escaped line breaks are accepted");
    for (const pasted of [JSON.stringify(privateKey), `"${privateKey}"`, `'${privateKey.replace(/\n/g, "\\n")}'`, privateKey.replace(/\n/g, "\r\n"), privateKey.replace(/\n/g, "\\r\\n")]) {
      process.env.FIREBASE_ADMIN_PRIVATE_KEY = pasted;
      assert.equal(getAdminSetupStatus().ready, true, "Vercel-pasted quoting and line breaks are accepted");
      assert.equal(normalizePrivateKey(pasted), privateKey.trim());
    }
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "another-project";
    assert.equal(getAdminSetupStatus().ready, false, "Different client/server projects cannot sign in");
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "faza-test";
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nbroken\n-----END PRIVATE KEY-----";
    assert.equal(getAdminSetupStatus().ready, false);
    configure({ GOOGLE_APPLICATION_CREDENTIALS: "this-credential-file-does-not-exist.json" });
    assert.equal(getAdminSetupStatus().ready, false);
    configure({ FIREBASE_ADMIN_PROJECT_ID: "demo-faza-test", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIREBASE_ADMIN_PRIVATE_KEY: "invalid live credentials must be ignored in demo mode" });
    assert.equal(getAdminSetupStatus().ready, true);
    process.env.FIREBASE_ADMIN_PROJECT_ID = "real-project";
    assert.equal(getAdminSetupStatus().ready, false, "Emulators cannot enable login for real projects");
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
