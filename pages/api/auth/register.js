import { getAdminAuth } from "../../../firebase/admin.mjs";
import { isProtectedAccount } from "../../../lib/protectedAccount.mjs";
import { registrationStatus } from "../../../lib/registration.mjs";
import { assertSameOrigin, authError, preventCaching, sendAuthError } from "../../../lib/server/teamAuth";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

export default async function handler(req, res) {
  preventCaching(res);
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed." });
    }
    assertSameOrigin(req);
    const { idToken, name } = req.body || {};
    if (typeof name !== "string" || !name.trim() || name.length > 100) throw authError(400, "Enter your name using up to 100 characters.");
    if (typeof idToken !== "string" || !idToken || idToken.length > 12000) throw authError(400, "Please register again.");
    const auth = getAdminAuth();
    let token;
    try { token = await auth.verifyIdToken(idToken, true); }
    catch { throw authError(401, "Please register again to submit your request."); }
    const age = Date.now() / 1000 - token.auth_time;
    if (!Number.isFinite(age) || age < -60 || age > 300 || token.firebase?.sign_in_provider !== "password") {
      throw authError(401, "Please register again to submit your request.");
    }
    const record = await auth.getUser(token.uid);
    if (isProtectedAccount(record)) throw authError(403, "This email belongs to the protected administrator. Please sign in.");
    const status = registrationStatus(record);
    if (status === "denied") throw authError(403, "Your registration was denied. Please contact your administrator.");
    if (status === "approved" || (!status && record.customClaims?.fazaRole !== undefined)) {
      throw authError(409, "This account already has team access assigned. Please sign in.");
    }
    if (status === "pending") return res.json({ success: true, status: "pending" });
    const createdAge = Date.now() - new Date(record.metadata.creationTime).getTime();
    if (!record.email || record.disabled || !Number.isFinite(createdAge) || createdAge < -60000 || createdAge > 300000) {
      throw authError(409, "This account already exists. Please sign in or contact your administrator.");
    }
    // Firebase creates the password account in the browser. Only the server can assign access.
    await auth.updateUser(record.uid, { displayName: name.trim() });
    await auth.setCustomUserClaims(record.uid, { ...record.customClaims, fazaRole: "member", fazaRegistration: "pending" });
    // Registration never creates an app session, even if the caller supplies a role or UID.
    return res.status(201).json({ success: true, status: "pending" });
  } catch (error) { return sendAuthError(res, error); }
}
