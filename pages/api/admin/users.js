import { randomBytes } from "node:crypto";
import { getAdminAuth } from "../../../firebase/admin.mjs";
import { isProtectedAccount } from "../../../lib/protectedAccount.mjs";
import { registrationStatus } from "../../../lib/registration.mjs";
import { authError, publicUser, requireTeamApi, sendAuthError } from "../../../lib/server/teamAuth";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

export default async function handler(req, res) {
  try {
    const actor = await requireTeamApi(req, res, true);
    const auth = getAdminAuth();
    if (req.method === "GET") {
      const pageToken = typeof req.query.pageToken === "string" ? req.query.pageToken : undefined;
      const result = await auth.listUsers(100, pageToken);
      return res.json({ users: result.users.filter((record) => isProtectedAccount(record) || !["pending", "denied"].includes(registrationStatus(record))).map(publicUser), nextPageToken: result.pageToken || null });
    }
    if (req.method === "POST") {
      const { email, name, role = "member" } = req.body || {};
      if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) throw authError(400, "Enter a valid email address.");
      if (typeof name !== "string" || !name.trim() || name.length > 100) throw authError(400, "Enter a name of up to 100 characters.");
      if (!["admin", "member"].includes(role)) throw authError(400, "Choose Admin or Team member.");
      const record = await auth.createUser({ email: email.trim(), displayName: name.trim(), password: randomBytes(32).toString("base64url"), disabled: true });
      await auth.setCustomUserClaims(record.uid, { fazaRole: role });
      const user = await auth.updateUser(record.uid, { disabled: false });
      let setupLink = null;
      try { setupLink = await auth.generatePasswordResetLink(user.email); } catch { /* The member can also use Forgot password. */ }
      return res.status(201).json({ user: publicUser(user), setupLink });
    }
    if (!["PATCH", "DELETE"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST, PATCH, DELETE");
      return res.status(405).json({ error: "Method not allowed." });
    }
    const { uid, role, disabled } = req.body || {};
    if (typeof uid !== "string" || !uid || uid.length > 128) throw authError(400, "Choose a valid team account.");
    if (uid === actor.uid) throw authError(400, "Use another administrator account to change or remove your own access.");
    const record = await auth.getUser(uid);
    if (isProtectedAccount(record) && (req.method === "DELETE" || disabled === true || (role !== undefined && role !== "admin"))) {
      throw authError(403, "The protected Faza Home administrator cannot be deleted, disabled, or have admin access removed.");
    }
    if (req.method === "DELETE") {
      await auth.deleteUser(uid);
      return res.json({ success: true });
    }
    if (["pending", "denied"].includes(registrationStatus(record))) {
      throw authError(409, "Registration requests must be reviewed in the Permission section.");
    }
    if (registrationStatus(record) && role !== undefined && role !== "member") {
      throw authError(403, "Registered accounts must remain team members. Disable the account to remove access.");
    }
    if (role === undefined && disabled === undefined) throw authError(400, "Choose an account change.");
    if (role !== undefined && !["admin", "member", null].includes(role)) throw authError(400, "Choose a valid role.");
    if (disabled !== undefined && typeof disabled !== "boolean") throw authError(400, "Choose a valid account status.");
    if (role !== undefined) {
      const claims = { ...record.customClaims };
      if (role === null) delete claims.fazaRole;
      else claims.fazaRole = role;
      await auth.setCustomUserClaims(uid, claims);
    }
    if (disabled !== undefined) await auth.updateUser(uid, { disabled });
    await auth.revokeRefreshTokens(uid);
    return res.json({ user: publicUser(await auth.getUser(uid)) });
  } catch (error) {
    if (error.code === "auth/email-already-exists") return res.status(409).json({ error: "An account with this email already exists. Update its role in the list below." });
    if (error.code === "auth/user-not-found") return res.status(404).json({ error: "This account no longer exists. Refresh the team list." });
    return sendAuthError(res, error);
  }
}
