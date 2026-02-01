import { useGetAnalyticsOverviewQuery } from '@/store/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BarChart3, TrendingUp, Calendar, Building2 } from 'lucide-react';

const AnalyticsPage = () => {
  const { data: analytics, isLoading, error } = useGetAnalyticsOverviewQuery();

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
          <h3 className="text-lg font-semibold text-destructive">Error loading analytics</h3>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      {/* Top Restaurants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Top Performing Restaurants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.topRestaurants && analytics.topRestaurants.length > 0 ? (
            <div className="space-y-4">
              {analytics.topRestaurants.map((restaurant, index) => (
                <div
                  key={restaurant.restaurantName}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{restaurant.restaurantName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {restaurant.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(restaurant.revenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No restaurant data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Daily Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.dailyOrders && analytics.dailyOrders.length > 0 ? (
            <div className="space-y-3">
              {analytics.dailyOrders.slice(-7).map((day) => (
                <div
                  key={day._id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                >
                  <span className="font-medium">{formatDate(day._id)}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{day.orderCount} orders</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(day.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No daily order data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 ? (
            <div className="space-y-3">
              {analytics.monthlyRevenue.slice(-6).map((month) => (
                <div
                  key={month._id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                >
                  <span className="font-medium">
                    {new Date(month._id + '-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(month.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No monthly revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              This analytics dashboard provides insights into platform performance,
              including top-performing restaurants, daily order trends, and monthly revenue patterns.
            </p>
            <p>
              Use this data to identify growth opportunities, monitor platform health,
              and make informed business decisions for the Restohand platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;