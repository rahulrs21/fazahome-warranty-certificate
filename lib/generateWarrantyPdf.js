import {
  CERTIFICATE_COMPANY, CERTIFICATE_CONTACT, CERTIFICATE_SIGNATORY, CERTIFICATE_LAYOUT, certificateStatement,
  certificateWarrantyContent, normalizeWarrantyProducts,
} from "./warrantyCertificate";

const INK = "#30343B";
const MUTED = "#64748B";
const NAVY = "#191747";
const BORDER = "#D5DAE4";
let imagePromise;

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function formatPurchaseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) throw new Error("Purchase date must be a valid YYYY-MM-DD date.");
  const [, year, month, day] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  if (Number(year) < 1 || date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    throw new Error("Purchase date is invalid.");
  }
  return `${day}/${month}/${year}`;
}

function filenamePart(value) {
  return String(value).trim().replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 80) || "record";
}

function loadBranding() {
  if (!imagePromise) {
    imagePromise = Promise.all(["/Faza-Home-Logo.png", "/Footer-Logos.jpg", "/api/certificate-stamp"].map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Could not load certificate branding. Please try again.");
      return new Uint8Array(await response.arrayBuffer());
    })).catch((error) => { imagePromise = undefined; throw error; });
  }
  return imagePromise;
}

