import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  QrCode,
  Banknote,
  CreditCard,
  CheckCircle,
  Clock,
  Copy,
  Smartphone,
  Download,
  Receipt,
} from 'lucide-react';
import type { Order, Restaurant } from '@/store/api/types';
import QRCode from 'qrcode';

interface PaymentInterfaceProps {
  order: Order;
  restaurant: Restaurant | undefined;
  onBack: () => void;
  onMarkAsPaid: (orderId: string, method: 'cash' | 'upi') => Promise<void>;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export default function PaymentInterface({
  order,
  restaurant,
  onBack,
  onMarkAsPaid,
}: PaymentInterfaceProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [receiptQrCodeDataUrl, setReceiptQrCodeDataUrl] = useState<string>('');

  // Generate UPI QR code
  const upiString = useMemo(() => {
    if (!restaurant?.upi?.vpa) return '';

    const amount = order.totalAmount.toFixed(2);
    const params = new URLSearchParams({
      pa: restaurant.upi.vpa,
      pn: restaurant.upi.displayName || restaurant.name,
      am: amount,
      cu: 'INR',
      tn: `Order ${order.orderNumber}`,
    });

    return `upi://pay?${params.toString()}`;
  }, [restaurant, order]);

  // Generate QR code image
  useMemo(async () => {
    if (upiString) {
      try {
        const qrData = await QRCode.toDataURL(upiString, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrCodeDataUrl(qrData);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }
  }, [upiString]);

  // Generate customer receipt URL and QR code
  const receiptUrl = useMemo(() => {
    if (order.paymentStatus === 'paid') {
      return `${window.location.origin}/receipts/${order.orderNumber}`;
    }
    return '';
  }, [order.orderNumber, order.paymentStatus]);

  // Generate receipt QR code
  useMemo(async () => {
    if (receiptUrl) {
      try {
        const qrData = await QRCode.toDataURL(receiptUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setReceiptQrCodeDataUrl(qrData);
      } catch (error) {
        console.error('Failed to generate receipt QR code:', error);
      }
    }
  }, [receiptUrl]);

  const handleCopyUPI = async () => {
    if (!restaurant?.upi?.vpa) return;

    try {
      await navigator.clipboard.writeText(restaurant.upi.vpa);
      toast({
        title: 'UPI ID copied! 📋',
        description: 'Customer can use this for manual payment',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Please share UPI ID manually',
        variant: 'destructive',
      });
    }
  };

  const handleMarkPaid = async () => {
    setIsProcessing(true);
    try {
      await onMarkAsPaid(order._id, paymentMethod);
    } finally {
      setIsProcessing(false);
    }
  };

  const getOrderStatusInfo = () => {
    if (order.paymentStatus === 'paid') {
      return {
        icon: <CheckCircle className="h-6 w-6 text-green-500" />,
        text: 'Payment Complete',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
      };
    }

    return {
      icon: <Clock className="h-6 w-6 text-orange-500" />,
      text: 'Payment Pending',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
    };
  };

  const statusInfo = getOrderStatusInfo();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Payment</h1>
            <p className="text-sm text-muted-foreground">
              Order #{order.orderNumber}
            </p>
          </div>
        </div>

        {/* Order Status */}
        <Card className={`border-2 ${statusInfo.bgColor}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {statusInfo.icon}
              <div className="flex-1">
                <p className={`font-semibold ${statusInfo.color}`}>
                  {statusInfo.text}
                </p>
                <p className="text-sm text-muted-foreground">
                  Table {order.tableNumber} •{' '}
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
              <Badge
                variant={
                  order.paymentStatus === 'paid' ? 'default' : 'destructive'
                }
              >
                {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Customer Receipt QR Code - Show when paid */}
        {order.paymentStatus === 'paid' && receiptQrCodeDataUrl && (
          <Card className="border-2 bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Receipt className="h-5 w-5" />
                Customer Receipt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-3">
                <p className="text-sm text-green-600 font-medium">
                  Payment Complete! Show this QR code to customer
                </p>

                {/* Receipt QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-md border-2 border-green-200">
                    <img
                      src={receiptQrCodeDataUrl}
                      alt="Receipt QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700">
                    Scan to view & download receipt
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Customer can scan this QR code to view order details and
                    download PDF receipt
                  </p>
                </div>

                {/* Receipt URL for manual access */}
                <div className="p-3 bg-white rounded-lg border border-green-200">
                  <p className="text-xs text-muted-foreground mb-1">
                    Or visit manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-green-700 break-all">
                      {receiptUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(receiptUrl);
                          toast({
                            title: 'Receipt URL copied! 📋',
                            description: 'Share this with customer',
                          });
                        } catch (error) {
                          toast({
                            title: 'Copy failed',
                            description: 'Please share URL manually',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods */}
        {order.paymentStatus !== 'paid' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choose Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                    className="h-16 flex-col gap-2"
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <Smartphone className="h-6 w-6" />
                    <span className="text-sm">UPI Payment</span>
                  </Button>
                  <Button
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    className="h-16 flex-col gap-2"
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Banknote className="h-6 w-6" />
                    <span className="text-sm">Cash Payment</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* UPI Payment Section */}
            {paymentMethod === 'upi' && restaurant?.upi?.vpa && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    UPI Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Code */}
                  {qrCodeDataUrl && (
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-xl shadow-md">
                        <img
                          src={qrCodeDataUrl}
                          alt="UPI QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                    </div>
                  )}

                  {/* UPI ID */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">UPI ID</p>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <code className="flex-1 text-sm font-mono">
                        {restaurant.upi.vpa}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCopyUPI}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Amount to pay
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Ask customer to scan QR code or use UPI ID
                    </p>
                    <p className="text-xs text-muted-foreground">
                      After payment confirmation, mark as paid below
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cash Payment Section */}
            {paymentMethod === 'cash' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Cash Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-4xl mb-2">💵</div>
                    <p className="text-lg font-semibold mb-1">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Collect cash from customer
                    </p>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      After collecting cash, mark as paid below
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mark as Paid Button */}
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold"
              onClick={handleMarkPaid}
              disabled={isProcessing}
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              {isProcessing
                ? 'Processing...'
                : `Mark as Paid (${paymentMethod.toUpperCase()})`}
            </Button>
          </>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ₹{item.pricing.unitAmount} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">
                  ₹{(item.pricing.unitAmount * item.quantity).toFixed(0)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Show order #{order.orderNumber} to kitchen staff if needed</p>
          <p>This screen will update automatically after payment</p>
        </div>
      </motion.div>
    </div>
  );
}
