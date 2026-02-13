import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BillBreakdown } from '@/components/customer/BillBreakdown';
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
import {
  useGetConsolidatedBillQuery,
  restaurantsApi,
} from '@/store/api/restaurantsApi';
import { BillBreakdown as BillBreakdownType, formatCurrency } from '@/lib/billing';



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
  const { slug, tableId } = useParams<{ slug: string; tableId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State for consolidated bill data
  const [consolidatedBillData, setConsolidatedBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConsolidatedBill = async () => {
      if (!slug || !tableId) {
        setError('Restaurant and table information are required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Use the same endpoint as the working customer interface
        const response = await fetch(`/api/public/restaurants/${slug}/table/${tableId}/consolidated-bill`);

        if (!response.ok) {
          throw new Error('Failed to load bill information');
        }

        const billData = await response.json();
        setConsolidatedBillData(billData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };

    fetchConsolidatedBill();
  }, [slug, tableId]);

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

  if (!consolidatedBillData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto mt-20">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="text-4xl mb-4">❌</div>
              <h2 className="text-xl font-semibold mb-2">Receipt Not Available</h2>
              <p className="text-muted-foreground mb-4">
                The receipt data could not be loaded.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { restaurant, bill } = consolidatedBillData as any;

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
                {restaurant.name}
              </h2>
              {restaurant.address && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {typeof restaurant.address === 'string' ? restaurant.address : restaurant.address.street}
                </p>
              )}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                {restaurant.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {restaurant.phone}
                  </span>
                )}
                {restaurant.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {restaurant.email}
                  </span>
                )}
              </div>
              {restaurant.gstin && (
                <p className="text-xs text-muted-foreground">
                  GSTIN: {restaurant.gstin}
                </p>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Order Details */}
            <div className="flex justify-between items-start">
              <div>
                {bill.orders?.length > 1 ? (
                  <div>
                    <p className="font-semibold">Combined Orders</p>
                    <p className="text-sm text-muted-foreground">
                      {bill.orders.map(order => order.orderNumber).join(', ')}
                    </p>
                  </div>
                ) : (
                  <p className="font-semibold">Order #{bill.orders?.[0]?.orderNumber || 'N/A'}</p>
                )}
                {bill.tableNumber && (
                  <p className="text-sm text-muted-foreground">
                    Table {bill.tableNumber}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDate(bill.orders?.[0]?.createdAt || bill.createdAt)}
                  </span>
                </div>
                <Badge
                  variant={bill.paymentStatus === 'paid' ? 'default' : 'destructive'}
                  className="mt-1"
                >
                  {bill.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="font-semibold border-b pb-1">Order Items</h3>

              {bill.items?.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No items found
                </p>
              )}
            </div>

            {/* Bill Breakdown - Thermal Receipt Style */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Sub Total</span>
                <span>{formatCurrency(bill.subTotal || 0)}</span>
              </div>

              {/* Tax Details */}
              {(bill.cgst > 0 || bill.sgst > 0 || bill.igst > 0) && (
                <>
                  {bill.cgst > 0 && (
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>CGST (2.5%)</span>
                      <span>{formatCurrency(bill.cgst)}</span>
                    </div>
                  )}
                  {bill.sgst > 0 && (
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>SGST (2.5%)</span>
                      <span>{formatCurrency(bill.sgst)}</span>
                    </div>
                  )}
                  {bill.igst > 0 && (
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>IGST (5%)</span>
                      <span>{formatCurrency(bill.igst)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Service Charges */}
              {bill.serviceCharge > 0 && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Service Charge</span>
                  <span>{formatCurrency(bill.serviceCharge)}</span>
                </div>
              )}

              {/* Other Fees */}
              {bill.packagingFee > 0 && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Packaging Fee</span>
                  <span>{formatCurrency(bill.packagingFee)}</span>
                </div>
              )}

              {bill.platformFee > 0 && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Platform Fee</span>
                  <span>{formatCurrency(bill.platformFee)}</span>
                </div>
              )}

              {bill.deliveryFee > 0 && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(bill.deliveryFee)}</span>
                </div>
              )}

              {/* Discount */}
              {bill.discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(bill.discountAmount)}</span>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-primary">
                    {formatCurrency(bill.total || 0)}
                  </span>
                </div>
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