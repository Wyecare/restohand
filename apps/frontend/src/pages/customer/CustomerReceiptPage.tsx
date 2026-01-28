import { useState } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Receipt } from '@/components/customer/Receipt';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Download, Star } from 'lucide-react';
import {
  useGetOrderPublicQuery,
  useGetCombinedReceiptPublicQuery,
} from '@/store/api/ordersApi';

const CustomerReceiptPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get('t'); // Using 't' for shorter URL

  const [feedback, setFeedback] = useState<{
    rating?: number;
    comment?: string;
  }>({});

  // Check if this is a combined receipt route
  const isCombinedReceipt = location.pathname === '/combined-receipt';

  // Get order data using public endpoint with token (single order)
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useGetOrderPublicQuery(
    { orderId: orderId!, token: token! },
    { skip: isCombinedReceipt || !orderId || !token }
  );

  // Get combined receipt data using public endpoint with token (multiple orders)
  const {
    data: combinedOrders,
    isLoading: combinedLoading,
    error: combinedError,
  } = useGetCombinedReceiptPublicQuery(
    { token: token! },
    { skip: !isCombinedReceipt || !token }
  );

  const isLoading = isCombinedReceipt ? combinedLoading : orderLoading;
  const error = isCombinedReceipt ? combinedError : orderError;
  const orders = isCombinedReceipt ? combinedOrders : order ? [order] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Loading your receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !orders || orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-6">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Receipt Not Found
          </h1>
          <p className="text-gray-600 max-w-md">
            We couldn't find your receipt. The link may be expired or invalid.
          </p>
          <p className="text-sm text-gray-500">
            Please ask your waiter for a new receipt QR code.
          </p>
        </div>
      </div>
    );
  }

  // Extract restaurant info from first order (basic info only)
  const restaurantInfo = orders[0]
    ? {
        name: 'Restaurant', // Restaurant name not available in order response
        address: undefined, // Restaurant address not included in order response
        phone: undefined, // Restaurant contact not included in order response
        email: undefined, // Restaurant email not included in order response
        gstNumber: undefined, // Restaurant GST not included in order response
      }
    : undefined;

  const handleSubmitFeedback = async () => {
    // TODO: Implement feedback submission
    console.log('Submitting feedback:', feedback);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Receipt Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="receipt-content">
        {orders.length > 1 ? (
          // Combined receipt for multiple orders
          <div className="space-y-6">
            {/* Individual order receipts */}
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Order #{order.orderNumber}
                </h3>
                <Receipt order={order} restaurantInfo={restaurantInfo} />
              </div>
            ))}

            {/* Combined totals */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Total Bill
              </h3>
              <div className="space-y-2">
                {(() => {
                  const combinedSubtotal = orders.reduce((sum, order) => sum + (order.subTotalAmount || 0), 0);
                  const combinedTax = orders.reduce((sum, order) => sum + (order.taxAmount || 0), 0);
                  const combinedTotal = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

                  return (
                    <>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{combinedSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (GST):</span>
                        <span>₹{combinedTax.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 font-bold text-lg flex justify-between">
                        <span>Grand Total:</span>
                        <span>₹{combinedTotal.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          // Single order receipt
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <Receipt order={orders[0]} restaurantInfo={restaurantInfo} />
          </div>
        )}
        </div>

        {/* Download Button */}
        <div className="mb-6">
          <Button
            onClick={async () => {
              // Import jsPDF dynamically to avoid SSR issues
              const { jsPDF } = await import('jspdf');
              const html2canvas = (await import('html2canvas')).default;

              const receiptElement = document.querySelector('.receipt-content');
              if (!receiptElement) return;

              const canvas = await html2canvas(receiptElement as HTMLElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
              });

              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF();
              const imgWidth = 210;
              const pageHeight = 295;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              let heightLeft = imgHeight;

              let position = 0;

              pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pageHeight;

              while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
              }

              const fileName = isCombinedReceipt
                ? `combined-receipt-${orders[0]?.tableNumber || 'table'}.pdf`
                : `receipt-${orders[0]?.orderNumber || 'order'}.pdf`;

              pdf.save(fileName);
            }}
            className="w-full flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Your Experience
          </h2>

          <div className="space-y-4">
            {/* Star Rating */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                How was your dining experience?
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() =>
                      setFeedback((prev) => ({ ...prev, rating: star }))
                    }
                    className={`p-1 ${
                      (feedback.rating || 0) >= star
                        ? 'text-yellow-500'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        (feedback.rating || 0) >= star ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share your feedback (optional)
              </label>
              <textarea
                value={feedback.comment || ''}
                onChange={(e) =>
                  setFeedback((prev) => ({ ...prev, comment: e.target.value }))
                }
                placeholder="Tell us about your experience..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback.rating}
              className="w-full"
            >
              Submit Feedback
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Thank you for dining with us!</p>
          <p className="mt-1">Powered by RestoHand</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerReceiptPage;
