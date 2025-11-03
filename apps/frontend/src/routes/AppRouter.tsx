import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import MenuPage from '@/pages/MenuPage';
import ImprovedMenuPage from '@/pages/ImprovedMenuPage';
import SimpleMenuPage from '@/pages/SimpleMenuPage';
import SettingsPageNew from '@/pages/SettingsPageNew';
import OnboardingPage from '@/pages/OnboardingPage';
import StaffPage from '@/pages/StaffPage';
import TablesPage from '@/pages/TablesPage';
import KitchenPage from '@/pages/KitchenPage';
import ServicePage from '@/pages/ServicePage';
import StaffLoginPage from '@/pages/StaffLoginPage';
import StaffSignupPage from '@/pages/StaffSignupPage';
import ForbiddenPage from '@/pages/ForbiddenPage';
import CustomerMenuPage from '@/pages/customer/CustomerMenuPage';
import CustomerOrderStatusPage from '@/pages/customer/CustomerOrderStatusPage';
import ReportsPage from '@/pages/ReportsPage';
import GstSettingsPage from '@/pages/GstSettingsPage';
import CustomerQrPage from '@/pages/CustomerQrPage';
import FloorPlanDashboardPage from '@/pages/FloorPlanDashboardPage';
import FloorPlanConfigPage from '@/pages/FloorPlanConfigPage';
import InventoryPage from '@/pages/InventoryPage';
import RecipesPage from '@/pages/RecipesPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsConditionsPage from '@/pages/TermsConditionsPage';
import RefundPolicyPage from '@/pages/RefundPolicyPage';
import ContactUsPage from '@/pages/ContactUsPage';
import AboutUsPage from '@/pages/AboutUsPage';
import CustomerLayout from '@/components/customer/CustomerLayout';

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

        <Route path="/staff-signup" element={<StaffSignupPage />} />

        {/* Policy pages */}
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-conditions" element={<TermsConditionsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/contact-us" element={<ContactUsPage />} />

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
          <Route path="menu" element={<SimpleMenuPage />} />
          <Route path="menu-advanced" element={<ImprovedMenuPage />} />
          <Route path="menu-old" element={<MenuPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="customer-qr" element={<CustomerQrPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="settings" element={<SettingsPageNew />} />
          {/* floor plan */}
          {/* <Route path="floor-plan" element={<FloorPlanDashboardPage />} />
          <Route path="floor-plan/config" element={<FloorPlanConfigPage />} /> */}
          <Route path="settings/gst" element={<SettingsPageNew />} />
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
        <Route element={<CustomerLayout />}>
          <Route path="/c/:slug" element={<CustomerMenuPage />} />
          <Route
            path="/c/:slug/order/:orderId"
            element={<CustomerOrderStatusPage />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
