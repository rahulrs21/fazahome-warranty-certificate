import nextEnv from "@next/env";
import { getAdminAuth, getAdminSetupStatus } from "../firebase/admin.mjs";

nextEnv.loadEnvConfig(process.cwd());
const uid = process.argv[2];
if (!uid || process.argv.length !== 3) {
  console.error("Usage: npm run auth:make-admin -- FIREBASE_USER_UID");
  process.exit(1);
}
try {
  const setup = getAdminSetupStatus();
  if (!setup.ready) {
    console.error("Complete the Firebase server setup first:");
    for (const issue of setup.issues) console.error(`- ${issue}`);
    process.exit(1);
  }
  const auth = getAdminAuth();
  const user = await auth.getUser(uid);
  if (!user.email || user.disabled) throw new Error("Choose an enabled Firebase account with an email address.");
  await auth.setCustomUserClaims(uid, { ...user.customClaims, fazaRole: "admin" });
  await auth.revokeRefreshTokens(uid);
  console.log(`Admin access assigned to ${user.email}. Sign in again to use it.`);
} catch (error) {
  console.error(error.status === 503 ? error.message : "Could not assign admin access. Check the UID and server credentials.");
  process.exitCode = 1;
}
