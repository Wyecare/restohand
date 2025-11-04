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
  restaurantInfo
}: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: 320, // Thermal printer width
        height: receiptRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, canvas.height * 0.264583], // Convert pixels to mm
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 80, canvas.height * 0.264583);
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