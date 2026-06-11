import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DeliveryChallan } from '@/types';
import { COMPANY_DETAILS } from '@/lib/company';

type ChallanPdfRow = {
  srNo: string;
  item: string;
  qty: string;
  rate: string;
  per: string;
  amount: string;
};

export type ChallanPdfData = {
  fileName: string;
  orderType: 'manual' | 'website';
  challanNumber: string;
  billNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerTaxId: string;
  subtotal: number;
  discount: number;
  taxableTotal: number;
  gstValue: number;
  gstPercentLabel: string;
  packingHamaliValue: number | null;
  grandTotal: number;
  amountInWords: string;
  remarks: string;
  signatureLabel: string;
  rows: ChallanPdfRow[];
};

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const LOGO_CACHE = new Map<string, Promise<string | null>>();

function safeText(value?: string | null): string {
  const text = value?.trim();
  return text ? text : '-';
}

function formatCurrency(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `Rs. ${INR_FORMATTER.format(value)}`;
}

function formatDateValue(date?: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatAddress(challan: DeliveryChallan): string {
  const address = challan.shippingAddress || challan.billingAddress;
  const parts = [
    address?.addressLine1,
    address?.addressLine2,
    [address?.city, address?.state].filter(Boolean).join(', '),
    address?.pincode,
    address?.country,
  ];

  return safeText(parts.filter(Boolean).join(', '));
}

function extractCustomerTaxId(challan: DeliveryChallan): string {
  const taxFields = challan as DeliveryChallan & {
    customerPan?: string;
    customerGST?: string;
    customerGstin?: string;
    customerTaxId?: string;
    customerTaxNumber?: string;
    pan?: string;
    gstin?: string;
  };

  return safeText(
    taxFields.customerGST ||
      taxFields.customerGstin ||
      taxFields.customerPan ||
      taxFields.customerTaxId ||
      taxFields.customerTaxNumber ||
      taxFields.pan ||
      taxFields.gstin,
  );
}

function getPerLabel(variantLabel?: string): string {
  const normalized = variantLabel?.trim();
  if (!normalized) return 'Pcs';

  const unitCandidate = normalized.match(/\b(pcs?|pieces?|box|boxes|set|sets|kg|g|ltr|litre|litres|ml)\b/i)?.[0];
  return unitCandidate ? unitCandidate.replace(/^./, (char) => char.toUpperCase()) : 'Pcs';
}

function amountToWords(value: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigitsToWords = (num: number): string => {
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];

    const ten = Math.floor(num / 10);
    const one = num % 10;
    return [tens[ten], ones[one]].filter(Boolean).join(' ');
  };

  const threeDigitsToWords = (num: number): string => {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    const parts = [];

    if (hundred > 0) {
      parts.push(`${ones[hundred]} Hundred`);
    }

    if (remainder > 0) {
      parts.push(twoDigitsToWords(remainder));
    }

    return parts.join(' ');
  };

  if (!Number.isFinite(value) || value <= 0) return 'Zero Rupees Only';

  const roundedValue = Math.round(value);
  const crore = Math.floor(roundedValue / 10000000);
  const lakh = Math.floor((roundedValue % 10000000) / 100000);
  const thousand = Math.floor((roundedValue % 100000) / 1000);
  const remainder = roundedValue % 1000;
  const parts = [];

  if (crore > 0) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh > 0) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (remainder > 0) parts.push(threeDigitsToWords(remainder));

  return `${parts.join(' ').replace(/\s+/g, ' ').trim()} Rupees Only`;
}

