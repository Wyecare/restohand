import { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import CustomerMenuPageNew from '@/pages/customer/CustomerMenuPageNew';
import CustomerOrderStatusPageNew from '@/pages/customer/CustomerOrderStatusPageNew';
import CustomerReceiptPage from '@/pages/customer/CustomerReceiptPage';
import CustomerLayout from '@/components/customer/CustomerLayout';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsConditionsPage from '@/pages/TermsConditionsPage';
import RefundPolicyPage from '@/pages/RefundPolicyPage';
import ContactUsPage from '@/pages/ContactUsPage';
import AboutUsPage from '@/pages/AboutUsPage';

const CustomerRouter = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        {/* Public policy pages accessible to customers */}
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-conditions" element={<TermsConditionsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/contact-us" element={<ContactUsPage />} />

        {/* Customer QR ordering interface */}
        <Route element={<CustomerLayout />}>
          <Route path="/c/:slug" element={<CustomerMenuPageNew />} />
          <Route
            path="/c/:slug/order/:orderId"
            element={<CustomerOrderStatusPageNew />}
          />
        </Route>

        {/* Customer receipt page - standalone without layout */}
        <Route path="/receipt/:orderId" element={<CustomerReceiptPage />} />

        {/* Combined receipt page - standalone without layout */}
        <Route path="/combined-receipt" element={<CustomerReceiptPage />} />

        {/* Root redirect - if someone visits qr.restohand.com without a restaurant slug */}
        <Route
          path="/"
          element={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-foreground">Welcome to RestoHand</h1>
                <p className="text-muted-foreground">
                  Please scan the QR code at your table to view the menu and place your order.
                </p>
              </div>
            </div>
          }
        />

        {/* Catch all other routes and show helpful message */}
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
                <p className="text-muted-foreground">
                  Please scan the QR code at your table to view the menu and place your order.
                </p>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default CustomerRouter;