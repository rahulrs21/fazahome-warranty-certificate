import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireTeamApi, sendAuthError } from "../../lib/server/teamAuth";

export default async function handler(req, res) {
  try {
    await requireTeamApi(req, res);
    if (!["GET", "HEAD"].includes(req.method)) {
      res.setHeader("Allow", "GET, HEAD");
      return res.status(405).json({ error: "Method not allowed." });
    }
    const stamp = await readFile(join(process.cwd(), "assets", "authorised-signature-faza.png"));
    res.setHeader("Content-Type", "image/png");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return req.method === "HEAD" ? res.end() : res.send(stamp);
  } catch (error) { return sendAuthError(res, error); }
}
