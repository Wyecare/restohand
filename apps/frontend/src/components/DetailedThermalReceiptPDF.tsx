import jsPDF from 'jspdf';
import type { DetailedBillCalculation } from '@/store/api/billingApi';

// Modern receipt styling constants
const RECEIPT_WIDTH = 80; // 80mm width
const MARGIN = 8; // Clean margins
const CONTENT_WIDTH = RECEIPT_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 5; // Better line spacing
const SMALL_GAP = 2; // Small vertical gap
const MEDIUM_GAP = 4; // Medium vertical gap

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

    const doc = new jsPDF({
      unit: 'mm',
      format: [RECEIPT_WIDTH, 200], // Will adjust height later
    });

    let y = MARGIN;

    // Helper: Add centered text
    const addCentered = (text: string, fontSize = 8, bold = false) => {
      doc.setFontSize(fontSize);
      if (bold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');

      // Use align option for centering
      doc.text(text, RECEIPT_WIDTH / 2, y, { align: 'center' });
      y += LINE_HEIGHT;
    };

    // Helper: Add left-aligned text
    const addLeft = (text: string, fontSize = 8, bold = false) => {
      doc.setFontSize(fontSize);
      if (bold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');

      doc.text(text, MARGIN, y);
      y += LINE_HEIGHT;
    };

    // Helper: Add two-column row (label left, value right)
    const addRow = (
      label: string,
      value: string,
      fontSize = 8,
      boldValue = false
    ) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'normal');
      doc.text(label, MARGIN, y);

      if (boldValue) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');

      // Right-align the value - use align option instead of manual calculation
      doc.text(value, RECEIPT_WIDTH - MARGIN, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += LINE_HEIGHT;
    };

    // Helper: Add separator line
    const addSeparator = (style: 'solid' | 'dashed' = 'solid') => {
      const lineY = y - LINE_HEIGHT / 2 + 1;

      if (style === 'dashed') {
        doc.setLineDash([1, 1]);
      }

      doc.setLineWidth(0.2);
      doc.line(MARGIN, lineY, RECEIPT_WIDTH - MARGIN, lineY);
      doc.setLineDash([]);

      y += SMALL_GAP;
    };

    // Helper: Add gap
    const addGap = (size: 'small' | 'medium' = 'small') => {
      y += size === 'small' ? SMALL_GAP : MEDIUM_GAP;
    };

    // Helper: Format currency
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

    // Helper: Format date/time
    const formatDateTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    };

    // ========== HEADER ==========
    addCentered(billData.restaurant.name.toUpperCase(), 11, true);

    if (billData.restaurant.address) {
      const addr = billData.restaurant.address;
      addCentered(`${addr.line1}`, 7);
      addCentered(`${addr.city}, ${addr.state} ${addr.postalCode}`, 7);
    }

    if (billData.restaurant.phone) {
      addCentered(`Ph: ${billData.restaurant.phone}`, 7);
    }

    if (billData.restaurant.gstin) {
      addCentered(`GSTIN: ${billData.restaurant.gstin}`, 7);
    }

    addGap('medium');
    addSeparator('solid');
    addGap('small');

    // ========== SESSION INFO ==========
    addRow('Table:', billData.session.tableNumber, 8, true);
    if (billData.session.customerName) {
      addRow('Customer:', billData.session.customerName, 8);
    }
    addRow('Date:', formatDateTime(billData.calculatedAt), 7);
    addRow(
      'Session:',
      `#${billData.session.sessionId.slice(-8).toUpperCase()}`,
      7
    );

    addGap('small');
    addSeparator('solid');
    addGap('small');

    // ========== ITEMS ==========
    addCentered('ORDER ITEMS', 9, true);
    addSeparator('dashed');

    billData.allItems.forEach((item, index) => {
      const pricePerUnit = item.totalWithTax / item.quantity;

      // Item name
      addLeft(item.name, 8, true);

      // Quantity × Price = Total
      const qtyLine = `${item.quantity} × ${formatCurrency(pricePerUnit)}`;
      const totalValue = formatCurrency(item.totalWithTax);
      addRow(qtyLine, totalValue, 7);

      // Tax info (if applicable)
      if (item.totalTaxAmount > 0) {
        const hasGst =
          item.cgstAmount > 0 || item.sgstAmount > 0 || item.igstAmount > 0;
        const taxType = hasGst ? 'GST' : 'VAT';
        const taxRate = hasGst ? item.gstRate : 25;

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        const taxText = `  (incl. ${taxType} ${taxRate}%: ${formatCurrency(
          item.totalTaxAmount
        )})`;
        doc.text(taxText, MARGIN + 2, y);
        y += 3.5;
      }

      // Add spacing between items (except last)
      if (index < billData.allItems.length - 1) {
        addGap('small');
      }
    });

    addGap('small');
    addSeparator('solid');
    addGap('small');

    // ========== SUMMARY ==========
    addCentered('BILL SUMMARY', 9, true);
    addSeparator('dashed');

    // Subtotal
    addRow('Subtotal', formatCurrency(billData.subTotalAmount), 8);

    // Branch charges
    if (billData.branchCharges && billData.branchCharges.length > 0) {
      billData.branchCharges.forEach((charge) => {
        let label = charge.name;
        if (charge.type === 'percentage') {
          label += ` (${charge.value}%)`;
        }
        addRow(label, formatCurrency(charge.amount), 8);
      });
    }

    // Tax breakdown
    if (
      billData.categoryCalculations &&
      billData.categoryCalculations.length > 0
    ) {
      // Category-wise taxes
      billData.categoryCalculations.forEach((cat) => {
        if (cat.totalTaxAmount === 0) return;

        const catName = cat.category
          .replace('_', ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        const taxType = cat.taxType === 'vat' ? 'VAT' : 'GST';
        const rate = cat.taxType === 'gst' ? cat.gstRate : cat.vatRate;

        const label = `${catName} ${taxType}${rate ? ` (${rate}%)` : ''}`;
        addRow(label, formatCurrency(cat.totalTaxAmount), 7);
      });

      // GST breakdown
      if ((billData.totalGstAmount || 0) > 0) {
        addGap('small');
        addLeft('  GST Breakdown:', 7, true);

        if (billData.cgstAmount > 0) {
          addRow('    CGST', formatCurrency(billData.cgstAmount), 6);
        }
        if (billData.sgstAmount > 0) {
          addRow('    SGST', formatCurrency(billData.sgstAmount), 6);
        }
        if (billData.igstAmount > 0) {
          addRow('    IGST', formatCurrency(billData.igstAmount), 6);
        }
      }

      // VAT breakdown
      if ((billData.totalVatAmount || 0) > 0) {
        addGap('small');
        addRow(
          '  State VAT (Alcohol)',
          formatCurrency(billData.totalVatAmount),
          7
        );
      }
    } else {
      // Simple tax breakdown
      if (billData.cgstAmount > 0) {
        addRow('CGST', formatCurrency(billData.cgstAmount), 8);
      }
      if (billData.sgstAmount > 0) {
        addRow('SGST', formatCurrency(billData.sgstAmount), 8);
      }
      if (billData.igstAmount > 0) {
        addRow('IGST', formatCurrency(billData.igstAmount), 8);
      }
    }

    // Total tax
    if (billData.taxAmount > 0) {
      addRow('Total Tax', formatCurrency(billData.taxAmount), 8, true);
    }

    // Discount
    if (billData.discountAmount > 0) {
      addRow('Discount', `- ${formatCurrency(billData.discountAmount)}`, 8);
    }

    // Round off
    if (billData.roundOffAmount !== 0) {
      const sign = billData.roundOffAmount >= 0 ? '+' : '';
      addRow(
        'Round Off',
        `${sign}${formatCurrency(billData.roundOffAmount)}`,
        8
      );
    }

    addGap('medium');
    addSeparator('solid');
    addGap('small');

    // ========== GRAND TOTAL ==========
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', MARGIN, y);

    const totalText = formatCurrency(billData.totalAmount);
    doc.text(totalText, RECEIPT_WIDTH - MARGIN, y, { align: 'right' });
    y += LINE_HEIGHT + SMALL_GAP;

    addSeparator('solid');
    addGap('small');

    // ========== PAYMENT ==========
    addCentered('PAYMENT DETAILS', 9, true);
    addSeparator('dashed');

    addRow('Method', paymentMethod, 8, true);

    if (paymentMethod.toLowerCase() === 'cash' && cashReceived) {
      addRow('Cash Received', formatCurrency(cashReceived), 8);

      if (changeGiven && changeGiven > 0) {
        addRow('Change Given', formatCurrency(changeGiven), 8);
      }
    }

    if (billData.paidAmount > 0) {
      addRow('Paid Amount', formatCurrency(billData.paidAmount), 8);
    }

    if (billData.pendingAmount > 0) {
      addRow('Pending', formatCurrency(billData.pendingAmount), 8);
    }

    addGap('medium');
    addSeparator('solid');
    addGap('medium');

    // ========== FOOTER ==========
    addCentered('Thank you for dining with us!', 8, true);
    addCentered('Please visit again', 7);

    addGap('medium');
    addCentered('** Computer Generated Receipt **', 6);

    // Adjust final PDF height
    const finalHeight = y + MARGIN;
    const pdfBlob = doc.output('blob');

    resolve(pdfBlob);
  });
}

// Utility function to download the receipt
export async function downloadThermalReceipt(
  billData: DetailedBillCalculation,
  paymentMethod?: string,
  cashReceived?: number,
  changeGiven?: number
) {
  const receiptData: ThermalReceiptData = {
    billData,
    paymentMethod,
    cashReceived,
    changeGiven,
  };

  const pdfBlob = await generateThermalReceiptPDF(receiptData);
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${
    billData.session.tableNumber
  }-${billData.session.sessionId.slice(-6)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
