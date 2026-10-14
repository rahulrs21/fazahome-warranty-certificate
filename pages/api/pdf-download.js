import { requireTeamApi, sendAuthError } from "../../lib/server/teamAuth";
import { sendDownloadNotification } from "../../lib/server/downloadNotification.mjs";
import { decodePdfAttachment } from "../../lib/server/pdfAttachment.mjs";

export const config = { api: { bodyParser: { sizeLimit: "4300kb" } } };

export default async function handler(req, res) {
  try {
    const user = await requireTeamApi(req, res);
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed." });
    }
    const filename = req.body?.filename;
    if (typeof filename !== "string" || !filename.trim() || filename.length > 240 ||
      /[\x00-\x1f\x7f]/.test(filename) || !filename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ error: "Provide a valid PDF filename of up to 240 characters." });
    }
    const pdf = decodePdfAttachment(req.body?.pdfBase64);
    try {
      // Never accept downloader identity or notification recipients from the browser.
      await sendDownloadNotification(user, filename.trim(), pdf);
    } catch (error) {
      console.error("PDF download notification failed:", error.code || "email/send-failed");
      return res.status(503).json({ error: "The PDF was downloaded, but the email notification could not be sent. Please contact your administrator." });
    }
    return res.json({ success: true });
  } catch (error) { return sendAuthError(res, error); }
}
