import { getAdminAuth } from "../../../firebase/admin.mjs";
import { registrationStatus } from "../../../lib/registration.mjs";
import { assertSameOrigin, authError, getSessionUser, preventCaching, publicUser,
  sendAuthError, sessionCookie, SESSION_DURATION, teamRole } from "../../../lib/server/teamAuth";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

export default async function handler(req, res) {
  preventCaching(res);
  try {
    if (req.method === "GET") {
      const user = await getSessionUser(req);
      return user ? res.json({ user }) : res.status(401).json({ error: "Please sign in." });
    }
    if (!["POST", "DELETE"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST, DELETE");
      return res.status(405).json({ error: "Method not allowed." });
    }
    assertSameOrigin(req);
    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", sessionCookie("", 0));
      return res.json({ success: true });
    }
    const idToken = req.body?.idToken;
    if (typeof idToken !== "string" || !idToken || idToken.length > 12000) throw authError(400, "Please sign in again.");
    const auth = getAdminAuth();
    let token;
    try { token = await auth.verifyIdToken(idToken, true); }
    catch { throw authError(401, "Your sign-in has expired. Please sign in again."); }
    const age = Date.now() / 1000 - token.auth_time;
    if (!Number.isFinite(age) || age < -60 || age > 300) throw authError(401, "Please sign in again to start a new session.");
    const record = await auth.getUser(token.uid);
    if (!teamRole(record)) {
      if (registrationStatus(record) === "pending") throw authError(403, "Your registration is waiting for administrator approval. You can sign in after it is approved.");
      if (registrationStatus(record) === "denied") throw authError(403, "Your registration was denied. Please contact your administrator.");
      throw authError(403, "Your account does not have team access. Please contact your Faza Home administrator.");
    }
    const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION });
    res.setHeader("Set-Cookie", sessionCookie(cookie));
    return res.json({ user: publicUser(record) });
  } catch (error) { return sendAuthError(res, error); }
}
