import nodemailer from "nodemailer";
import { PROTECTED_ADMIN_EMAIL } from "../protectedAccount.mjs";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function createDownloadNotification(user, filename, date = new Date()) {
  const name = user.name?.trim() || "Name not set on account";
  const email = user.email;
  const time = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long", timeStyle: "short", timeZone: "Asia/Dubai",
  }).format(date) + " (Dubai, UTC+4)";
  const details = [["Generated and Downloaded by", name], ["Email address", email], ["PDF file", filename], ["Download time", time]];
  return {
    to: PROTECTED_ADMIN_EMAIL,
    subject: "Faza Home | PDF download notification",
    text: `A PDF was downloaded from Faza Home.\n\n${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nThe downloaded PDF is attached to this email. Open or download the attachment to view it.\n\nThe downloader's identity comes from their signed-in team account.`,
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Faza Home PDF download</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;">A PDF has been downloaded by ${escapeHtml(name)}.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:30px 32px;background:#191747;border-bottom:4px solid #fbbf24;">
        <p style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:1px;">FAZA HOME</p>
        <p style="margin:8px 0 0;color:#cbd5e1;font-size:12px;letter-spacing:1px;">WARRANTY CERTIFICATES</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <span style="display:inline-block;padding:7px 12px;background:#eff6ff;border-radius:20px;color:#2563eb;font-size:12px;font-weight:bold;">PDF DOWNLOAD</span>
        <h1 style="margin:20px 0 12px;font-size:26px;line-height:34px;">A new PDF has been downloaded</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#64748b;">A team member downloaded a document from Faza Home. Their details are below.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;table-layout:fixed;">
          ${details.map(([label, value]) => `<tr><td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;"><p style="margin:0 0 6px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#64748b;">${label}</p><p style="margin:0;font-size:15px;line-height:22px;font-weight:bold;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(value)}</p></td></tr>`).join("")}
        </table>
        <div style="margin:24px 0 0;padding:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#1d4ed8;">Your PDF is attached</p>
          <p style="margin:0;color:#475569;font-size:13px;line-height:21px;">Open or download <strong>${escapeHtml(filename)}</strong> from the attachments below this email to view the document.</p>
        </div>
        <p style="margin:22px 0 0;color:#64748b;font-size:12px;line-height:20px;">The downloader's identity comes from their signed-in team account.</p>
      </td></tr>
      <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;line-height:18px;">FAZA BUILDING MATERIALS TRADING LLC<br>Automatic notification &bull; Faza Home</td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  };
}

export async function sendDownloadNotification(user, filename, pdf) {
  if (!Buffer.isBuffer(pdf) || !pdf.length) {
    throw Object.assign(new Error("PDF attachment is missing."), { code: "email/attachment-missing" });
  }
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
  const port = Number(process.env.SMTP_PORT || 465);
  const from = process.env.SMTP_FROM || SMTP_USER;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw Object.assign(new Error("PDF download email is not configured."), { code: "email/not-configured" });
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  const result = await transport.sendMail({
    ...createDownloadNotification(user, filename),
    from: { name: "Faza Home Notifications", address: from },
    attachments: [{ filename, content: pdf, contentType: "application/pdf", contentDisposition: "attachment" }],
  });
  if (!result.accepted?.some((address) => address.toLowerCase() === PROTECTED_ADMIN_EMAIL)) {
    throw Object.assign(new Error("Notification recipient was not accepted."), { code: "email/rejected" });
  }
}
