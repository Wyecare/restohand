import { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import StaffLoginPage from '@/pages/StaffLoginPage';
import StaffInviteSignupPage from '@/pages/StaffInviteSignupPage';
import EnhancedKitchenPage from '@/pages/EnhancedKitchenPage';
import ServicePage from '@/pages/ServicePage';
import ForbiddenPage from '@/pages/ForbiddenPage';

const StaffRouter = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        {/* Staff login route */}
        <Route
          path="/login"
          element={
            <AuthGuard requireAuth={false} redirectAuthenticatedTo="/kitchen">
              <StaffLoginPage />
            </AuthGuard>
          }
        />

        {/* Staff invitation signup */}
        <Route
          path="/staff-invite-signup"
          element={
            <AuthGuard requireAuth={false}>
              <StaffInviteSignupPage />
            </AuthGuard>
          }
        />

        {/* Kitchen interface for chefs */}
        <Route
          path="/kitchen"
          element={
            <AuthGuard allowedRoles={['chef']}>
              <EnhancedKitchenPage />
            </AuthGuard>
          }
        />

        {/* Service interface for waiters/cashiers */}
        <Route
          path="/service"
          element={
            <AuthGuard allowedRoles={['waiter', 'cashier']}>
              <ServicePage />
            </AuthGuard>
          }
        />

        {/* Error / Fallback */}
        <Route
          path="/forbidden"
          element={
            <AuthGuard requireAuth={false}>
              <ForbiddenPage />
            </AuthGuard>
          }
        />

        {/* Default redirect based on role */}
        <Route
          path="*"
          element={
            <AuthGuard>
              <Navigate to="/kitchen" replace />
            </AuthGuard>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default StaffRouter;