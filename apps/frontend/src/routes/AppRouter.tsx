import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import MenuPage from '@/pages/MenuPage';
import ImprovedMenuPage from '@/pages/ImprovedMenuPage';
import SimpleMenuPage from '@/pages/SimpleMenuPage';
import { MenuManagementPage } from '@/pages/menu-management/MenuManagementPage';
import SettingsPageNew from '@/pages/SettingsPageNew';
import OnboardingPage from '@/pages/OnboardingPage';
import StaffPage from '@/pages/StaffPage';
import TablesPage from '@/pages/TablesPage';
import CommandCenterPage from '@/pages/CommandCenterPage';
import EnhancedKitchenPage from '@/pages/EnhancedKitchenPage';
import ServicePage from '@/pages/ServicePage';
// Staff components moved to StaffRouter for domain separation
import ForbiddenPage from '@/pages/ForbiddenPage';
import ReportsPage from '@/pages/ReportsPage';
import ReceiptPage from '@/pages/ReceiptPage';
import ReceiptLookupPage from '@/pages/ReceiptLookupPage';
import GstSettingsPage from '@/pages/GstSettingsPage';
import CustomerQrPage from '@/pages/CustomerQrPage';
import FloorPlanDashboardPage from '@/pages/FloorPlanDashboardPage';
import FloorPlanConfigPage from '@/pages/FloorPlanConfigPage';
import InventoryPage from '@/pages/InventoryPage';
import RecipesPage from '@/pages/RecipesPage';
import SubscriptionPage from '@/pages/SubscriptionPage';

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

        {/* Staff routes moved to StaffRouter for domain separation */}

        {/* Policy pages - moved to CustomerRouter for QR domain access */}

        {/* Public receipt routes */}
        <Route path="/receipts" element={<ReceiptLookupPage />} />
        <Route path="/receipts/:orderNumber" element={<ReceiptPage />} />

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
          <Route path="menu" element={<MenuManagementPage />} />
          <Route path="menu-advanced" element={<ImprovedMenuPage />} />
          <Route path="menu-simple" element={<SimpleMenuPage />} />
          <Route path="menu-old" element={<MenuPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="command-center" element={<CommandCenterPage />} />
          <Route path="customer-qr" element={<CustomerQrPage />} />
          {/* <Route path="inventory" element={<InventoryPage />} /> */}
          {/* <Route path="recipes" element={<RecipesPage />} /> */}
          <Route path="reports" element={<ReportsPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="settings" element={<SettingsPageNew />} />
          {/* floor plan */}
          {/* <Route path="floor-plan" element={<FloorPlanDashboardPage />} />
          <Route path="floor-plan/config" element={<FloorPlanConfigPage />} /> */}
          <Route path="settings/gst" element={<SettingsPageNew />} />
        </Route>

        {/* Staff routes removed from admin - handled by StaffRouter */}

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
