import jsPDF from 'jspdf';
import type { DetailedBillCalculation } from '@/store/api/billingApi';

// Thermal receipt styling constants - Increased width for better readability
const THERMAL_WIDTH = 80; // 80mm thermal paper width (increased from 72mm)
const MARGIN = 6; // 4mm margins (increased from 3mm)
const CONTENT_WIDTH = THERMAL_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 4.5; // 4.5mm line height (slightly increased)

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

    // Create PDF with thermal paper dimensions
    const doc = new jsPDF({
      unit: 'mm',
      format: [THERMAL_WIDTH, 200], // Start with estimated height, will adjust
    });

    let y = MARGIN; // Current Y position

    // Helper functions
    const addLine = (
      text: string,
      fontSize = 7,
      align: 'left' | 'center' | 'right' = 'left'
    ) => {
      doc.setFontSize(fontSize);

      if (align === 'center') {
        const textWidth = doc.getTextWidth(text);
        const x = (THERMAL_WIDTH - textWidth) / 2;
        doc.text(text, x, y);
      } else if (align === 'right') {
        const textWidth = doc.getTextWidth(text);
        const x = THERMAL_WIDTH - MARGIN - textWidth;
        doc.text(text, x, y);
      } else {
        doc.text(text, MARGIN, y);
      }

      y += LINE_HEIGHT;
    };

    const addSeparator = () => {
      const separatorY = y - LINE_HEIGHT / 2;
      doc.line(MARGIN, separatorY, THERMAL_WIDTH - MARGIN, separatorY);
      y += 1;
    };

    const addItemLine = (
      name: string,
      qty: number,
      priceWithTax: number,
      totalWithTax: number
    ) => {
      doc.setFontSize(7);

      // Item name
      doc.text(name, MARGIN, y);
      y += LINE_HEIGHT;

      // Quantity x Price (with tax) = Total line
      const qtyText = `${qty} x ₹${priceWithTax.toFixed(2)}`;
      const totalText = `₹${totalWithTax.toFixed(2)}`;

      doc.text(qtyText, MARGIN + 2, y);
      const totalWidth = doc.getTextWidth(totalText);
      doc.text(totalText, THERMAL_WIDTH - MARGIN - totalWidth, y);
      y += LINE_HEIGHT;
    };

    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
    const formatDateTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    };

    // Start building the receipt

    // Restaurant Header
    addLine(billData.restaurant.name.toUpperCase(), 10, 'center');
    if (billData.restaurant.address) {
      const address = billData.restaurant.address;
      addLine(`${address.line1}`, 7, 'center');
      addLine(
        `${address.city}, ${address.state} ${address.postalCode}`,
        7,
        'center'
      );
    }

    if (billData.restaurant.phone) {
      addLine(`Ph: ${billData.restaurant.phone}`, 7, 'center');
    }

    if (billData.restaurant.gstin) {
      addLine(`GSTIN: ${billData.restaurant.gstin}`, 6, 'center');
    }

    addSeparator();

    // Session Details
    addLine(`Table: ${billData.session.tableNumber}`, 8, 'center');
    if (billData.session.customerName) {
      addLine(`Customer: ${billData.session.customerName}`, 7, 'center');
    }
    addLine(`Date: ${formatDateTime(billData.calculatedAt)}`, 7, 'center');
    addLine(
      `Session: ${billData.session.sessionId.slice(-8).toUpperCase()}`,
      6,
      'center'
    );

    addSeparator();

    // Items Header
    addLine('ITEMS', 8, 'center');
    addSeparator();

    // Individual Items
    billData.allItems.forEach((item) => {
      // Calculate price per unit with tax included (what customer actually pays)
      const pricePerUnitWithTax = item.totalWithTax / item.quantity;

      addItemLine(
        item.name,
        item.quantity,
        pricePerUnitWithTax,
        item.totalWithTax
      );

      // Show tax breakdown for each item if there's tax
      if (item.totalTaxAmount > 0) {
        doc.setFontSize(6);

        // For mixed tax bills, we need to determine if this item uses GST or VAT
        // Check if this is part of category calculations to determine tax type
        const hasGst =
          item.cgstAmount > 0 || item.sgstAmount > 0 || item.igstAmount > 0;
        const taxType = hasGst ? 'GST' : 'VAT';
        const taxRate = hasGst ? item.gstRate : 25; // Assume 25% for VAT if not GST

        const taxText = `  ${taxType} (${taxRate}%) included: ₹${item.totalTaxAmount.toFixed(
          2
        )}`;
        doc.text(taxText, MARGIN + 2, y);
        y += 3; // Smaller line height for tax details

        // Show detailed breakdown only for GST items
        if (
          hasGst &&
          (item.cgstAmount > 0 || item.sgstAmount > 0 || item.igstAmount > 0)
        ) {
          let detailText = '  ';
          if (item.cgstAmount > 0)
            detailText += `CGST: ₹${item.cgstAmount.toFixed(2)} `;
          if (item.sgstAmount > 0)
            detailText += `SGST: ₹${item.sgstAmount.toFixed(2)} `;
          if (item.igstAmount > 0)
            detailText += `IGST: ₹${item.igstAmount.toFixed(2)} `;

          if (detailText.trim() !== '') {
            doc.text(detailText.trim(), MARGIN + 2, y);
            y += 3;
          }
        }
      }

      y += 1; // Small gap between items
    });

    addSeparator();

    // Bill Totals
    addLine('BILL SUMMARY', 8, 'center');
    addSeparator();

    // Subtotal
    doc.setFontSize(7);
    doc.text('Subtotal:', MARGIN, y);
    const subtotalText = formatCurrency(billData.subTotalAmount);
    const subtotalWidth = doc.getTextWidth(subtotalText);
    doc.text(subtotalText, THERMAL_WIDTH - MARGIN - subtotalWidth, y);
    y += LINE_HEIGHT;

    // Branch Charges - Dynamic Display
    if (billData.branchCharges && billData.branchCharges.length > 0) {
      billData.branchCharges.forEach((charge) => {
        let chargeName = charge.name;
        if (charge.type === 'percentage') {
          chargeName += ` (${charge.value}%)`;
        }

        doc.text(chargeName + ':', MARGIN, y);
        const chargeText = formatCurrency(charge.amount);
        const chargeWidth = doc.getTextWidth(chargeText);
        doc.text(chargeText, THERMAL_WIDTH - MARGIN - chargeWidth, y);
        y += LINE_HEIGHT;
      });
    }

    // Dynamic Tax breakdown - handle both mixed and simple tax scenarios
    if (billData.taxAmount > 0) {
      // Check if we have mixed tax calculations (category-based)
      if (
        billData.categoryCalculations &&
        billData.categoryCalculations.length > 0
      ) {
        // Show category-wise tax breakdown
        billData.categoryCalculations.forEach((categoryCalc) => {
          if (categoryCalc.totalTaxAmount === 0) return;

          const categoryName = categoryCalc.category
            .replace('_', ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());

          const taxTypeLabel = categoryCalc.taxType === 'vat' ? 'VAT' : 'GST';
          const taxRate =
            categoryCalc.taxType === 'gst'
              ? categoryCalc.gstRate
              : categoryCalc.vatRate;

          const displayText = `${categoryName} ${taxTypeLabel}${
            taxRate ? ` (${taxRate}%)` : ''
          }:`;
          doc.text(displayText, MARGIN, y);
          const amountText = formatCurrency(categoryCalc.totalTaxAmount);
          const amountWidth = doc.getTextWidth(amountText);
          doc.text(amountText, THERMAL_WIDTH - MARGIN - amountWidth, y);
          y += LINE_HEIGHT;
        });

        // Show GST breakdown if GST items exist
        if (
          (billData.totalGstAmount || 0) > 0 &&
          (billData.cgstAmount > 0 ||
            billData.sgstAmount > 0 ||
            billData.igstAmount > 0)
        ) {
          y += 1; // Small gap
          doc.text('GST Breakdown:', MARGIN, y);
          y += LINE_HEIGHT;

          if (billData.cgstAmount > 0) {
            doc.text('  CGST:', MARGIN, y);
            const cgstText = formatCurrency(billData.cgstAmount);
            const cgstWidth = doc.getTextWidth(cgstText);
            doc.text(cgstText, THERMAL_WIDTH - MARGIN - cgstWidth, y);
            y += LINE_HEIGHT;
          }

          if (billData.sgstAmount > 0) {
            doc.text('  SGST:', MARGIN, y);
            const sgstText = formatCurrency(billData.sgstAmount);
            const sgstWidth = doc.getTextWidth(sgstText);
            doc.text(sgstText, THERMAL_WIDTH - MARGIN - sgstWidth, y);
            y += LINE_HEIGHT;
          }

          if (billData.igstAmount > 0) {
            doc.text('  IGST:', MARGIN, y);
            const igstText = formatCurrency(billData.igstAmount);
            const igstWidth = doc.getTextWidth(igstText);
            doc.text(igstText, THERMAL_WIDTH - MARGIN - igstWidth, y);
            y += LINE_HEIGHT;
          }
        }

        // Show VAT breakdown if VAT items exist
        if ((billData.totalVatAmount || 0) > 0) {
          y += 1; // Small gap
          doc.text('State VAT (Alcohol):', MARGIN, y);
          const vatText = formatCurrency(billData.totalVatAmount || 0);
          const vatWidth = doc.getTextWidth(vatText);
          doc.text(vatText, THERMAL_WIDTH - MARGIN - vatWidth, y);
          y += LINE_HEIGHT;
        }
      } else {
        // Original simple GST breakdown for backward compatibility
        if (billData.cgstAmount > 0) {
          doc.text('CGST:', MARGIN, y);
          const cgstText = formatCurrency(billData.cgstAmount);
          const cgstWidth = doc.getTextWidth(cgstText);
          doc.text(cgstText, THERMAL_WIDTH - MARGIN - cgstWidth, y);
          y += LINE_HEIGHT;
        }

        if (billData.sgstAmount > 0) {
          doc.text('SGST:', MARGIN, y);
          const sgstText = formatCurrency(billData.sgstAmount);
          const sgstWidth = doc.getTextWidth(sgstText);
          doc.text(sgstText, THERMAL_WIDTH - MARGIN - sgstWidth, y);
          y += LINE_HEIGHT;
        }

        if (billData.igstAmount > 0) {
          doc.text('IGST:', MARGIN, y);
          const igstText = formatCurrency(billData.igstAmount);
          const igstWidth = doc.getTextWidth(igstText);
          doc.text(igstText, THERMAL_WIDTH - MARGIN - igstWidth, y);
          y += LINE_HEIGHT;
        }
      }

      // Total tax - always show
      y += 1; // Small gap before total
      doc.text('Total Tax:', MARGIN, y);
      const taxText = formatCurrency(billData.taxAmount);
      const taxWidth = doc.getTextWidth(taxText);
      doc.text(taxText, THERMAL_WIDTH - MARGIN - taxWidth, y);
      y += LINE_HEIGHT;
    }

    // Discount if any
    if (billData.discountAmount > 0) {
      doc.text('Discount:', MARGIN, y);
      const discountText = `- ${formatCurrency(billData.discountAmount)}`;
      const discountWidth = doc.getTextWidth(discountText);
      doc.text(discountText, THERMAL_WIDTH - MARGIN - discountWidth, y);
      y += LINE_HEIGHT;
    }

    // Round off if any
    if (billData.roundOffAmount !== 0) {
      doc.text('Round Off:', MARGIN, y);
      const roundOffText = `${
        billData.roundOffAmount >= 0 ? '+' : ''
      }${formatCurrency(billData.roundOffAmount)}`;
      const roundOffWidth = doc.getTextWidth(roundOffText);
      doc.text(roundOffText, THERMAL_WIDTH - MARGIN - roundOffWidth, y);
      y += LINE_HEIGHT;
    }

    addSeparator();

    // Grand Total
    doc.setFontSize(9);
    doc.text('TOTAL:', MARGIN, y);
    const totalText = formatCurrency(billData.totalAmount);
    const totalWidth = doc.getTextWidth(totalText);
    doc.text(totalText, THERMAL_WIDTH - MARGIN - totalWidth, y);
    y += LINE_HEIGHT + 1;

    addSeparator();

    // Payment Details
    addLine('PAYMENT DETAILS', 8, 'center');
    addSeparator();

    doc.setFontSize(7);
    doc.text('Method:', MARGIN, y);
    doc.text(
      paymentMethod,
      THERMAL_WIDTH - MARGIN - doc.getTextWidth(paymentMethod),
      y
    );
    y += LINE_HEIGHT;

    if (paymentMethod.toLowerCase() === 'cash' && cashReceived) {
      doc.text('Cash Received:', MARGIN, y);
      const cashText = formatCurrency(cashReceived);
      doc.text(
        cashText,
        THERMAL_WIDTH - MARGIN - doc.getTextWidth(cashText),
        y
      );
      y += LINE_HEIGHT;

      if (changeGiven && changeGiven > 0) {
        doc.text('Change Given:', MARGIN, y);
        const changeText = formatCurrency(changeGiven);
        doc.text(
          changeText,
          THERMAL_WIDTH - MARGIN - doc.getTextWidth(changeText),
          y
        );
        y += LINE_HEIGHT;
      }
    }

    if (billData.paidAmount > 0) {
      doc.text('Paid Amount:', MARGIN, y);
      const paidText = formatCurrency(billData.paidAmount);
      doc.text(
        paidText,
        THERMAL_WIDTH - MARGIN - doc.getTextWidth(paidText),
        y
      );
      y += LINE_HEIGHT;
    }

    if (billData.pendingAmount > 0) {
      doc.text('Pending:', MARGIN, y);
      const pendingText = formatCurrency(billData.pendingAmount);
      doc.text(
        pendingText,
        THERMAL_WIDTH - MARGIN - doc.getTextWidth(pendingText),
        y
      );
      y += LINE_HEIGHT;
    }

    y += 3; // Extra space

    addSeparator();

    // Footer
    addLine('Thank you for dining with us!', 7, 'center');
    addLine('Please visit again', 6, 'center');

    y += 2;
    addLine('** This is a computer generated receipt **', 5, 'center');

    // Adjust PDF height based on content
    const finalHeight = y + MARGIN;
    const pdfBlob = doc.output('blob');

    resolve(pdfBlob);
  });
}

// Utility function to download the thermal receipt
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
