import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createPrivateKey } from "node:crypto";
import { existsSync } from "node:fs";

export function normalizePrivateKey(value) {
  let key = String(value || "").trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    try { key = JSON.parse(key); }
    catch { key = key.slice(1, -1); }
  } else if (key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}

export function getAdminSetupStatus() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator) {
    const ready = Boolean(projectId?.startsWith("demo-") && /^(127\.0\.0\.1|localhost):\d+$/.test(emulator));
    return { ready, issues: ready ? [] : ["Emulator settings must use a local demo project."] };
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL && !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    const ready = existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    return { ready, issues: ready ? [] : ["GOOGLE_APPLICATION_CREDENTIALS points to a file that cannot be found."] };
  }
  const issues = [];
  if (!projectId) issues.push("Add FIREBASE_ADMIN_PROJECT_ID using project_id from your service-account JSON.");
  if (process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_PROJECT_ID !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    issues.push("The server and browser Firebase project IDs must match.");
  }
  if (!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "")) {
    issues.push("Replace FIREBASE_ADMIN_CLIENT_EMAIL with client_email from your service-account JSON.");
  }
  try {
    const key = createPrivateKey(normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY));
    if (key.asymmetricKeyType !== "rsa") throw new Error("Unsupported key type");
  } catch {
    issues.push("Replace FIREBASE_ADMIN_PRIVATE_KEY with the complete private_key from your service-account JSON, including BEGIN/END lines and line breaks.");
  }
  return { ready: issues.length === 0, issues };
}

export function isAdminConfigured() { return getAdminSetupStatus().ready; }

export function getAdminAuth() {
  const name = "faza-team-auth";
  let app = getApps().find((item) => item.name === name);
  if (!app) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    if (emulator && (!projectId?.startsWith("demo-") || !/^(127\.0\.0\.1|localhost):\d+$/.test(emulator))) {
      const error = new Error("Authentication emulator settings are only allowed for a local demo project.");
      error.status = 503;
      throw error;
    }
    if (!isAdminConfigured() && !emulator) {
      const error = new Error("Sign-in is being set up. Please contact your administrator.");
      error.status = 503;
      throw error;
    }
    const credential = emulator ? undefined : process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL
      ? cert({ projectId, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY) })
      : applicationDefault();
    app = initializeApp({ projectId, ...(credential ? { credential } : {}) }, name);
  }
  return getAuth(app);
}
