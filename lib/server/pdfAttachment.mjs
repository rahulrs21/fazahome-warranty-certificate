import { MAX_PDF_ATTACHMENT_BYTES } from "../pdfAttachment.mjs";

export function decodePdfAttachment(value) {
  const invalid = () => Object.assign(new Error("Provide the downloaded PDF file."), { status: 400 });
  if (typeof value !== "string" || !value) throw invalid();
  if (value.length > 4 * Math.ceil(MAX_PDF_ATTACHMENT_BYTES / 3)) {
    throw Object.assign(new Error("The PDF attachment must be 3 MiB or smaller."), { status: 413 });
  }
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw invalid();
  const pdf = Buffer.from(value, "base64");
  if (pdf.toString("base64") !== value || pdf.subarray(0, 5).toString("latin1") !== "%PDF-" ||
    !/%%EOF\s*$/.test(pdf.subarray(-1024).toString("latin1"))) throw invalid();
  return pdf;
}
