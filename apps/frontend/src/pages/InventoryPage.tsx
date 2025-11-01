import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import {
  useGetInventoryItemsQuery,
  useGetInventoryAnalyticsQuery,
  useGetStockAlertsQuery,
  useGetInventoryCategoriesQuery,
} from '@/store/api/inventoryApi';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Eye,
  AlertCircle,
} from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const InventoryPage = () => {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<string>('');

  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useGetInventoryItemsQuery(
    restaurantId
      ? {
          restaurantId,
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          lowStock: stockFilter === 'low' ? true : undefined,
          outOfStock: stockFilter === 'out' ? true : undefined,
        }
      : skipToken
  );

  const { data: analytics, isLoading: analyticsLoading } =
    useGetInventoryAnalyticsQuery(restaurantId ?? skipToken);

  const { data: alerts, isLoading: alertsLoading } = useGetStockAlertsQuery(
    restaurantId ?? skipToken
  );

  const { data: categoriesData } = useGetInventoryCategoriesQuery(
    restaurantId ?? skipToken
  );

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory || item.category === selectedCategory;

      const matchesStockFilter =
        !stockFilter ||
        (stockFilter === 'low' && item.tracking.isLowStock) ||
        (stockFilter === 'out' && item.tracking.isOutOfStock);

      return matchesSearch && matchesCategory && matchesStockFilter;
    });
  }, [items, searchQuery, selectedCategory, stockFilter]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (itemsLoading || analyticsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const criticalAlerts =
    alerts?.filter((alert) => alert.severity === 'critical') || [];
  const warningAlerts =
    alerts?.filter((alert) => alert.severity === 'warning') || [];

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track stock levels, monitor consumption, and manage supplies
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Active inventory items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {analytics.lowStockItems}
              </div>
              <p className="text-xs text-muted-foreground">
                Items need restocking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Out of Stock
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {analytics.outOfStockItems}
              </div>
              <p className="text-xs text-muted-foreground">
                Items completely depleted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.totalInventoryValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Current inventory worth
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Section */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Stock Alerts
            </CardTitle>
            <CardDescription>
              Items requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">{alert.message}</span>
                </div>
                <Badge variant="destructive">Critical</Badge>
              </div>
            ))}
            {warningAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">{alert.message}</span>
                </div>
                <Badge variant="secondary">Warning</Badge>
              </div>
            ))}
            {warningAlerts.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                And {warningAlerts.length - 3} more warnings...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            Manage your inventory stock levels and track consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesData?.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost per Unit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.length ? (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.category.charAt(0).toUpperCase() +
                            item.category.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {item.stockLevels.currentStock}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Min: {item.stockLevels.minimumStock}
                        </div>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        {item.tracking.isOutOfStock ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : item.tracking.isLowStock ? (
                          <Badge variant="secondary">Low Stock</Badge>
                        ) : (
                          <Badge variant="default">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.pricing.costPerUnit)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {itemsError
                          ? 'Error loading inventory items'
                          : filteredItems?.length === 0
                          ? 'No items found matching your criteria'
                          : 'No inventory items yet'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;
