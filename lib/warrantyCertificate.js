export const CERTIFICATE_COMPANY = "FAZA BUILDING MATERIALS TRADING LLC";
export const CERTIFICATE_CONTACT = "P.O. Box: 171161, Dubai, U.A.E. | sales@fazahome.ae | www.fazahome.ae";
export const CERTIFICATE_SIGNATORY = `For M/s. ${CERTIFICATE_COMPANY}`;
export const CERTIFICATE_LAYOUT = Object.freeze({
  labelWidth: 25,
  purchaseDateLabelWidth: 36,
  supportGap: 5,
  productGap: 7,
  companyFontSize: 8,
  companyLineHeight: 3,
  stampWidth: 50,
  stampDensityStep: 4,
});

export function certificateStatement(template) {
  return `This is to certify that the ${template.brand} products listed below were supplied against the invoice stated above.`;
}

export function normalizeWarrantyProducts(products, template) {
  // Preserve compatibility with callers that predate the editable product table.
  const rows = products === undefined ? [{ name: template.name, quantity: 1 }] : products;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Add at least one product to the certificate.");
  return rows.map((row, index) => {
    const name = String(row?.name ?? "").trim();
    const rawQuantity = String(row?.quantity ?? "").trim();
    const quantity = Number(rawQuantity);
    if (!name) throw new Error(`Enter a product name for row ${index + 1}.`);
    if (!/^\d+$/.test(rawQuantity) || !Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error(`Quantity in row ${index + 1} must be a positive whole number.`);
    }
    return { name, quantity };
  });
}

export function certificateWarrantyContent(template, products) {
  const selectedProductOnly = products.every((product) =>
    product.name.trim().toLowerCase().startsWith(template.name.toLowerCase())
  );
  if (selectedProductOnly) return { guidance: template.guidance, terms: template.terms };
  return {
    guidance: `Retain the invoice and identification, installation and service records for each ${template.brand} product listed above. Follow the supplied manual for each model.`,
    // Keep the selected template's complete terms, including later custom edits.
    terms: template.terms,
  };
}