export function mapDeliveryChallanToPdfData(challan: DeliveryChallan): ChallanPdfData {
  const subtotal = challan.subtotal ?? challan.products.reduce((sum, product) => sum + (product.price || 0) * (product.quantity || 0), 0);
  const discount = challan.discount ?? 0;
  const taxableTotal = Math.max(subtotal - discount, 0);
  const gstValue = challan.gst ?? 0;
  const grandTotal = challan.totalAmount ?? taxableTotal + gstValue;
  const packingHamaliValue = grandTotal - taxableTotal - gstValue;
  const gstPercent = taxableTotal > 0 && gstValue > 0 ? (gstValue / taxableTotal) * 100 : 0;
  const orderType = challan.orderSource === 'manual_sale' ? 'manual' : 'website';
  const orderLabel = orderType === 'manual' ? challan.manualOrderId || challan.orderId || challan.challanNumber : challan.orderId || challan.challanNumber;

  return {
    fileName: `${challan.challanNumber || 'challan'}.pdf`,
    orderType,
    challanNumber: safeText(challan.challanNumber),
    billNumber: safeText(orderLabel),
    date: formatDateValue(challan.dispatchedAt || challan.createdAt),
    customerName: safeText(challan.customerName || challan.shippingAddress?.fullName),
    customerPhone: safeText(challan.customerPhone || challan.shippingAddress?.phone),
    customerAddress: formatAddress(challan),
    customerTaxId: extractCustomerTaxId(challan),
    subtotal,
    discount,
    taxableTotal,
    gstValue,
    gstPercentLabel: gstPercent > 0 ? `${gstPercent.toFixed(2)}%` : '-',
    packingHamaliValue: packingHamaliValue > 0 ? packingHamaliValue : null,
    grandTotal,
    amountInWords: amountToWords(grandTotal),
    remarks: safeText(challan.remarks),
    signatureLabel: 'Authorized Signature',
    rows: challan.products.map((product, index) => ({
      srNo: String(index + 1),
      item: [product.productName, product.variantLabel].filter(Boolean).join(' - ') || '-',
      qty: String(product.quantity || 0),
      rate: formatCurrency(product.price || 0),
      per: getPerLabel(product.variantLabel),
      amount: formatCurrency((product.price || 0) * (product.quantity || 0)),
    })),
  };
}

async function fetchLogoDataUrl(path: string): Promise<string | null> {
  if (!LOGO_CACHE.has(path)) {
    LOGO_CACHE.set(
      path,
      fetch(path)
        .then(async (response) => {
          if (!response.ok) return null;
          const blob = await response.blob();
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(new Error('Failed to read logo file.'));
            reader.readAsDataURL(blob);
          });
        })
        .catch(() => null),
    );
  }

  return LOGO_CACHE.get(path) ?? null;
}

