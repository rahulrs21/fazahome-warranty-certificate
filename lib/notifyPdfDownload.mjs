import { MAX_PDF_ATTACHMENT_BYTES } from "./pdfAttachment.mjs";

export const DOWNLOAD_NOTIFICATION_WARNING = "Your PDF has been downloaded, but the email notification could not be sent. Please contact your administrator.";

// A mail failure must not misreport a completed download as a PDF generation failure.
export async function notifyPdfDownload(filename, pdfBlob) {
  try {
    if (!pdfBlob || !pdfBlob.size || pdfBlob.size > MAX_PDF_ATTACHMENT_BYTES) return false;
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    const response = await fetch("/api/pdf-download/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, pdfBase64: btoa(binary) }),
      signal: AbortSignal.timeout(30000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

