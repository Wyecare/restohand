import jsPDF from 'jspdf';
import type { DetailedBillCalculation } from '@/store/api/billingApi';

// ── Layout constants ────────────────────────────────────────────────
const W = 80; // paper width  (mm)
const ML = 6; // left margin
const MR = W - 6; // right edge
const CW = MR - ML; // content width
const LH = 4.8; // base line height
const SG = 2; // small gap
const MG = 4; // medium gap
const LG = 7; // large gap

export interface ThermalReceiptData {
  billData: DetailedBillCalculation;
  paymentMethod?: string;
  cashReceived?: number;
  changeGiven?: number;
}

export function generateThermalReceiptPDF(
  data: ThermalReceiptData
): Promise<Blob> {
  return new Promise((resolve) => {
    const {
      billData,
      paymentMethod = 'Digital',
      cashReceived,
      changeGiven,
    } = data;

    const doc = new jsPDF({ unit: 'mm', format: [W, 280] });
    let y = 0;

    // ── Primitive helpers ──────────────────────────────────────────

    const font = (size: number, style: 'normal' | 'bold' = 'normal') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
    };

    const textCenter = (
      text: string,
      size: number,
      style: 'normal' | 'bold' = 'normal'
    ) => {
      font(size, style);
      doc.text(text, W / 2, y, { align: 'center' });
      y += LH;
    };

    const textLeft = (
      text: string,
      size: number,
      style: 'normal' | 'bold' = 'normal',
      indent = 0
    ) => {
      font(size, style);
      doc.text(text, ML + indent, y);
      y += LH;
    };

    const textRight = (
      text: string,
      size: number,
      style: 'normal' | 'bold' = 'normal'
    ) => {
      font(size, style);
      doc.text(text, MR, y, { align: 'right' });
    };

    const row = (
      label: string,
      value: string,
      size = 8,
      labelBold: 'normal' | 'bold' = 'normal',
      valueBold: 'normal' | 'bold' = 'normal'
    ) => {
      font(size, labelBold);
      doc.text(label, ML, y);
      font(size, valueBold);
      doc.text(value, MR, y, { align: 'right' });
      y += LH;
    };

    const gap = (n = MG) => {
      y += n;
    };

    // Solid line
    const line = (lw = 0.25, dash = false) => {
      doc.setLineWidth(lw);
      if (dash) doc.setLineDash([1.2, 1.2]);
      doc.line(ML, y, MR, y);
      doc.setLineDash([]);
      y += SG;
    };

    // Thick double-rule (header / footer accent)
    const thickLine = () => {
      doc.setLineWidth(0.6);
      doc.line(ML, y, MR, y);
      y += 1;
      doc.setLineWidth(0.2);
      doc.line(ML, y, MR, y);
      y += SG + 1;
    };

    const formatINR = (n: number) => `Rs. ${n.toFixed(2)}`;

    const formatDate = (iso: string) =>
      new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

    // ── START ──────────────────────────────────────────────────────
    y = 10;

    // ── RESTAURANT HEADER ─────────────────────────────────────────
    textCenter(billData.restaurant.name.toUpperCase(), 13, 'bold');
    gap(SG);

    if (billData.restaurant.address) {
      const a = billData.restaurant.address;
      textCenter(`${a.line1}`, 7);
      textCenter(`${a.city}, ${a.state} - ${a.postalCode}`, 7);
    }
    if (billData.restaurant.phone) {
      gap(SG);
      textCenter(`Tel: ${billData.restaurant.phone}`, 7);
    }
    if (billData.restaurant.gstin) {
      textCenter(`GSTIN: ${billData.restaurant.gstin}`, 7);
    }

    gap(MG);
    thickLine();

    // ── TAX INVOICE label ─────────────────────────────────────────
    textCenter('TAX INVOICE', 9, 'bold');
    gap(SG);
    line(0.2, true);

    // ── SESSION / TABLE INFO ──────────────────────────────────────
    row('Table No.', billData.session.tableNumber, 8, 'normal', 'bold');
    if (billData.session.customerName) {
      row('Customer', billData.session.customerName, 8);
    }
    row('Date & Time', formatDate(billData.calculatedAt), 7);
    row(
      'Bill No.',
      `#${billData.session.sessionId.slice(-8).toUpperCase()}`,
      7
    );

    gap(MG);
    thickLine();

    // ── ITEMS HEADER ──────────────────────────────────────────────
    font(7, 'bold');
    doc.text('ITEM', ML, y);
    doc.text('QTY', ML + CW * 0.6, y, { align: 'center' });
    doc.text('AMOUNT', MR, y, { align: 'right' });
    y += LH;
    line(0.2);

    // ── ITEMS LIST ────────────────────────────────────────────────
    billData.allItems.forEach((item) => {
      // Item name (bold, wrapping if needed)
      font(8, 'bold');
      const nameLines = doc.splitTextToSize(item.name, CW * 0.65);
      doc.text(nameLines, ML, y);
      const nameBlockH = nameLines.length * LH;

      // Qty and Amount on first line
      font(8, 'normal');
      doc.text(String(item.quantity), ML + CW * 0.6, y, { align: 'center' });
      font(8, 'bold');
      doc.text(formatINR(item.totalWithTax), MR, y, { align: 'right' });

      y += nameBlockH;

      // Modifiers
      if (item.selectedModifiers?.length) {
        item.selectedModifiers.forEach((mod) => {
          const opts = mod.selectedOptions
            .map((o) =>
              o.priceAdjustment > 0
                ? `${o.optionName} (+Rs.${o.priceAdjustment.toFixed(2)})`
                : o.optionName
            )
            .join(', ');
          font(6, 'normal');
          doc.setTextColor(100);
          const modLines = doc.splitTextToSize(
            `+ ${mod.modifierName}: ${opts}`,
            CW - 4
          );
          doc.text(modLines, ML + 3, y);
          y += modLines.length * 3.5;
          doc.setTextColor(0);
        });
      }

      // Tax note
      if (item.totalTaxAmount > 0) {
        const hasGst =
          item.cgstAmount > 0 || item.sgstAmount > 0 || item.igstAmount > 0;
        const rate2 = hasGst ? item.gstRate : 25;
        const type = hasGst ? 'GST' : 'VAT';
        font(6, 'normal');
        doc.setTextColor(120);
        doc.text(
          `(incl. ${type} ${rate2}%: ${formatINR(item.totalTaxAmount)})`,
          ML + 2,
          y
        );
        doc.setTextColor(0);
        y += 3.5;
      }

      gap(SG);
    });

    line(0.2);

    // ── BILL SUMMARY ──────────────────────────────────────────────
    gap(SG);
    textCenter('BILL SUMMARY', 8, 'bold');
    gap(SG);
    line(0.15, true);

    row('Subtotal', formatINR(billData.subTotalAmount), 8);

    // Branch charges
    billData.branchCharges?.forEach((charge) => {
      const label =
        charge.type === 'percentage'
          ? `${charge.name} (${charge.value}%)`
          : charge.name;
      row(label, formatINR(charge.amount), 8);
    });

    // Tax breakdown
    if (billData.categoryCalculations?.length) {
      billData.categoryCalculations.forEach((cat) => {
        if (!cat.totalTaxAmount) return;
        const name = cat.category
          .replace('_', ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        const taxType = cat.taxType === 'vat' ? 'VAT' : 'GST';
        const rate3 = cat.taxType === 'gst' ? cat.gstRate : cat.vatRate;
        row(
          `${name} ${taxType}${rate3 ? ` (${rate3}%)` : ''}`,
          formatINR(cat.totalTaxAmount),
          7
        );
      });

      if ((billData.totalGstAmount || 0) > 0) {
        gap(SG);
        textLeft('GST Breakdown', 7, 'bold');
        if (billData.cgstAmount > 0)
          row('  CGST', formatINR(billData.cgstAmount), 6);
        if (billData.sgstAmount > 0)
          row('  SGST', formatINR(billData.sgstAmount), 6);
        if (billData.igstAmount > 0)
          row('  IGST', formatINR(billData.igstAmount), 6);
      }

      if ((billData.totalVatAmount || 0) > 0) {
        row('State VAT (Alcohol)', formatINR(billData.totalVatAmount), 7);
      }
    } else {
      if (billData.cgstAmount > 0)
        row('CGST', formatINR(billData.cgstAmount), 8);
      if (billData.sgstAmount > 0)
        row('SGST', formatINR(billData.sgstAmount), 8);
      if (billData.igstAmount > 0)
        row('IGST', formatINR(billData.igstAmount), 8);
    }

    if (billData.taxAmount > 0) {
      gap(SG);
      row('Total Tax', formatINR(billData.taxAmount), 8, 'normal', 'bold');
    }

    if (billData.discountAmount > 0) {
      row('Discount', `- ${formatINR(billData.discountAmount)}`, 8);
    }

    if (billData.roundOffAmount !== 0) {
      const sign = billData.roundOffAmount >= 0 ? '+' : '';
      row('Round Off', `${sign}${formatINR(billData.roundOffAmount)}`, 8);
    }

    // ── GRAND TOTAL box ───────────────────────────────────────────
    gap(MG);
    thickLine();

    // Shaded total row (simulate with just bold + larger size)
    font(11, 'bold');
    doc.text('GRAND TOTAL', ML, y);
    doc.text(formatINR(billData.totalAmount), MR, y, { align: 'right' });
    y += LH + SG;

    thickLine();

    // ── PAYMENT DETAILS ───────────────────────────────────────────
    gap(SG);
    textCenter('PAYMENT DETAILS', 8, 'bold');
    gap(SG);
    line(0.15, true);

    row('Payment Method', paymentMethod, 8, 'normal', 'bold');

    if (paymentMethod.toLowerCase() === 'cash' && cashReceived) {
      row('Cash Received', formatINR(cashReceived), 8);
      if (changeGiven && changeGiven > 0) {
        row('Change Returned', formatINR(changeGiven), 8);
      }
    }

    if (billData.paidAmount > 0) {
      row('Paid Amount', formatINR(billData.paidAmount), 8, 'normal', 'bold');
    }

    if (billData.pendingAmount > 0) {
      font(8, 'bold');
      doc.setTextColor(180, 0, 0);
      row('Balance Due', formatINR(billData.pendingAmount), 8);
      doc.setTextColor(0);
    }

    gap(LG);
    line();

    // ── FOOTER ────────────────────────────────────────────────────
    gap(SG);
    textCenter('Thank you for dining with us!', 9, 'bold');
    gap(SG);
    textCenter('We hope to see you again soon.', 7);
    gap(MG);
    line(0.15, true);
    gap(SG);
    textCenter('** Computer Generated Receipt — No Signature Required **', 6);

    gap(MG);

    resolve(doc.output('blob'));
  });
}

// ── Download helper ────────────────────────────────────────────────
export async function downloadThermalReceipt(
  billData: DetailedBillCalculation,
  paymentMethod?: string,
  cashReceived?: number,
  changeGiven?: number
) {
  const blob = await generateThermalReceiptPDF({
    billData,
    paymentMethod,
    cashReceived,
    changeGiven,
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-table${
    billData.session.tableNumber
  }-${billData.session.sessionId.slice(-6)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
