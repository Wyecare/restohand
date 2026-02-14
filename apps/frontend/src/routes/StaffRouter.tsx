import { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import {
  selectUserRoles,
  selectIsAuthenticated,
} from '@/store/slices/authSlice';
import StaffLoginPage from '@/pages/StaffLoginPage';
import StaffSignupPage from '@/pages/StaffSignupPage';
import StaffInviteSignupPage from '@/pages/StaffInviteSignupPage';
import EnhancedKitchenPage from '@/pages/EnhancedKitchenPage';
import ServicePage from '@/pages/ServicePage';
import ForbiddenPage from '@/pages/ForbiddenPage';

// Component to handle role-based redirects
const RoleBasedRedirect = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const roles = useAppSelector(selectUserRoles);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.includes('chef')) {
    return <Navigate to="/kitchen" replace />;
  } else if (roles.includes('waiter') || roles.includes('cashier')) {
    return <Navigate to="/service" replace />;
  } else if (roles.includes('manager') || roles.includes('owner')) {
    // Redirect managers and owners to the main dashboard
    window.location.href = '/';
    return null;
  } else {
    return <Navigate to="/forbidden" replace />;
  }
};

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
        {/* Role-based redirect after login */}
        <Route
          path="/redirect"
          element={
            <AuthGuard>
              <RoleBasedRedirect />
            </AuthGuard>
          }
        />

        {/* Staff signup routes */}
        <Route
          path="/staff-signup"
          element={
            <AuthGuard requireAuth={false}>
              <StaffSignupPage />
            </AuthGuard>
          }
        />

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
              <RoleBasedRedirect />
            </AuthGuard>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default StaffRouter;
