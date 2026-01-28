import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Receipt, PrintableReceipt } from './Receipt';
import { Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Order } from '@/store/api/types';

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  restaurantInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
  };
}

export function ReceiptDialog({
  open,
  onOpenChange,
  order,
  restaurantInfo,
}: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !order) return;

    try {
      // Create an isolated iframe to completely bypass global CSS
      const iframe = document.createElement('iframe');
      iframe.style.cssText =
        'position: absolute; left: -9999px; top: 0; width: 480px; height: 1px; border: none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; font-family: monospace; }
              body { background: #ffffff; color: #000000; font-size: 14px; line-height: 1.5; }
            </style>
          </head>
          <body></body>
        </html>
      `);
      iframeDoc.close();

      // Build receipt HTML with inline styles only
      const subtotal = order?.subTotalAmount ?? order?.totalAmount ?? 0;
      const cgst = order?.cgstAmount ?? 0;
      const sgst = order?.sgstAmount ?? 0;
      const igst = order?.igstAmount ?? 0;
      const discount = order?.discountAmount ?? 0;
      const roundOff = order?.roundOffAmount ?? 0;

      const container = iframeDoc.createElement('div');
      container.style.cssText = `
        width: 450px;
        height: auto;
        background-color: #ffffff;
        font-family: monospace;
        font-size: 15px;
        line-height: 1.6;
        color: #000000;
        padding: 24px;
        box-sizing: border-box;
      `;

      container.innerHTML = `
        <!-- Header -->
        <div style="text-align: center; border-bottom: 1px dashed #666666; padding-bottom: 16px; margin-bottom: 16px;">
          <h1 style="font-size: 22px; font-weight: bold; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
            ${restaurantInfo?.name || 'Restaurant'}
          </h1>
          ${
            restaurantInfo?.address
              ? `<p style="font-size: 14px; margin: 6px 0; color: #555;">${restaurantInfo.address}</p>`
              : ''
          }
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 12px;">
            ${
              restaurantInfo?.phone
                ? `<span>Ph: ${restaurantInfo.phone}</span>`
                : ''
            }
            ${
              restaurantInfo?.email
                ? `<span>${restaurantInfo.email}</span>`
                : ''
            }
          </div>
          ${
            restaurantInfo?.gstNumber
              ? `<p style="font-size: 13px; margin: 8px 0;">GST: ${restaurantInfo.gstNumber}</p>`
              : ''
          }
        </div>

        <!-- Order Info -->
        <div style="border-bottom: 1px dashed #666666; padding-bottom: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">Bill No:</span>
            <span style="font-weight: bold; font-size: 14px;">#${
              order.orderNumber
            }</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">Date:</span>
            <span style="font-size: 14px;">${new Date(
              order.createdAt
            ).toLocaleDateString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">Time:</span>
            <span style="font-size: 14px;">${new Date(
              order.createdAt
            ).toLocaleTimeString('en-IN')}</span>
          </div>
          ${
            order.tableNumber
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">Table:</span>
            <span style="font-size: 14px;">${order.tableNumber}</span>
          </div>`
              : ''
          }
          <div style="display: flex; justify-content: space-between; padding: 0 4px;">
            <span style="font-size: 14px;">Mode:</span>
            <span style="text-transform: uppercase; font-size: 14px; font-weight: bold;">${
              order.paymentMethod
            }</span>
          </div>
        </div>

        <!-- Items -->
        <div style="border-bottom: 1px dashed #666666; padding-bottom: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 12px; padding: 0 4px; background-color: #f8f8f8; padding: 8px 4px;">
            <span style="font-size: 15px;">Item</span>
            <span style="font-size: 15px;">Qty</span>
            <span style="font-size: 15px;">Amount</span>
          </div>
          ${order.items
            .map(
              (item) => `
          <div style="margin-bottom: 12px; padding: 0 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="flex: 1; margin-right: 12px; font-size: 14px; line-height: 1.4;">${
                item.name
              }</span>
              <span style="width: 40px; text-align: center; font-size: 14px; font-weight: bold;">${
                item.quantity
              }</span>
              <span style="width: 80px; text-align: right; font-size: 14px; font-weight: bold;">₹${(
                item.pricing.unitAmount * item.quantity
              ).toFixed(0)}</span>
            </div>
            <div style="font-size: 13px; color: #666666; margin-left: 4px; margin-top: 2px;">
              @ ₹${item.pricing.unitAmount.toFixed(0)} each
            </div>
          </div>
          `
            )
            .join('')}
        </div>

        <!-- Bill Summary -->
        <div style="border-bottom: 1px dashed #666666; padding-bottom: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">Subtotal:</span>
            <span style="font-size: 14px; font-weight: bold;">₹${subtotal.toFixed(
              0
            )}</span>
          </div>

          ${
            cgst > 0
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">CGST (2.5%):</span>
            <span style="font-size: 14px; font-weight: bold;">₹${cgst.toFixed(
              0
            )}</span>
          </div>`
              : ''
          }

          ${
            sgst > 0
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">SGST (2.5%):</span>
            <span style="font-size: 14px; font-weight: bold;">₹${sgst.toFixed(
              0
            )}</span>
          </div>`
              : ''
          }

          ${
            igst > 0
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">IGST (5%):</span>
            <span style="font-size: 14px; font-weight: bold;">₹${igst.toFixed(
              0
            )}</span>
          </div>`
              : ''
          }

          ${
            discount > 0
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px; color: #16a34a;">
            <span style="font-size: 14px;">Discount:</span>
            <span style="font-size: 14px; font-weight: bold;">-₹${discount.toFixed(
              0
            )}</span>
          </div>`
              : ''
          }

          ${
            Math.abs(roundOff) > 0.004
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
            <span style="font-size: 14px;">Round Off:</span>
            <span style="font-size: 14px; font-weight: bold;">₹${roundOff.toFixed(
              2
            )}</span>
          </div>`
              : ''
          }
        </div>

        <!-- Total -->
        <div style="border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 20px; background-color: #f9f9f9; padding: 12px 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
            <span>TOTAL:</span>
            <span>₹${order.totalAmount.toFixed(0)}</span>
          </div>
          <div style="font-size: 13px; text-align: center; margin-top: 8px; color: #666666; font-style: italic;">
            ${
              order.taxType === 'inter-state'
                ? 'Interstate (IGST)'
                : 'Intrastate (CGST + SGST)'
            }
            • Inclusive of all taxes
          </div>
        </div>

        <!-- Payment Status -->
        <div style="border-bottom: 1px dashed #666666; padding-bottom: 12px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Payment Status:</span>
            <span style="font-weight: bold; text-transform: uppercase; color: ${
              order.paymentStatus === 'paid' ? '#16a34a' : '#dc2626'
            };">
              ${order.paymentStatus}
            </span>
          </div>
          ${
            order.paidAt
              ? `
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
            <span>Paid At:</span>
            <span>${new Date(order.paidAt).toLocaleString('en-IN')}</span>
          </div>`
              : ''
          }
        </div>

        <!-- Footer -->
        <div style="text-align: center; font-size: 12px;">
          <p style="margin: 8px 0;">Thank you for dining with us!</p>
          <p style="margin: 4px 0;">Visit us again soon</p>
          <div style="border-top: 1px dashed #666666; padding-top: 8px; margin-top: 12px;">
            <p style="margin: 4px 0;">Powered by Restohand</p>
            <p style="margin: 4px 0;">www.restohand.com</p>
          </div>
        </div>
      `;

      iframeDoc.body.appendChild(container);

      // Now capture using html2canvas from the isolated iframe
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: 450,
        height: container.scrollHeight,
        useCORS: true,
        allowTaint: false,
      });

      // Clean up the iframe
      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [120, canvas.height * 0.264583], // Increased width for better readability
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 120, canvas.height * 0.264583);
      pdf.save(`receipt-${order.orderNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Receipt #{order.orderNumber}
            </DialogTitle>
          </DialogHeader>

          <div ref={receiptRef} className="my-4">
            <Receipt order={order} restaurantInfo={restaurantInfo} />
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintableReceipt order={order} restaurantInfo={restaurantInfo} />
    </>
  );
}
