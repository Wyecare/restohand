import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class PoEmailService {
  private readonly logger = new Logger(PoEmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPurchaseOrderToSupplier(params: {
    supplierEmail: string;
    supplierName: string;
    supplierContact?: string;
    poNumber: string;
    restaurantName: string;
    branchName: string;
    totalAmount: number;
    itemCount: number;
    expectedDeliveryDate?: string;
    notes?: string;
    pdfBuffer: Buffer;
  }): Promise<void> {
    const {
      supplierEmail,
      supplierName,
      supplierContact,
      poNumber,
      restaurantName,
      branchName,
      totalAmount,
      itemCount,
      expectedDeliveryDate,
      notes,
      pdfBuffer,
    } = params;

    const fmt = (n: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; font-size: 14px; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #111827; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #9ca3af; }
    .body { padding: 28px 32px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .po-box { background: #f3f4f6; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .po-box table { width: 100%; border-collapse: collapse; }
    .po-box td { padding: 6px 0; font-size: 13px; }
    .po-box td:first-child { color: #6b7280; width: 160px; }
    .po-box td:last-child { font-weight: 600; color: #111827; }
    .amount { font-size: 20px; font-weight: 700; color: #111827; margin: 4px 0 0; }
    .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; font-size: 13px; margin: 20px 0; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .btn { display: inline-block; background: #111827; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${restaurantName}</h1>
    <p>Purchase Order — ${poNumber}</p>
  </div>
  <div class="body">
    <div class="greeting">
      Dear ${supplierContact || supplierName},
    </div>
    <p>
      Please find attached our Purchase Order <strong>${poNumber}</strong> from <strong>${branchName}</strong>.
      Kindly review and confirm your ability to fulfill this order at your earliest convenience.
    </p>
    <div class="po-box">
      <table>
        <tr><td>PO Number</td><td>${poNumber}</td></tr>
        <tr><td>From Branch</td><td>${branchName}</td></tr>
        <tr><td>Total Items</td><td>${itemCount} line item${itemCount !== 1 ? 's' : ''}</td></tr>
        ${expectedDeliveryDate ? `<tr><td>Expected Delivery</td><td>${expectedDeliveryDate}</td></tr>` : ''}
        <tr><td>Order Value</td><td class="amount">${fmt(totalAmount)}</td></tr>
      </table>
    </div>
    ${notes ? `<div class="note"><strong>Notes from buyer:</strong><br/>${notes}</div>` : ''}
    <p>The full Purchase Order PDF is attached to this email. Please reply with your confirmation or contact us if you have any questions.</p>
  </div>
  <div class="footer">
    This purchase order was sent by ${restaurantName} · ${branchName}<br/>
    Please do not reply to this automated email — contact us directly for any queries.
  </div>
</div>
</body>
</html>`;

    await this.transporter.sendMail({
      from: `"${restaurantName}" <${process.env.SMTP_USER}>`,
      to: supplierEmail,
      subject: `Purchase Order ${poNumber} from ${restaurantName}`,
      html,
      attachments: [
        {
          filename: `${poNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    this.logger.log(`Purchase order ${poNumber} emailed to ${supplierEmail}`);
  }

  async sendInvoiceReceiptToSupplier(params: {
    supplierEmail: string;
    supplierName: string;
    supplierContact?: string;
    poNumber: string;
    invoiceNumber: string;
    invoiceAmount: number;
    paidAmount: number;
    paymentStatus: string;
    branchName: string;
    pdfBuffer: Buffer;
  }): Promise<void> {
    const {
      supplierEmail, supplierName, supplierContact, poNumber,
      invoiceNumber, invoiceAmount, paidAmount, paymentStatus, branchName, pdfBuffer,
    } = params;

    const fmt = (n: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

    const statusColors: Record<string, string> = {
      paid: '#16a34a', partial: '#d97706', unpaid: '#dc2626',
    };
    const statusColor = statusColors[paymentStatus] ?? '#6b7280';
    const outstanding = Math.max(0, invoiceAmount - paidAmount);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; font-size: 14px; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #15803d; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #bbf7d0; }
    .body { padding: 28px 32px; }
    .inv-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .inv-box table { width: 100%; border-collapse: collapse; }
    .inv-box td { padding: 6px 0; font-size: 13px; }
    .inv-box td:first-child { color: #6b7280; width: 160px; }
    .inv-box td:last-child { font-weight: 600; color: #111827; }
    .status-badge { display: inline-block; padding: 3px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40; }
    .amount { font-size: 20px; font-weight: 700; color: #15803d; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${branchName}</h1>
    <p>Invoice Receipt — ${invoiceNumber} (PO: ${poNumber})</p>
  </div>
  <div class="body">
    <p>Dear ${supplierContact || supplierName},</p>
    <p style="margin-top:12px">
      This is an acknowledgment that we have received and processed your invoice
      <strong>${invoiceNumber}</strong> against Purchase Order <strong>${poNumber}</strong>.
    </p>
    <div class="inv-box">
      <table>
        <tr><td>Purchase Order</td><td>${poNumber}</td></tr>
        <tr><td>Invoice Number</td><td>${invoiceNumber}</td></tr>
        <tr><td>Invoice Amount</td><td class="amount">${fmt(invoiceAmount)}</td></tr>
        ${paidAmount > 0 ? `<tr><td>Amount Paid</td><td style="color:#15803d;font-weight:700">${fmt(paidAmount)}</td></tr>` : ''}
        ${outstanding > 0 ? `<tr><td>Outstanding</td><td style="color:#dc2626;font-weight:700">${fmt(outstanding)}</td></tr>` : ''}
        <tr><td>Payment Status</td><td><span class="status-badge">${paymentStatus}</span></td></tr>
      </table>
    </div>
    <p>The invoice receipt PDF is attached for your records.</p>
    ${outstanding > 0
      ? `<p style="margin-top:12px;color:#92400e;background:#fffbeb;padding:12px;border-radius:6px;font-size:13px">
          <strong>Note:</strong> An outstanding balance of <strong>${fmt(outstanding)}</strong> remains. We will process the payment as per the agreed terms.
        </p>`
      : `<p style="margin-top:12px;color:#15803d;background:#f0fdf4;padding:12px;border-radius:6px;font-size:13px">
          <strong>Payment completed.</strong> Thank you for your service. This invoice has been fully settled.
        </p>`
    }
  </div>
  <div class="footer">
    This acknowledgment was sent by ${branchName}. Please retain this for your records.
  </div>
</div>
</body>
</html>`;

    await this.transporter.sendMail({
      from: `"${branchName}" <${process.env.SMTP_USER}>`,
      to: supplierEmail,
      subject: `Invoice Receipt: ${invoiceNumber} — PO ${poNumber}`,
      html,
      attachments: [
        {
          filename: `Invoice-Receipt-${poNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    this.logger.log(`Invoice receipt ${invoiceNumber} emailed to ${supplierEmail}`);
  }
}