/** Measure, fit and download a single A4 certificate. Never create a second page. */
export async function generateWarrantyPdf({
  template, invoiceNumber, purchaseDate, clientName, contactNumber, serialNumber, products,
}) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Warranty PDF downloads are only available in the browser.");
  }
  if (!template || !Array.isArray(template.terms)) throw new Error("Select a valid warranty template.");
  const invoice = requiredText(invoiceNumber, "Invoice number");
  const date = formatPurchaseDate(purchaseDate);
  const client = requiredText(clientName, "Client name");
  const contact = requiredText(contactNumber, "Contact number");
  const serial = String(serialNumber ?? "").trim();
  const items = normalizeWarrantyProducts(products, template);
  const warranty = certificateWarrantyContent(template, items);
  const [{ jsPDF }, [logo, footerLogos, signature]] = await Promise.all([import("jspdf"), loadBranding()]);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", putOnlyUsedFonts: true, compress: true });
  pdf.setProperties({
    title: `${template.brand} - Warranty Certificate - ${invoice}`,
    subject: "Faza Home purchase and warranty record",
    author: "Faza Home",
    creator: "Faza Home Warranty Certificate Generator",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const width = pageWidth - margin * 2;
  const start = 45;
  const bottom = pageHeight - 30;
  const productWidth = width - 24;
  const supportWidth = (width - CERTIFICATE_LAYOUT.supportGap) / 2;
  const signatureProperties = pdf.getImageProperties(signature);

  function font(size, weight = "normal", color = INK) {
    pdf.setFont("helvetica", weight);
    pdf.setFontSize(size);
    pdf.setTextColor(color);
  }

  function wrap(value, size, textWidth, weight = "normal") {
    font(size, weight);
    return pdf.splitTextToSize(String(value), textWidth);
  }

  function text(lines, x, y, size, lineHeight, { weight = "normal", color = INK, align = "left" } = {}) {
    font(size, weight, color);
    pdf.text(lines, x, y, {
      baseline: "top", align, lineHeightFactor: lineHeight / (size * 25.4 / 72),
    });
  }

  function measure(density) {
    const size = 9.5 - density * 0.375;
    const termSize = 8.5 - density * 0.25;
    const line = size * 0.43;
    const termLine = termSize * 0.44;
    const gap = 4 - density * 0.375;
    const productGap = CERTIFICATE_LAYOUT.productGap - density * 0.5;
    const padding = 2 - density * 0.35;
    const half = (width - 5) / 2;
    const recordSpecs = [
      [{ label: "INVOICE NO.", value: invoice, x: margin, width: half },
        { label: "PURCHASE DATE", value: date, x: margin + half + 5, width: half, labelWidth: CERTIFICATE_LAYOUT.purchaseDateLabelWidth }],
      [{ label: "CLIENT", value: client, x: margin, width }],
      serial
        ? [{ label: "PHONE", value: contact, x: margin, width: half },
          { label: "SERIAL NO.", value: serial, x: margin + half + 5, width: half }]
        : [{ label: "PHONE", value: contact, x: margin, width }],
    ];
    const records = recordSpecs.map((cells) => {
      const measured = cells.map((cell) => ({
        ...cell, labelWidth: cell.labelWidth ?? CERTIFICATE_LAYOUT.labelWidth,
        lines: wrap(cell.value, size, cell.width - (cell.labelWidth ?? CERTIFICATE_LAYOUT.labelWidth) - 6, "bold"),
      }));
      return { cells: measured, height: Math.max(...measured.map((cell) => cell.lines.length)) * line + 3 };
    });
    const intro = wrap(certificateStatement(template), size, width);
    const rows = items.map((item) => {
      const lines = wrap(item.name, size, productWidth - 6);
      return { ...item, lines, height: lines.length * line + padding * 2 };
    });
    const guidance = wrap(warranty.guidance, termSize, supportWidth);
    const signatureWidth = CERTIFICATE_LAYOUT.stampWidth - density * CERTIFICATE_LAYOUT.stampDensityStep;
    const signatureHeight = signatureWidth * signatureProperties.height / signatureProperties.width;
    const company = CERTIFICATE_SIGNATORY;
    const companyHeight = CERTIFICATE_LAYOUT.companyLineHeight;
    const supportHeight = Math.max(guidance.length * termLine + 5, companyHeight + signatureHeight + 11);
    const terms = warranty.terms.map((term) => wrap(term, termSize, width - 7));
    const end = start + records.reduce((total, row) => total + row.height + 1, 0) + gap
      + intro.length * line + 3 + 3.5 + gap
      + 5.5 + 6.5 + rows.reduce((total, row) => total + row.height, 0) + productGap
      + supportHeight + gap + 5.5
      + terms.reduce((total, lines) => total + lines.length * termLine + 2, 0);
    return { size, termSize, line, termLine, gap, productGap, padding, records, intro, rows,
      guidance, signatureWidth, signatureHeight, company, companyHeight, supportHeight, terms, end };
  }

  // Try progressively tighter spacing and readable typography before rendering.
  let layout;
  for (let density = 0; density <= 4; density += 1) {
    const candidate = measure(density);
    if (candidate.end <= bottom) { layout = candidate; break; }
  }
  if (!layout) {
    throw new Error("This certificate contains too much text to fit legibly on one A4 page. Shorten the product descriptions or include fewer products, then download again.");
  }
  const { size, termSize, line, termLine, gap, productGap, padding } = layout;

  pdf.addImage(logo, "PNG", 10, 9, 51, 10.6, "faza-logo");
  font(9, "bold");
  pdf.text(CERTIFICATE_COMPANY, pageWidth - 10, 16, { align: "right" });
  font(7.5, "normal", MUTED);
  pdf.textWithLink("fazahome.ae", pageWidth - 10 - pdf.getTextWidth("fazahome.ae"), 22, { url: "https://fazahome.ae" });
  font(19, "bold", NAVY);
  pdf.text("Warranty Certificate", pageWidth / 2, 35, { align: "center" });
  pdf.setDrawColor(BORDER);
  pdf.setLineWidth(0.25);
  pdf.line(margin, 39, pageWidth - margin, 39);
  pdf.saveGraphicsState();
  pdf.setGState(new pdf.GState({ opacity: 0.035 }));
  pdf.addImage(logo, "PNG", 30, 136, 150, 31.3, "faza-logo");
  pdf.restoreGraphicsState();

  let y = start;
  for (const record of layout.records) {
    for (const cell of record.cells) {
      pdf.setFillColor("#F5F6FA");
      pdf.roundedRect(cell.x, y, cell.width, record.height, 1, 1, "F");
      text(`${cell.label}:`, cell.x + 3, y + 1.5, size, line, { weight: "bold", color: NAVY });
      text(cell.lines, cell.x + cell.labelWidth + 3, y + 1.5, size, line, { weight: "bold" });
    }
    y += record.height + 1;
  }
  y += gap;
  text(layout.intro, margin, y, size, line);
  y += layout.intro.length * line + 3;
  text(`${template.brand} | ${template.category}`, margin, y, 7.5, 3.5, { color: MUTED });
  y += 3.5 + gap;

  text("PRODUCT DETAILS", margin, y, 9, 4, { weight: "bold" });
  y += 5.5;
  pdf.setFillColor(NAVY);
  pdf.rect(margin, y, width, 6.5, "F");
  text("Product name", margin + 3, y + 1.6, 8.5, 4, { weight: "bold", color: "#FFFFFF" });
  text("QTY", pageWidth - margin - 12, y + 1.6, 8.5, 4, { weight: "bold", color: "#FFFFFF", align: "center" });
  y += 6.5;
  layout.rows.forEach((row, index) => {
    if (index % 2 === 0) { pdf.setFillColor("#FAFBFD"); pdf.rect(margin, y, width, row.height, "F"); }
    pdf.setDrawColor(BORDER);
    pdf.setLineWidth(0.2);
    pdf.rect(margin, y, width, row.height);
    pdf.line(margin + productWidth, y, margin + productWidth, y + row.height);
    text(row.lines, margin + 3, y + padding, size, line);
    font(size, "bold");
    const quantity = String(row.quantity);
    const quantitySize = size * 18 / Math.max(18, pdf.getTextWidth(quantity));
    text(quantity, pageWidth - margin - 12, y + padding, quantitySize, line, { weight: "bold", align: "center" });
    y += row.height;
  });
  y += productGap;

  text("PRODUCT GUIDANCE", margin, y, 8, 4, { weight: "bold" });
  text(layout.guidance, margin, y + 5, termSize, termLine, { color: MUTED });
  const right = pageWidth - margin;
  text(layout.company, right, y, CERTIFICATE_LAYOUT.companyFontSize, CERTIFICATE_LAYOUT.companyLineHeight, { weight: "bold", align: "right" });
  const signatureY = y + layout.companyHeight + 2;
  pdf.addImage(signature, "PNG", right - layout.signatureWidth, signatureY,
    layout.signatureWidth, layout.signatureHeight, "faza-signature");
  const signatureBottom = signatureY + layout.signatureHeight;
  pdf.setDrawColor(BORDER);
  pdf.line(right - 43, signatureBottom + 1.5, right, signatureBottom + 1.5);
  text("AUTHORISED SIGNATORY", right, signatureBottom + 3, 7.2, 3.3, { align: "right" });
  y += layout.supportHeight + gap;

  text("TERMS OF WARRANTY:", margin, y, 9, 4, { weight: "bold" });
  y += 5.5;
  layout.terms.forEach((lines, index) => {
    text(`${index + 1}.`, margin, y, termSize, termLine);
    text(lines, margin + 7, y, termSize, termLine);
    y += lines.length * termLine + 2;
  });

  pdf.setDrawColor(BORDER);
  pdf.line(margin, pageHeight - 26.5, right, pageHeight - 26.5);
  pdf.addImage(footerLogos, "JPEG", 9, pageHeight - 24, pageWidth - 18, 12.5, "footer-logos");
  font(7.5);
  pdf.text(CERTIFICATE_CONTACT, pageWidth / 2, pageHeight - 7, { align: "center" });
  const filename = `Warranty-${filenamePart(template.id)}-${filenamePart(invoice)}.pdf`;
  const pdfBlob = pdf.output("blob");
  await pdf.save(filename, { returnPromise: true });
  return { filename, pdfBlob };
}
