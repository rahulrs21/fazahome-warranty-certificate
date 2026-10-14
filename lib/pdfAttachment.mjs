// Base64 adds one third to the request size; keep uploads within serverless limits.
export const MAX_PDF_ATTACHMENT_BYTES = 3 * 1024 * 1024;