export async function createChallanPdfDocument(challan: DeliveryChallan): Promise<jsPDF> {
  const data = mapDeliveryChallanToPdfData(challan);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const logoDataUrl = await fetchLogoDataUrl(COMPANY_DETAILS.logoPath);

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  let cursorY = margin + 6;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin + 2, cursorY - 2, 24, 18);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(COMPANY_DETAILS.legalName, pageWidth / 2, cursorY + 2, { align: 'center' });
  doc.setFontSize(10);
  doc.text(COMPANY_DETAILS.siteName, pageWidth / 2, cursorY + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Manufacturer & Suppliers of Packaging Products', pageWidth / 2, cursorY + 13, { align: 'center' });
  doc.line(margin, cursorY + 16, pageWidth - margin, cursorY + 16);

  cursorY += 21;
  doc.setFontSize(8.5);
  COMPANY_DETAILS.addressLines.forEach((line, index) => {
    doc.text(line, pageWidth / 2, cursorY + index * 4.5, { align: 'center', maxWidth: contentWidth - 10 });
  });

  cursorY += COMPANY_DETAILS.addressLines.length * 4.5 + 2;
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(`Contact No.: ${COMPANY_DETAILS.contactNumber}`, margin + 2, cursorY);
  doc.text(`Email: ${COMPANY_DETAILS.email}`, pageWidth - margin - 2, cursorY, { align: 'right' });
  cursorY += 5;
  doc.text(`GSTIN: ${COMPANY_DETAILS.gstin}`, margin + 2, cursorY);
  doc.text(`Website: ${COMPANY_DETAILS.website.replace(/^https?:\/\//, '')}`, pageWidth - margin - 2, cursorY, { align: 'right' });
  cursorY += 2.5;
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  const metaTop = cursorY;
  const metaMid = margin + contentWidth * 0.63;
  const customerBottom = metaTop + 33;

  doc.line(metaMid, metaTop, metaMid, customerBottom);
  doc.line(margin, customerBottom, pageWidth - margin, customerBottom);

  cursorY = metaTop + 6;
  doc.setFontSize(10);
  doc.text(data.customerName, margin + 2, cursorY);
  doc.setFontSize(8.5);
  cursorY += 6;
  doc.text(`Contact No.: ${data.customerPhone}`, margin + 2, cursorY);
  cursorY += 5;
  doc.text(`Address: ${data.customerAddress}`, margin + 2, cursorY, { maxWidth: metaMid - margin - 6 });
  cursorY += 10;
  doc.text(`Customer PAN / GST: ${data.customerTaxId}`, margin + 2, cursorY, { maxWidth: metaMid - margin - 6 });

  doc.setFont('helvetica', 'bold');
  doc.text(`Date: ${data.date}`, pageWidth - margin - 2, metaTop + 8, { align: 'right' });
  doc.text(`Challan / Bill No.: ${data.billNumber}`, pageWidth - margin - 2, metaTop + 16, { align: 'right' });
  doc.text(`Order Type: ${data.orderType === 'manual' ? 'Manual' : 'Website'}`, pageWidth - margin - 2, metaTop + 24, { align: 'right' });
  doc.text(`Challan No.: ${data.challanNumber}`, pageWidth - margin - 2, metaTop + 32, { align: 'right' });

  const tableStartY = customerBottom;
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: 20,
      lineColor: 0,
      lineWidth: 0.2,
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: 0,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 76 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 32 },
    },
    head: [['Sr. No.', 'Item', 'Qty.', 'Rate', 'Per', 'Amount']],
    body: data.rows.length
      ? data.rows.map((row) => [row.srNo, row.item, row.qty, row.rate, row.per, row.amount])
      : [['-', 'No products added to this challan.', '-', '-', '-', '-']],
  });

  const tableY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableStartY + 90;
  const summaryTop = tableY;
  const summaryWidth = 78;
  const summaryLeft = pageWidth - margin - summaryWidth;
  const summaryRows = [
    { label: 'Total', value: formatCurrency(data.subtotal) },
    { label: 'Discount', value: data.discount > 0 ? formatCurrency(data.discount) : '-' },
    { label: `GST ${data.gstPercentLabel}`, value: data.gstValue > 0 ? formatCurrency(data.gstValue) : '-' },
    { label: 'Packing & Hamali', value: data.packingHamaliValue ? formatCurrency(data.packingHamaliValue) : '-' },
    { label: 'Grand Total', value: formatCurrency(data.grandTotal), bold: true },
  ];

  autoTable(doc, {
    startY: summaryTop,
    margin: { left: summaryLeft, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: 20,
      lineColor: 0,
      lineWidth: 0.2,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 30 },
    },
    body: summaryRows.map((row) => [row.label, row.value]),
    didParseCell: (hookData) => {
      const row = summaryRows[hookData.row.index];
      if (row?.bold) {
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const summaryBottom = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? summaryTop + 25;
  const wordsTop = summaryBottom;
  doc.rect(margin, wordsTop, contentWidth, 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Amount chargeable (in words)', margin + 2, wordsTop + 5);
  doc.setFont('helvetica', 'italic');
  doc.text(data.amountInWords, margin + 2, wordsTop + 11, { maxWidth: contentWidth - 4 });

  const signatureTop = wordsTop + 15;
  const signatureHeight = Math.max(pageHeight - margin - signatureTop, 28);
  const signatureMid = pageWidth - margin - 68;
  doc.rect(margin, signatureTop, contentWidth, signatureHeight);
  doc.line(signatureMid, signatureTop, signatureMid, pageHeight - margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Remarks: ${data.remarks}`, margin + 2, signatureTop + 6, { maxWidth: signatureMid - margin - 4 });
  doc.setFont('helvetica', 'bold');
  doc.text(data.signatureLabel, pageWidth - margin - 2, pageHeight - margin - 2, { align: 'right' });

  return doc;
}

export async function createChallanPdfBlob(challan: DeliveryChallan): Promise<Blob> {
  const doc = await createChallanPdfDocument(challan);
  return doc.output('blob');
}

export async function downloadChallanPdf(challan: DeliveryChallan): Promise<void> {
  const data = mapDeliveryChallanToPdfData(challan);
  const doc = await createChallanPdfDocument(challan);
  doc.save(data.fileName);
}
