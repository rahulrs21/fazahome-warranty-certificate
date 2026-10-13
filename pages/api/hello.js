// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { requireTeamApi, sendAuthError } from "../../lib/server/teamAuth";

export default async function handler(req, res) {
  try { await requireTeamApi(req, res); }
  catch (error) { return sendAuthError(res, error); }
  res.status(200).json({ name: "John Doe" });
}
