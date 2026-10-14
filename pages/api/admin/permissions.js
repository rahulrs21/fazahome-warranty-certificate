import { getAdminAuth } from "../../../firebase/admin.mjs";
import { isProtectedAccount } from "../../../lib/protectedAccount.mjs";
import { registrationStatus } from "../../../lib/registration.mjs";
import { authError, publicUser, requireTeamApi, sendAuthError } from "../../../lib/server/teamAuth";

export const config = { api: { bodyParser: { sizeLimit: "4kb" } } };

export default async function handler(req, res) {
  try {
    await requireTeamApi(req, res, true);
    const auth = getAdminAuth();
    if (req.method === "GET") {
      let pageToken = typeof req.query.pageToken === "string" ? req.query.pageToken : undefined;
      let requests;
      do {
        const result = await auth.listUsers(100, pageToken);
        requests = result.users.filter((record) => !isProtectedAccount(record) && registrationStatus(record) === "pending").map(publicUser);
        pageToken = result.pageToken;
      } while (!requests.length && pageToken);
      return res.json({ requests, nextPageToken: pageToken || null });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed." });
    }
    const { uid, decision } = req.body || {};
    if (typeof uid !== "string" || !uid || uid.length > 128) throw authError(400, "Choose a valid registration request.");
    if (!["approve", "deny"].includes(decision)) throw authError(400, "Choose Approve or Deny.");
    const record = await auth.getUser(uid);
    if (isProtectedAccount(record)) throw authError(403, "The protected administrator cannot be changed here.");
    if (registrationStatus(record) !== "pending") throw authError(409, "This request has already been reviewed. Refresh the Permission section.");
    if (record.disabled) throw authError(409, "This account is disabled. Contact your administrator.");
    await auth.setCustomUserClaims(uid, {
      ...record.customClaims, fazaRole: "member", fazaRegistration: decision === "approve" ? "approved" : "denied",
    });
    await auth.revokeRefreshTokens(uid);
    return res.json({ user: publicUser(await auth.getUser(uid)), decision });
  } catch (error) {
    if (error.code === "auth/user-not-found") return res.status(404).json({ error: "This registration no longer exists. Refresh the Permission section." });
    return sendAuthError(res, error);
  }
}
