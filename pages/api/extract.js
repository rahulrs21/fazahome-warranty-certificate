
import pdfParse from "pdf-parse";
import { requireTeamApi, sendAuthError } from "../../lib/server/teamAuth";

// Helper to download PDF from URL
async function fetchPdfBuffer(pdfUrl) {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error("Failed to fetch PDF from URL");
  return Buffer.from(await res.arrayBuffer());
}

export const config = {
  api: {
    bodyParser: false, // We'll parse form-data manually
  },
};

export default async function handler(req, res) {
  try { await requireTeamApi(req, res); }
  catch (error) { return sendAuthError(res, error); }
  if (req.method === "POST") {
    try {
      // Parse form-data to get pdfUrl and invoiceNumber
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const boundary = req.headers["content-type"].split("boundary=")[1];
      const parts = buffer.toString().split(`--${boundary}`);
      let pdfUrl = null, invoiceNumber = null;

      for (const part of parts) {
        if (part.includes('name="pdfUrl"')) {
          pdfUrl = part.split("\r\n\r\n")[1]?.trim().replace(/--$/, "");
        }
        if (part.includes('name="invoiceNumber"')) {
          invoiceNumber = part.split("\r\n\r\n")[1]?.trim().replace(/--$/, "");
        }
      }

      if (!pdfUrl) return res.status(400).json({ error: "Missing pdfUrl" });

      // Download PDF from Firebase Storage
      const dataBuffer = await fetchPdfBuffer(pdfUrl);

      // Parse PDF as before
      const data = await pdfParse(dataBuffer);
      const text = data.text;

      // ...existing extraction logic...
      const customerMatch = text.match(/Ship To:\s*(.+)\n/i) || text.match(/Shipping Address:\s*(.+)\n/i);
      const customerName = customerMatch ? customerMatch[1].trim() : "Not Found";
      const orderMatch = text.match(/Order ID[:\s]+([0-9\-]+)/i);
      const orderNumber = orderMatch ? orderMatch[1].trim() : "Not Found";
      const orderDateMatch = text.match(/([A-Za-z]{3},\s[A-Za-z]{3}\s\d{1,2},\s\d{4})/);
      const orderDate = orderDateMatch ? orderDateMatch[1].trim() : "Not Found";
      const addressMatch = text.match(/Ship To:\s*([\s\S]*?)\nOrder ID:/i) || text.match(/Shipping Address:\s*([\s\S]*?)\nOrder Date:/i);
      const address = addressMatch ? addressMatch[1].replace(/\n/g, ", ").trim() : "Not Found";
      const quantityMatch = text.match(/Order Totals\s*\n\s*(\d+)/i);
      const quantityString = quantityMatch ? quantityMatch[1].trim() : "Not Found";
      const quantity = parseInt(quantityString.replace(/[^0-9.]/g, ''));
      const productMatch = text.match(/Order Totals\s*\d+\s*([\s\S]*?)\s*SKU\s*:/i);
      const productName = productMatch ? productMatch[1].trim().replace(/\s*\r?\n\s*/g, " ") : "Not Found";
      const priceMatch = text.match(/Grand total[:\s]+([A-Z]+\s*[0-9\.,]+)/i) || text.match(/COD Collectible Amount[:\s]+([A-Z]+\s*[0-9\.,]+)/i) || text.match(/Item total[:\s]+([A-Z]+\s*[0-9\.,]+)/i);
      const price = priceMatch ? priceMatch[1].trim() : "Not Found";
      const totalPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
      const vatValue = ((totalPrice * 0.05).toFixed(2));
      const unitPrice = ((totalPrice / quantity)).toFixed(2);
      const subTotal = ((unitPrice * quantity) - vatValue).toFixed(2);
      
      const unitPriceMain = ((subTotal / quantity)).toFixed(3);

      res.status(200).json({
        customerName,
        orderNumber,
        orderDate,
        address,
        productName,
        quantity,
        price,
        unitPriceMain,
        vatValue,
        subTotal
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to process PDF", details: err.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
