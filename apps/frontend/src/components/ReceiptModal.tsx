import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Receipt, User, Calendar, Hash, DollarSign, MapPin, Phone } from 'lucide-react';
import { useGetReceiptDetailsByOrderIdQuery } from '@/store/api/ordersApi';

interface ReceiptDetails {
  receipt: {
    receiptNumber: string;
    restaurantId: string;
    orderIds: string[];
    tableNumber?: string;
    customerName?: string;
    customerPhone?: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    issuedAt: string;
    createdAt: string;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    createdBy?: {
      name: string;
      email: string;
      role: string;
    };
    createdAt: string;
    totalAmount: number;
  }>;
  staffInfo: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    action: string;
  };
  paymentHistory: Array<{
    timestamp: string;
    paymentStatus: string;
    paymentMethod: string;
    updatedBy?: {
      name: string;
      email: string;
      role: string;
    };
  }>;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  restaurantId: string;
}

export const ReceiptModal = ({ isOpen, onClose, orderId, restaurantId }: ReceiptModalProps) => {
  const {
    data: receiptData,
    isLoading,
    error,
  } = useGetReceiptDetailsByOrderIdQuery(
    {
      restaurantId,
      orderId,
    },
    {
      skip: !orderId || !restaurantId || !isOpen,
    }
  ) as { data: ReceiptDetails | undefined; isLoading: boolean; error: any };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt Details
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2">Loading receipt details...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Receipt Not Found</h3>
            <p className="text-gray-600">
              No receipt found for this order. The order may not have been paid yet.
            </p>
          </div>
        )}

        {receiptData && (
          <div className="space-y-6">
            {/* Receipt Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Receipt Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Receipt Number:</span>
                    <Badge variant="outline">{receiptData.receipt.receiptNumber}</Badge>
                  </div>

                  {receiptData.receipt.tableNumber && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Table:</span>
                      <span className="text-sm">{receiptData.receipt.tableNumber}</span>
                    </div>
                  )}

                  {receiptData.receipt.customerName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Customer:</span>
                      <span className="text-sm">{receiptData.receipt.customerName}</span>
                    </div>
                  )}

                  {receiptData.receipt.customerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm">{receiptData.receipt.customerPhone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Issued:</span>
                    <span className="text-sm">{new Date(receiptData.receipt.issuedAt).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Total:</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(receiptData.receipt.totalAmount)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Badge variant={receiptData.receipt.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                    {receiptData.receipt.paymentStatus.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{receiptData.receipt.paymentMethod.toUpperCase()}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Staff Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Staff Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {receiptData.staffInfo.name ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{receiptData.staffInfo.name}</span>
                        <Badge variant="outline">{receiptData.staffInfo.role}</Badge>
                      </div>
                      <div className="text-sm text-gray-600">{receiptData.staffInfo.email}</div>
                      <div className="text-sm text-green-600 font-medium">{receiptData.staffInfo.action}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      {receiptData.staffInfo.action}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Orders Included */}
            <Card>
              <CardHeader>
                <CardTitle>Orders Included ({receiptData.orders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {receiptData.orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.orderNumber}</span>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                        <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
                        {order.createdBy && (
                          <div>Created by: {order.createdBy.name} ({order.createdBy.role})</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Items Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Items Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {receiptData.receipt.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div className="flex-1">
                        <span className="font-medium">{item.name}</span>
                        <div className="text-sm text-gray-600">
                          @ {formatCurrency(item.unitPrice)} × {item.quantity}
                        </div>
                      </div>
                      <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}

                  <div className="pt-3 mt-3 border-t space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(receiptData.receipt.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (GST):</span>
                      <span>{formatCurrency(receiptData.receipt.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(receiptData.receipt.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};