import { useGetDashboardQuery } from '@/store/api/adminApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LayoutDashboard, Building2, ShoppingBag, DollarSign } from 'lucide-react';

const DashboardPage = () => {
  const { data: dashboard, isLoading, error } = useGetDashboardQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive">Error loading dashboard</h3>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Restaurants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalRestaurants || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active restaurant accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Orders processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Settlements</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pendingSettlements || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting settlement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {dashboard?.lastUpdated
                ? new Date(dashboard.lastUpdated).toLocaleDateString()
                : 'Never'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Data refresh
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Restohand platform statistics and health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Welcome to the Restohand Super Admin Portal. Use the navigation menu to manage
              restaurants, process settlements, view analytics, and manage super admin accounts.
            </p>

            {dashboard?.pendingSettlements && dashboard.pendingSettlements > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ You have ₹{dashboard.pendingSettlements.toLocaleString()} in pending settlements.
                  Visit the Settlements page to process them.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;