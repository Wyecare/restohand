import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BillBreakdown } from '@/components/customer/BillBreakdown';
import {
  Receipt,
  User,
  Calendar,
  Hash,
  MapPin,
  Phone,
  Download,
  Printer,
} from 'lucide-react';
import { useGetOrderQuery, useGetAdminConsolidatedBillQuery } from '@/store/api/ordersApi';
import {
  BillBreakdown as BillBreakdownType,
  formatCurrency,
} from '@/lib/billing';
import { useToast } from '@/components/ui/use-toast';

interface ReceiptInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  restaurantId: string;
}

export const ReceiptInvoice = ({
  isOpen,
  onClose,
  orderId,
  restaurantId,
}: ReceiptInvoiceProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  // Get order details first to get restaurant slug and table info
  const {
    data: orderData,
    isLoading: orderLoading,
    error: orderError,
  } = useGetOrderQuery(
    {
      restaurantId,
      orderId,
    },
    {
      skip: !orderId || !restaurantId || !isOpen,
    }
  );

  // Get consolidated bill using admin endpoint with restaurantId and tableId
  const {
    data: consolidatedBillData,
    isLoading: billLoading,
    error: billError,
  } = useGetAdminConsolidatedBillQuery(
    {
      restaurantId,
      tableId: orderData?.tableNumber || '',
    },
    {
      skip: !restaurantId || !orderData?.tableNumber || !isOpen,
    }
  );

  const isLoading = billLoading || orderLoading;
  const error = billError || orderError;

  // Use consolidated bill data
  const billData = consolidatedBillData?.bill;
  const restaurantInfo = consolidatedBillData?.restaurant;

  // Convert backend bill data to frontend BillBreakdown format
  const getBillBreakdown = (): BillBreakdownType | null => {
    if (!billData) return null;

    return {
      subtotal: billData.subtotal || 0,
      cgst: billData.cgstAmount || 0,
      sgst: billData.sgstAmount || 0,
      igst: billData.igstAmount || 0,
      serviceCharge: 0,
      packagingFee: 0,
      platformFee: 0,
      deliveryFee: 0,
      discount: 0,
      total: billData.totalAmount || 0,
      savings: 0,
    };
  };

  const handleDownloadPDF = async () => {
    if (!billData || !orderData) return;

    setIsDownloading(true);
    try {
      // Create a printable version
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        const invoiceHTML = generateInvoiceHTML();
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }

      toast({
        title: 'Receipt Generated',
        description: 'Receipt has been opened for printing/saving as PDF',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate receipt PDF',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const generateInvoiceHTML = () => {
    if (!billData || !orderData) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - Table ${billData.tableNumber} Bill</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
          .order-info { margin: 20px 0; }
          .order-info div { margin: 5px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items-table th { background-color: #f2f2f2; }
          .totals { margin-top: 20px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total-final { font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          .text-right { text-align: right; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TAX INVOICE</h1>
          <h2>Table ${billData.tableNumber} - Consolidated Bill</h2>
        </div>

        <div class="order-info">
          <div><strong>Date:</strong> ${new Date(billData.billGeneratedAt).toLocaleString()}</div>
          <div><strong>Table:</strong> ${billData.tableNumber || 'N/A'}</div>
          <div><strong>Customer:</strong> Guest Customer</div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Tax</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${billData.orders?.map(order =>
              order.items?.map(item => {
                const lineTotal = item.lineTotal || (item.unitPrice * item.quantity);
                return `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unitPrice.toFixed(2)}</td>
                    <td>₹0.00</td>
                    <td class="text-right">₹${lineTotal.toFixed(2)}</td>
                  </tr>
                `;
              }).join('') || ''
            ).join('') || ''}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${(billData.subtotal || 0).toFixed(2)}</span>
          </div>
          ${billData.cgstAmount > 0 ? `
            <div class="total-row">
              <span>CGST (2.5%):</span>
              <span>₹${billData.cgstAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${billData.sgstAmount > 0 ? `
            <div class="total-row">
              <span>SGST (2.5%):</span>
              <span>₹${billData.sgstAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${billData.igstAmount > 0 ? `
            <div class="total-row">
              <span>IGST (5%):</span>
              <span>₹${billData.igstAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${billData.roundOffAmount ? `
            <div class="total-row">
              <span>Round Off:</span>
              <span>₹${billData.roundOffAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row total-final">
            <span>Total Amount:</span>
            <span>₹${billData.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  const breakdown = getBillBreakdown();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[70vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice - Order #{billData?.orderNumber || orderId}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2">Loading invoice details...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Unable to Load Invoice
            </h3>
            <p className="text-gray-600">
              There was an error loading the invoice details.
            </p>
          </div>
        )}

        {billData && orderData && breakdown && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">TAX INVOICE</h2>
                <p className="text-sm text-gray-600">
                  Generated on {new Date().toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">Table {billData.tableNumber}</div>
                <Badge variant="default">
                  CONSOLIDATED BILL
                </Badge>
              </div>
            </div>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Date:</span>
                    <span className="text-sm">
                      {new Date(billData.billGeneratedAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Table:</span>
                    <span className="text-sm">{billData.tableNumber}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="text-sm">Guest Customer</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Items Ordered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billData.orders?.map((order, orderIndex) => (
                    <div key={orderIndex} className="border rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2">Order #{order.orderNumber}</div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 text-xs">Item</th>
                              <th className="text-center py-2 text-xs">Qty</th>
                              <th className="text-right py-2 text-xs">Unit Price</th>
                              <th className="text-right py-2 text-xs">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items?.map((item, itemIndex) => (
                              <tr key={itemIndex} className="border-b last:border-b-0">
                                <td className="py-2 font-medium text-sm">{item.name}</td>
                                <td className="py-2 text-center text-sm">{item.quantity}</td>
                                <td className="py-2 text-right text-sm">
                                  {formatCurrency(item.unitPrice)}
                                </td>
                                <td className="py-2 text-right font-medium text-sm">
                                  {formatCurrency(item.lineTotal || (item.unitPrice * item.quantity))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-right mt-2 text-sm font-semibold">
                        Order Total: {formatCurrency(order.orderTotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bill Breakdown using the same component as customer frontend */}
            <Card>
              <CardContent className="pt-6">
                <BillBreakdown
                  breakdown={breakdown}
                  itemCount={billData.orders?.reduce((sum, order) =>
                    sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0) || 0}
                  isDetailed={true}
                  className="border-0 p-0"
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end border-t pt-4">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2"
              >
                {isDownloading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </Button>

              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};