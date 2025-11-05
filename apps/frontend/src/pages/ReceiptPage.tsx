import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Download,
  Receipt,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  PrinterIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface OrderItem {
  name: string;
  quantity: number;
  pricing: {
    unitAmount: number;
    currency: string;
    taxAmount: number;
  };
  gst?: {
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
  };
}

interface OrderData {
  id: string;
  orderNumber: string;
  restaurantId: string;
  tableNumber?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  restaurant: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gst?: {
      gstin?: string;
    };
  };
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

export default function ReceiptPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!orderNumber) {
        setError('Order number is required');
        setLoading(false);
        return;
      }

      try {
        // Since this is a public route, we need to create a public API endpoint
        // For now, we'll show a placeholder
        setError('Receipt lookup is coming soon. Use order number: ' + orderNumber);
        setLoading(false);

        // TODO: Implement actual API call
        // const response = await fetch(`/api/public/receipts/${orderNumber}`);
        // if (!response.ok) throw new Error('Receipt not found');
        // const data = await response.json();
        // setOrderData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderNumber]);

  const handleDownloadPDF = () => {
    toast({
      title: 'PDF Download',
      description: 'PDF download feature coming soon!',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto mt-20">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-xl font-semibold mb-2">Receipt Not Found</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/receipts')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lookup
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto mt-20">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="text-4xl mb-4">❌</div>
              <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-4">
                Order #{orderNumber} could not be found.
              </p>
              <Button onClick={() => navigate('/receipts')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lookup
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 print:p-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Header with actions - hide on print */}
        <div className="flex items-center justify-between print:hidden">
          <Button
            variant="ghost"
            onClick={() => navigate('/receipts')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lookup
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <PrinterIcon className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Receipt Content */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Receipt className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Receipt</CardTitle>
            </div>

            {/* Restaurant Info */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-primary">
                {orderData.restaurant.name}
              </h2>
              {orderData.restaurant.address && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {orderData.restaurant.address}
                </p>
              )}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                {orderData.restaurant.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {orderData.restaurant.phone}
                  </span>
                )}
                {orderData.restaurant.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {orderData.restaurant.email}
                  </span>
                )}
              </div>
              {orderData.restaurant.gst?.gstin && (
                <p className="text-xs text-muted-foreground">
                  GSTIN: {orderData.restaurant.gst.gstin}
                </p>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Order Details */}
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">Order #{orderData.orderNumber}</p>
                {orderData.tableNumber && (
                  <p className="text-sm text-muted-foreground">
                    Table {orderData.tableNumber}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDate(orderData.createdAt)}
                  </span>
                </div>
                <Badge
                  variant={orderData.paymentStatus === 'paid' ? 'default' : 'destructive'}
                  className="mt-1"
                >
                  {orderData.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-1">Order Items</h3>

              {orderData.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.pricing.unitAmount)} × {item.quantity}
                    </p>
                    {item.gst && item.gst.gstRate > 0 && (
                      <p className="text-xs text-muted-foreground">
                        GST ({item.gst.gstRate}%): {formatCurrency(
                          (item.gst.cgstAmount || 0) +
                          (item.gst.sgstAmount || 0) +
                          (item.gst.igstAmount || 0)
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(item.pricing.unitAmount * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-primary">
                  {formatCurrency(orderData.totalAmount)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Thank you for dining with us!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Powered by RestoHand
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}