import { jsPDF } from "jspdf";

interface ReceiptData {
  receiptNo: string;
  eventDate: string;
  receivedOn: string;
  donorName: string;
  amount: number;
  eventName: string | null;
}

export async function generateReceipt(data: ReceiptData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 12;

  // Colors
  const titleBlue: [number, number, number] = [20, 50, 120]; // royal blue for org name
  const goldAccent: [number, number, number] = [185, 145, 20]; // gold for decorative accents
  const darkText: [number, number, number] = [30, 30, 30];
  const grayText: [number, number, number] = [100, 100, 100];
  const accentColor: [number, number, number] = [59, 130, 246]; // blue accent

  // Try to load logo
  try {
    const logoImg = await loadImage("/icons/photo.jpg");
    doc.addImage(logoImg, "JPEG", margin, y, 18, 18);
  } catch {
    // Logo not available, skip
  }

  // Organization name in Royal Blue with gold underline
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...titleBlue);
  doc.text("Sambhav Shanti Yuva Group", pageWidth / 2, y + 7, { align: "center" });
  // Gold decorative line under title
  doc.setDrawColor(...goldAccent);
  doc.setLineWidth(0.6);
  const titleW = doc.getTextWidth("Sambhav Shanti Yuva Group");
  doc.line((pageWidth - titleW) / 2, y + 9, (pageWidth + titleW) / 2, y + 9);

  // Address
  doc.setTextColor(...grayText);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Shree Purushottam Park Jain Sangh, Carter Road 4, Borivali East", pageWidth / 2, y + 13, { align: "center" });
  doc.text("Contact: +91 9082557642 | Email: sambhavshanti.ssyg@gmail.com", pageWidth / 2, y + 17, { align: "center" });

  y += 24;

  // Divider line
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Receipt number and date row
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Receipt No: ${data.receiptNo}`, margin, y);
  doc.text(`Event Date: ${data.eventDate}`, pageWidth - margin, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Received On: ${data.receivedOn}`, pageWidth - margin, y, { align: "right" });
  y += 10;

  // Received from
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayText);
  doc.text("Received with thanks from:", margin, y);
  y += 7;

  // Donor Name - wrap if needed
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...darkText);
  const nameLines = doc.splitTextToSize(data.donorName || "Anonymous", pageWidth - margin * 2);
  doc.text(nameLines, margin, y);
  y += nameLines.length * 6 + 4;

  // Amount
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayText);
  doc.text("Amount:", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...titleBlue);
  const amountStr = `Rs. ${data.amount.toLocaleString("en-IN")}/-`;
  doc.text(amountStr, margin + 22, y);
  y += 8;

  // Amount in words
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...grayText);
  doc.text(`(${numberToWords(data.amount)} Rupees Only)`, margin, y);
  y += 10;

  // Event
  if (data.eventName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayText);
    doc.text("Towards:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    const eventLines = doc.splitTextToSize(data.eventName, pageWidth - margin * 2 - 22);
    doc.text(eventLines, margin + 22, y);
    y += eventLines.length * 5 + 6;
  }

  y += 4;

  // Thin divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Remarks
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...grayText);
  const remarks = "We appreciate your contribution towards JinShashan. We assure you that funds shall be only utilized towards development of Jinshasan.";
  const remarkLines = doc.splitTextToSize(remarks, pageWidth - margin * 2);
  doc.text(remarkLines, margin, y);
  y += remarkLines.length * 4 + 8;

  // Signature area
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  doc.text("SSYG", pageWidth - margin - 20, y + 2, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setDrawColor(150, 150, 150);
  doc.line(pageWidth - margin - 40, y + 5, pageWidth - margin, y + 5);
  doc.setTextColor(...grayText);
  doc.text("Authorized Signature", pageWidth - margin - 20, y + 10, { align: "center" });

  // WhatsApp QR Code (bottom-left area)
  try {
    const qrImg = await loadImage("/icons/whatsapp-qr.png");
    doc.addImage(qrImg, "PNG", margin, y - 2, 22, 22);
    doc.setFontSize(6);
    doc.setTextColor(...grayText);
    doc.text("Scan to connect on WhatsApp", margin + 11, y + 22, { align: "center" });
  } catch {
    // QR not available, skip
  }

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("This is a computer-generated receipt.", pageWidth / 2, footerY, { align: "center" });

  // Save
  const filename = `Receipt_${data.receiptNo}_${data.donorName?.replace(/\s+/g, "_") || "donor"}.pdf`;
  doc.save(filename);

  // Return blob for sharing
  return doc.output("blob");
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
