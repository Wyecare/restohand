import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import MenuPage from '@/pages/MenuPage';
import SettingsPage from '@/pages/SettingsPage';
import OnboardingPage from '@/pages/OnboardingPage';
import StaffPage from '@/pages/StaffPage';
import TablesPage from '@/pages/TablesPage';
import KitchenPage from '@/pages/KitchenPage';
import ServicePage from '@/pages/ServicePage';
import StaffLoginPage from '@/pages/StaffLoginPage';
import ForbiddenPage from '@/pages/ForbiddenPage';
import CustomerMenuPage from '@/pages/customer/CustomerMenuPage';
import CustomerOrderStatusPage from '@/pages/customer/CustomerOrderStatusPage';
import ReportsPage from '@/pages/ReportsPage';

const AppRouter = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <AuthGuard requireAuth={false} redirectAuthenticatedTo="/dashboard">
              <LoginPage />
            </AuthGuard>
          }
        />

        <Route
          path="/staff-login"
          element={
            <AuthGuard requireAuth={false} redirectAuthenticatedTo="/kitchen">
              <StaffLoginPage />
            </AuthGuard>
          }
        />

        <Route
          path="/onboarding"
          element={
            <AuthGuard>
              <OnboardingPage />
            </AuthGuard>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <AuthGuard allowedRoles={['manager', 'owner']}>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="/kitchen"
          element={
            <AuthGuard allowedRoles={['chef']}>
              <KitchenPage />
            </AuthGuard>
          }
        />

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
        <Route path="/c/:slug" element={<CustomerMenuPage />} />
        <Route path="/c/:slug/order/:orderId" element={<CustomerOrderStatusPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
