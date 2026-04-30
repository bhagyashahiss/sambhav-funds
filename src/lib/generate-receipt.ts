import { jsPDF } from "jspdf";

interface ReceiptData {
  receiptNo: string;
  eventDate: string | null;
  transactionDate: string;
  donorName: string;
  amount: number;
  description: string | null;
  eventName: string | null;
}

export async function generateReceipt(data: ReceiptData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // Try to load logo
  try {
    const logoImg = await loadImage("/icons/photo.jpg");
    doc.addImage(logoImg, "JPEG", margin, y, 20, 20);
  } catch {
    // Logo not available, skip
  }

  // Organization name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Sambhav Shanti Yuva Group", pageWidth / 2, y + 8, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Donation Receipt", pageWidth / 2, y + 15, { align: "center" });

  y += 28;

  // Divider line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Receipt number and dates
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Receipt No: ${data.receiptNo}`, margin, y);
  doc.text(`Received On: ${data.transactionDate}`, pageWidth - margin, y, { align: "right" });
  y += 7;
  if (data.eventDate) {
    doc.text(`Event Date: ${data.eventDate}`, pageWidth - margin, y, { align: "right" });
  }
  y += 10;

  // Main content
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  // Received from
  doc.text("Received from:", margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(data.donorName || "Anonymous", margin + 35, y);
  y += 10;

  // Amount
  doc.setFont("helvetica", "normal");
  doc.text("Amount:", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const amountStr = `Rs. ${data.amount.toLocaleString("en-IN")}`;
  doc.text(amountStr, margin + 35, y);
  y += 10;

  // Amount in words
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`(${numberToWords(data.amount)} Rupees Only)`, margin, y);
  y += 12;

  // Event
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (data.eventName) {
    doc.text("For Event:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(data.eventName, margin + 35, y);
    y += 10;
  }

  // Description
  if (data.description) {
    doc.setFont("helvetica", "normal");
    doc.text("Description:", margin, y);
    doc.setFont("helvetica", "bold");
    const descLines = doc.splitTextToSize(data.description, pageWidth - margin * 2 - 35);
    doc.text(descLines, margin + 35, y);
    y += descLines.length * 6 + 4;
  }

  y += 15;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Received by (hardcoded)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Received by:", margin, y);
  doc.setFont("helvetica", "bold");
  doc.text("Sambhav Shanti Yuva Group", margin, y + 6);

  // Signature line with SSYG
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SSYG", pageWidth - margin - 22, y + 2, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setDrawColor(150, 150, 150);
  doc.line(pageWidth - margin - 45, y + 5, pageWidth - margin, y + 5);
  doc.text("Authorized Signature", pageWidth - margin - 22, y + 10, { align: "center" });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text("This is a computer-generated receipt.", pageWidth / 2, footerY, { align: "center" });

  // Save
  const filename = `Receipt_${data.receiptNo}_${data.donorName?.replace(/\s+/g, "_") || "donor"}.pdf`;
  doc.save(filename);
}

function loadImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertChunk(n % 100) : "");
  }

  // Indian numbering system
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = "";
  if (crore) result += convertChunk(crore) + " Crore ";
  if (lakh) result += convertChunk(lakh) + " Lakh ";
  if (thousand) result += convertChunk(thousand) + " Thousand ";
  if (remainder) result += convertChunk(remainder);

  return result.trim();
}
