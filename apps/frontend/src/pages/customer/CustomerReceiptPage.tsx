import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Receipt } from '@/components/customer/Receipt';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Download, Star } from 'lucide-react';
import {
  useGetOrderPublicQuery,
  useGetCombinedReceiptPublicQuery,
  useGetReceiptByNumberPublicQuery,
} from '@/store/api/ordersApi';
import { useGetTableSessionPublicQuery, useGetConsolidatedBillQuery } from '@/store/api/restaurantsApi';
import { generateReceiptPDF } from '@/components/customer/ReceiptPDF';
import { generateThermalReceiptPDF } from '@/components/ThermalReceiptPDF';
import type { PublicRestaurant } from '@/store/api/types';

const CustomerReceiptPage = () => {
  const { orderId, slug, tableId } = useParams<{ orderId?: string; slug?: string; tableId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get('t') || searchParams.get('token'); // Support both 't' and 'token'
  const shouldAutoPrint = searchParams.get('print') === 'true';

  const [feedback, setFeedback] = useState<{
    rating?: number;
    comment?: string;
  }>({});

  const handleSubmitFeedback = async () => {
    // TODO: Implement feedback submission
    console.log('Submitting feedback:', feedback);
  };

  // Check if this is a combined receipt route
  const isCombinedReceipt = location.pathname === '/combined-receipt';

  // Check if this is a table bill route
  const isTableBill = (location.pathname.includes('/table-bill/') || location.pathname.includes('/table/') && location.pathname.includes('/receipt')) && slug && tableId;

  // Detect if orderId is actually a receipt number (contains letters)
  const isReceiptNumber = orderId && /[A-Z]/.test(orderId);

  // Get order data using public endpoint with token (single order)
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useGetOrderPublicQuery(
    { orderId: orderId!, token: token! },
    { skip: isCombinedReceipt || isReceiptNumber || !orderId || !token }
  );

  // Get receipt data using receipt number
  const {
    data: receipt,
    isLoading: receiptLoading,
    error: receiptError,
  } = useGetReceiptByNumberPublicQuery(
    { receiptNumber: orderId!, token: token! },
    { skip: isCombinedReceipt || !isReceiptNumber || !orderId || !token }
  );

  // Get combined receipt data using public endpoint with token (accumulated receipt)
  const {
    data: combinedReceipt,
    isLoading: combinedLoading,
    error: combinedError,
  } = useGetCombinedReceiptPublicQuery(
    { token: token! },
    { skip: !isCombinedReceipt || !token }
  );

  // Get table session data for table bill (legacy)
  const {
    data: tableSessionData,
    isLoading: tableSessionLoading,
    error: tableSessionError,
  } = useGetTableSessionPublicQuery(
    { slug: slug!, tableId: tableId! },
    { skip: !isTableBill }
  );

  // Check localStorage for recent payment bill data first
  const [storedBillData, setStoredBillData] = useState<any>(null);

  useEffect(() => {
    if (isTableBill) {
      try {
        const stored = localStorage.getItem('lastPaymentSession');
        if (stored) {
          const sessionData = JSON.parse(stored);
          // Check if this matches current table and is recent (within 1 hour)
          if (sessionData.slug === slug &&
              sessionData.tableId === tableId &&
              sessionData.billData &&
              Date.now() - new Date(sessionData.timestamp).getTime() < 3600000) {
            setStoredBillData(sessionData.billData);
          }
        }
      } catch (error) {
        console.error('Error reading stored bill data:', error);
      }
    }
  }, [isTableBill, slug, tableId]);

  // Get consolidated bill data with proper tax calculation (only if no stored data)
  const {
    data: consolidatedBillData,
    isLoading: consolidatedBillLoading,
    error: consolidatedBillError,
  } = useGetConsolidatedBillQuery(
    { slug: slug!, tableId: tableId! },
    { skip: !isTableBill || !!storedBillData }
  );

  const isLoading = isTableBill
    ? (tableSessionLoading || consolidatedBillLoading)
    : isCombinedReceipt
    ? combinedLoading
    : isReceiptNumber
      ? receiptLoading
      : orderLoading;

  const error = isTableBill
    ? (tableSessionError || consolidatedBillError)
    : isCombinedReceipt
    ? combinedError
    : isReceiptNumber
      ? receiptError
      : orderError;

  const orders = isTableBill
    ? (tableSessionData?.tableSession?.orders || null)
    : isCombinedReceipt
    ? (combinedReceipt ? [combinedReceipt] : null)
    : isReceiptNumber
      ? (receipt ? [receipt] : null)
      : (order ? [order] : null);

  // Auto-download PDF when print=true parameter is present
  useEffect(() => {
    if (shouldAutoPrint && !isLoading && !error && consolidatedBillData && isTableBill) {
      const downloadPdf = async () => {
        try {
          // Download bill directly from backend
          const billUrl = `/api/public/restaurants/${slug}/table/${tableId}/bill`;
          window.open(billUrl, '_blank');

          // Close the window after a short delay to allow download to start
          setTimeout(() => {
            window.close();
          }, 1000);
        } catch (error) {
          console.error('Error downloading PDF:', error);
        }
      };

      downloadPdf();
    }
  }, [shouldAutoPrint, isLoading, error, consolidatedBillData, isTableBill, slug, tableId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Loading your bill...</p>
        </div>
      </div>
    );
  }

  if (isTableBill && (consolidatedBillData || storedBillData)) {
    // Use stored bill data if available, otherwise use API data
    const billData = storedBillData || consolidatedBillData;
    const { restaurant, bill } = billData;

    // Type assertion for restaurant with extended fields
    const extendedRestaurant = restaurant as PublicRestaurant & {
      address?: { line1: string; city: string; state: string; postalCode: string; country: string };
      phone?: string;
      gstin?: string;
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Payment Success Message (when using stored data) */}
          {storedBillData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
              <div className="text-green-600 text-lg font-semibold mb-1">✅ Payment Successful!</div>
              <div className="text-green-700 text-sm">Your payment has been processed successfully.</div>
            </div>
          )}

          {/* Restaurant Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{extendedRestaurant.name}</h1>
              {extendedRestaurant.address && (
                <div className="text-gray-600 mt-2">
                  <p>{extendedRestaurant.address.line1}</p>
                  <p>{extendedRestaurant.address.city}, {extendedRestaurant.address.state} {extendedRestaurant.address.postalCode}</p>
                </div>
              )}
              {extendedRestaurant.phone && (
                <p className="text-gray-600">Phone: {extendedRestaurant.phone}</p>
              )}
              {extendedRestaurant.gstin && (
                <p className="text-gray-600">GSTIN: {extendedRestaurant.gstin}</p>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Table: {bill.tableNumber}</span>
                <span className="text-sm text-gray-600">
                  {new Date(bill.billGeneratedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Orders Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Details</h2>

            {bill.orders.map((order, index) => (
              <div key={index} className="mb-6 last:mb-0">
                <h3 className="font-medium text-gray-700 mb-3">Order #{order.orderNumber}</h3>
                <div className="space-y-2">
                  {order.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between items-center py-1">
                      <div className="flex-1">
                        <span className="text-gray-900">{item.name}</span>
                        <span className="text-gray-600 ml-2">x {item.quantity}</span>
                      </div>
                      <span className="text-gray-900">₹{item.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-3 text-right">
                  <span className="text-sm font-medium text-gray-700">
                    Order Total: ₹{order.orderTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Bill Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{bill.subtotal.toFixed(2)}</span>
              </div>

              {bill.cgstAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>CGST:</span>
                  <span>₹{bill.cgstAmount.toFixed(2)}</span>
                </div>
              )}

              {bill.sgstAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>SGST:</span>
                  <span>₹{bill.sgstAmount.toFixed(2)}</span>
                </div>
              )}

              {bill.igstAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IGST:</span>
                  <span>₹{bill.igstAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Total Tax (GST):</span>
                <span>₹{bill.taxAmount.toFixed(2)}</span>
              </div>

              <div className="border-t pt-2 font-bold text-lg flex justify-between">
                <span>Grand Total:</span>
                <span>₹{bill.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="mb-6 space-y-3">
            <Button
              onClick={async () => {
                try {
                  // Use the bill data we already have (either stored or from API)
                  const pdfBlob = await generateThermalReceiptPDF({
                    restaurant: restaurant,
                    bill: bill,
                  });

                  // Create download link
                  const url = URL.createObjectURL(pdfBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `table-${bill.tableNumber}-bill.pdf`;
                  document.body.appendChild(link);
                  link.click();

                  // Cleanup
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error downloading bill:', error);
                  alert('Failed to generate PDF. Please try again.');
                }
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Official Bill
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
  }

  if (error || (!isTableBill && (!orders || orders.length === 0))) {
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

  // Extract restaurant info
  const restaurantInfo = isTableBill && tableSessionData?.restaurant
    ? {
        name: tableSessionData.restaurant.name,
        address: tableSessionData.restaurant.address,
        phone: tableSessionData.restaurant.contactPhone,
        email: tableSessionData.restaurant.contactEmail,
        gstNumber: tableSessionData.restaurant.gstin,
      }
    : orders?.[0]
    ? {
        name: 'Restaurant', // Restaurant name not available in order response
        address: undefined, // Restaurant address not included in order response
        phone: undefined, // Restaurant contact not included in order response
        email: undefined, // Restaurant email not included in order response
        gstNumber: undefined, // Restaurant GST not included in order response
      }
    : undefined;

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

        {/* Download Buttons */}
        <div className="mb-6 space-y-3">
          <Button
            onClick={async () => {
              try {
                // Generate PDF using @react-pdf/renderer
                const pdfBlob = await generateReceiptPDF({
                  order: (isCombinedReceipt || isTableBill) ? undefined : orders?.[0],
                  orders: (isCombinedReceipt || isTableBill) ? orders : undefined,
                  isCombinedReceipt: isCombinedReceipt || isTableBill,
                  restaurantInfo,
                });

                // Create download link
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;

                // Set filename
                const fileName = isTableBill
                  ? `table-${tableSessionData?.tableSession?.tableNumber || 'session'}-bill.pdf`
                  : isCombinedReceipt
                  ? `combined-receipt-${orders?.[0]?.tableNumber || 'table'}.pdf`
                  : `receipt-${orders?.[0]?.orderNumber || 'order'}.pdf`;

                link.download = fileName;
                document.body.appendChild(link);
                link.click();

                // Cleanup
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Failed to generate PDF. Please try again.');
              }
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
