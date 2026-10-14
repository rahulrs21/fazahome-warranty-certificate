import assert from "node:assert/strict";
import { test } from "node:test";
import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import { createDownloadNotification, sendDownloadNotification } from "../lib/server/downloadNotification.mjs";
import { isProtectedAccount, PROTECTED_ADMIN_EMAIL } from "../lib/protectedAccount.mjs";
import { notifyPdfDownload } from "../lib/notifyPdfDownload.mjs";
import { decodePdfAttachment } from "../lib/server/pdfAttachment.mjs";
import { MAX_PDF_ATTACHMENT_BYTES } from "../lib/pdfAttachment.mjs";

const sampleDocument = new jsPDF();
sampleDocument.text("Faza Home attachment test", 20, 20);
const samplePdf = Buffer.from(sampleDocument.output("arraybuffer"));

test("PDF uploads preserve bytes and reject missing, malformed, oversized or non-PDF content", () => {
  assert.deepEqual(decodePdfAttachment(samplePdf.toString("base64")), samplePdf);
  const invalidHeader = Buffer.from(samplePdf);
  invalidHeader[0] |= 128;
  assert.throws(() => decodePdfAttachment(invalidHeader.toString("base64")), { status: 400 });
  for (const value of [null, {}, "", "https://example.com/file.pdf", "!not-base64!", "SGVsbG8=", Buffer.from("%PDF-1.7\ntruncated").toString("base64")]) {
    assert.throws(() => decodePdfAttachment(value), { status: 400 });
  }
  assert.throws(() => decodePdfAttachment("A".repeat(4 * Math.ceil(MAX_PDF_ATTACHMENT_BYTES / 3) + 4)), { status: 413 });
});

test("protected account matching ignores email case and whitespace", () => {
  assert.equal(isProtectedAccount({ email: " FAZAHOMEAE@GMAIL.COM " }), true);
  for (const record of [null, {}, { email: "another@gmail.com" }, { email: "fazahomeae@gmail.com.attacker.example" }]) {
    assert.equal(isProtectedAccount(record), false);
  }
});

test("email identifies the downloader, escapes HTML and formats Dubai time", () => {
  const mail = createDownloadNotification({ name: 'Ali <script> & "Team"', email: "ali@example.com" },
    "Warranty-<test>.pdf", new Date("2026-10-14T12:30:00Z"));
  assert.equal(mail.to, PROTECTED_ADMIN_EMAIL);
  assert.ok(mail.html.includes("Ali &lt;script&gt; &amp; &quot;Team&quot;"));
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("Warranty-&lt;test&gt;.pdf"));
  assert.ok(mail.html.includes("ali@example.com"));
  assert.ok(mail.text.includes('Downloaded by: Ali <script> & "Team"'));
  assert.ok(mail.text.includes("16:30 (Dubai, UTC+4)"));
  assert.ok(createDownloadNotification({ name: "", email: "ali@example.com" }, "test.pdf").text.includes("Name not set on account"));
});

test("SMTP sends the designed message only to the owner and handles configuration/rejection", async () => {
  const keys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const original = nodemailer.createTransport;
  const user = { name: "Test Team Member", email: "member@example.com" };
  try {
    for (const key of keys) delete process.env[key];
    await assert.rejects(sendDownloadNotification(user, "test.pdf", samplePdf), { code: "email/not-configured" });
    Object.assign(process.env, { SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "sender@example.com", SMTP_PASSWORD: "test-only-password" });
    let message;
    nodemailer.createTransport = (options) => {
      assert.equal(options.requireTLS, true); assert.equal(options.secure, false);
      assert.deepEqual(options.auth, { user: "sender@example.com", pass: "test-only-password" });
      return { async sendMail(mail) {
        assert.equal(mail.to, PROTECTED_ADMIN_EMAIL);
        assert.equal(mail.from.address, "sender@example.com");
        assert.equal(mail.attachments.length, 1);
        assert.equal(mail.attachments[0].filename, "test.pdf");
        assert.equal(mail.attachments[0].contentType, "application/pdf");
        assert.deepEqual(mail.attachments[0].content, samplePdf);
        // Render the real MIME message locally without opening a connection or sending mail.
        const result = await original({ streamTransport: true, buffer: true }).sendMail(mail);
        assert.deepEqual(result.envelope.to, [PROTECTED_ADMIN_EMAIL]);
        message = result.message.toString();
        return { accepted: [PROTECTED_ADMIN_EMAIL] };
      } };
    };
    await sendDownloadNotification(user, "test.pdf", samplePdf);
    assert.ok(message.includes("multipart/mixed"));
    assert.ok(message.includes("multipart/alternative"));
    assert.ok(message.includes("member@example.com"));
    assert.ok(message.includes("Test Team Member"));
    assert.ok(message.includes("Content-Disposition: attachment; filename=test.pdf"));
    const attachmentPart = message.split("Content-Type: application/pdf")[1];
    const attachmentBody = attachmentPart.split("\r\n\r\n")[1].split("\r\n--")[0];
    assert.deepEqual(Buffer.from(attachmentBody.replace(/\r\n/g, ""), "base64"), samplePdf, "Email attachment must contain the original downloaded PDF bytes");
    nodemailer.createTransport = () => ({ async sendMail() { return { accepted: [] }; } });
    await assert.rejects(sendDownloadNotification(user, "test.pdf", samplePdf), { code: "email/rejected" });
    nodemailer.createTransport = () => ({ async sendMail() { throw Object.assign(new Error("SMTP unavailable"), { code: "ECONNECTION" }); } });
    await assert.rejects(sendDownloadNotification(user, "test.pdf", samplePdf), { code: "ECONNECTION" });
    await assert.rejects(sendDownloadNotification(user, "test.pdf"), { code: "email/attachment-missing" });
  } finally {
    nodemailer.createTransport = original;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  }
});

test("browser notification uploads PDF bytes without identity fields and preserves completed downloads on failure", async () => {
  const original = globalThis.fetch;
  const pdfBlob = new Blob([samplePdf], { type: "application/pdf" });
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "/api/pdf-download/"); assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { filename: "test.pdf", pdfBase64: samplePdf.toString("base64") });
      return { ok: true };
    };
    assert.equal(await notifyPdfDownload("test.pdf", pdfBlob), true);
    globalThis.fetch = async () => ({ ok: false });
    assert.equal(await notifyPdfDownload("test.pdf", pdfBlob), false);
    globalThis.fetch = async () => { throw new Error("Offline"); };
    assert.equal(await notifyPdfDownload("test.pdf", pdfBlob), false);
    globalThis.fetch = async () => { assert.fail("Missing or oversized attachments must not be uploaded"); };
    assert.equal(await notifyPdfDownload("test.pdf"), false);
    assert.equal(await notifyPdfDownload("test.pdf", new Blob([])), false);
    assert.equal(await notifyPdfDownload("test.pdf", new Blob([new Uint8Array(MAX_PDF_ATTACHMENT_BYTES + 1)])), false);
  } finally { globalThis.fetch = original; }
});

test("browser upload preserves binary PDF content across encoding chunks", async () => {
  const original = globalThis.fetch;
  const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.from(Array.from({ length: 70000 }, (_, index) => index % 256)), Buffer.from("\n%%EOF\n")]);
  try {
    globalThis.fetch = async (_url, options) => {
      assert.deepEqual(decodePdfAttachment(JSON.parse(options.body).pdfBase64), pdf);
      return { ok: true };
    };
    assert.equal(await notifyPdfDownload("binary.pdf", new Blob([pdf])), true);
  } finally { globalThis.fetch = original; }
});
