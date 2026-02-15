import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import { MenuManagementPage } from '@/pages/menu-management/MenuManagementPage';
import RestaurantSettingsPage from '@/pages/RestaurantSettingsPage';
import SimpleGstSettingsPage from '@/pages/SimpleGstSettingsPage';
import OnboardingPage from '@/pages/OnboardingPage';
import StaffPage from '@/pages/StaffPage';
import TablesRouter from '@/pages/tables/TablesRouter';
import CommandCenterPage from '@/pages/CommandCenterPage';
import ForbiddenPage from '@/pages/ForbiddenPage';
import ReportsPage from '@/pages/ReportsPage';
import ReceiptPage from '@/pages/ReceiptPage';
import ReceiptLookupPage from '@/pages/ReceiptLookupPage';
import GstSetupWizard from '@/pages/GstSetupWizard';
import ChargesSettingsPage from '@/pages/ChargesSettingsPage';
import CustomerQrPage from '@/pages/CustomerQrPage';
import FloorPlanDashboardPage from '@/pages/FloorPlanDashboardPage';
import FloorPlanConfigPage from '@/pages/FloorPlanConfigPage';
import InventoryPage from '@/pages/InventoryPage';
import RecipesPage from '@/pages/RecipesPage';
import CashfreeSubscriptionPage from '@/pages/CashfreeSubscriptionPage';
import BranchManagementPage from '@/pages/BranchManagementPage';
import KycManagementPage from '@/pages/KycManagementPage';
import { PdfMenuExtractionTab } from '@/pages/menu-management/tabs/PdfMenuExtractionTab';
import OrdersPage from '@/pages/orders/OrdersList';
import SessionsPage from '@/pages/orders/SessionsPage';

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
          path="/register"
          element={
            <AuthGuard requireAuth={false} redirectAuthenticatedTo="/dashboard">
              <RegisterPage />
            </AuthGuard>
          }
        />
        {/* Public receipt routes */}
        <Route path="/receipts" element={<ReceiptLookupPage />} />
        <Route path="/receipts/:orderNumber" element={<ReceiptPage />} />
        {/* New simplified QR receipt route */}
        <Route path="/receipt/:slug/:tableId" element={<ReceiptPage />} />
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
          <Route path="orders/list" element={<OrdersPage />} />
          <Route path="orders/sessions" element={<SessionsPage />} />
          {/* Menu routes with nested structure */}
          <Route path="menu/*" element={<MenuManagementPage />} />
          <Route path="extract-menu" element={<PdfMenuExtractionTab />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="tables/*" element={<TablesRouter />} />
          <Route path="command-center" element={<CommandCenterPage />} />
          <Route path="customer-qr" element={<CustomerQrPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="branches" element={<BranchManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="subscription" element={<CashfreeSubscriptionPage />} />
          <Route
            path="subscription/payment-success"
            element={<CashfreeSubscriptionPage />}
          />
          <Route path="kyc" element={<KycManagementPage />} />

          {/* Settings routes - separate pages, no layout wrapper */}
          <Route
            path="settings"
            element={<Navigate to="/settings/restaurant" replace />}
          />
          <Route
            path="settings/restaurant"
            element={<RestaurantSettingsPage />}
          />
          <Route path="settings/gst" element={<SimpleGstSettingsPage />} />
          <Route path="settings/gst/setup" element={<GstSetupWizard />} />
          <Route path="settings/charges" element={<ChargesSettingsPage />} />
        </Route>
        {/* Error / Fallback */}
        <Route
          path="/forbidden"
          element={
            <AuthGuard requireAuth={false}>
              <ForbiddenPage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
