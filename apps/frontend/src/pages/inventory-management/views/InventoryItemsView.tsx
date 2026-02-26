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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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
  useUpdateStockMutation,
  useMarkAlertAsReadMutation,
  useCreateInventoryItemMutation,
  useGetInventoryUnitsQuery,
  useGetInventoryItemsByBranchQuery,
  useGetInventoryAnalyticsByBranchQuery,
  useGetStockAlertsByBranchQuery,
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
  Edit,
  BarChart3,
  ShoppingCart,
  Minus,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import {
  searchInventoryItems,
  type InventoryItemTemplate,
} from '@/lib/indian-inventory-items';
import { useBranchContext } from '@/contexts/BranchContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export function InventoryItemsView() {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [stockUpdateQuantity, setStockUpdateQuantity] = useState('');
  const [stockUpdateType, setStockUpdateType] = useState<
    'purchase' | 'consumption' | 'waste' | 'adjustment'
  >('purchase');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    costPerUnit: '',
    minimumStock: '',
    reorderPoint: '',
    reorderQuantity: '',
    currentStock: '',
    supplier: '',
    tags: '',
  });
  const [itemSuggestions, setItemSuggestions] = useState<
    InventoryItemTemplate[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const [updateStock] = useUpdateStockMutation();
  const [markAlertAsRead] = useMarkAlertAsReadMutation();
  const [createInventoryItem, { isLoading: isCreatingItem }] = useCreateInventoryItemMutation();

  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useGetInventoryItemsByBranchQuery(
    restaurantId && currentBranch?._id
      ? {
          restaurantId,
          branchId: currentBranch._id,
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          lowStock: stockFilter === 'low' ? true : undefined,
          outOfStock: stockFilter === 'out' ? true : undefined,
        }
      : skipToken
  );

  const { data: analytics, isLoading: analyticsLoading } =
    useGetInventoryAnalyticsByBranchQuery(
      restaurantId && currentBranch?._id
        ? { restaurantId, branchId: currentBranch._id }
        : skipToken
    );

  const { data: alerts, isLoading: alertsLoading } = useGetStockAlertsByBranchQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id }
      : skipToken
  );

  const { data: categoriesData } = useGetInventoryCategoriesQuery(
    restaurantId ?? skipToken
  );
  const { data: unitsData } = useGetInventoryUnitsQuery(
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

  const handleMarkAlertAsRead = async (alertId: string) => {
    if (!restaurantId) return;
    try {
      await markAlertAsRead({ restaurantId, alertId });
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const handleItemNameChange = (value: string) => {
    setNewItemForm({ ...newItemForm, name: value });

    // Show suggestions when user types
    if (value.trim().length > 0) {
      const suggestions = searchInventoryItems(value);
      setItemSuggestions(suggestions);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    } else {
      setShowSuggestions(false);
      setItemSuggestions([]);
    }
  };

  const selectSuggestion = (suggestion: InventoryItemTemplate) => {
    setNewItemForm({
      name: suggestion.name,
      description: suggestion.description || '',
      category: suggestion.category,
      unit: suggestion.unit,
      costPerUnit: suggestion.estimatedCostPerUnit.toString(),
      minimumStock: suggestion.minimumStock.toString(),
      reorderPoint: suggestion.reorderPoint.toString(),
      reorderQuantity: suggestion.reorderQuantity.toString(),
      currentStock: '0',
      supplier: '',
      tags: suggestion.tags.join(', '),
    });
    setShowSuggestions(false);
    setItemSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || itemSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < itemSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(itemSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleStockUpdate = async (itemId: string) => {
    if (!restaurantId || !stockUpdateQuantity) return;
    try {
      await updateStock({
        restaurantId,
        itemId,
        quantity: parseFloat(stockUpdateQuantity),
        type: stockUpdateType,
      });
      toast({
        title: 'Stock updated successfully',
        description: `Stock has been updated`,
      });
      setShowStockUpdate(false);
      setSelectedItem(null);
      setStockUpdateQuantity('');
    } catch (error) {
      console.error('Failed to update stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stock. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddItem = async () => {
    if (!restaurantId) return;
    try {
      await createInventoryItem({
        restaurantId,
        name: newItemForm.name,
        description: newItemForm.description || undefined,
        category: newItemForm.category,
        unit: newItemForm.unit,
        costPerUnit: parseFloat(newItemForm.costPerUnit),
        minimumStock: parseFloat(newItemForm.minimumStock),
        reorderPoint: parseFloat(newItemForm.reorderPoint),
        reorderQuantity: parseFloat(newItemForm.reorderQuantity),
        currentStock: parseFloat(newItemForm.currentStock) || 0,
        supplier: newItemForm.supplier || undefined,
        tags: newItemForm.tags
          ? newItemForm.tags.split(',').map((tag) => tag.trim())
          : undefined,
      }).unwrap();
      toast({
        title: 'Item added successfully',
        description: `${newItemForm.name} has been added to your inventory`,
      });
      setShowAddItem(false);
      setNewItemForm({
        name: '',
        description: '',
        category: '',
        unit: '',
        costPerUnit: '',
        minimumStock: '',
        reorderPoint: '',
        reorderQuantity: '',
        currentStock: '',
        supplier: '',
        tags: '',
      });
    } catch (error) {
      console.error('Failed to create inventory item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add inventory item. Please try again.',
        variant: 'destructive',
      });
    }
  };

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
            Inventory Items
          </h1>
          <p className="text-muted-foreground">
            Track stock levels, monitor consumption, and manage inventory
          </p>
        </div>
        <Button onClick={() => setShowAddItem(true)}>
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
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
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
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
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
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
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
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-900/40"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm">{alert.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Critical</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAlertAsRead(alert.id)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {warningAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-950/20 dark:border-orange-900/40"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm">{alert.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Warning</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAlertAsRead(alert.id)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
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

      {/* Filters and Items Table */}
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item.id);
                              setShowStockUpdate(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Stock Update Modal */}
      {showStockUpdate && selectedItem && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Update Stock</CardTitle>
              <CardDescription>
                {filteredItems?.find((item) => item.id === selectedItem)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    value={stockUpdateQuantity}
                    onChange={(e) => setStockUpdateQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={stockUpdateType}
                    onValueChange={(value: any) => setStockUpdateType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">
                        Purchase (Add Stock)
                      </SelectItem>
                      <SelectItem value="consumption">
                        Consumption (Use Stock)
                      </SelectItem>
                      <SelectItem value="waste">
                        Waste (Remove Stock)
                      </SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStockUpdate(false);
                      setSelectedItem(null);
                      setStockUpdateQuantity('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleStockUpdate(selectedItem)}
                    disabled={!stockUpdateQuantity}
                    className="flex-1"
                  >
                    Update Stock
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Add Item Modal - simplified version for space */}
      {showAddItem && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Add New Inventory Item</CardTitle>
              <CardDescription>
                Create a new inventory item to track stock levels
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                {/* Quick Add Common Items */}
                <div className="bg-accent/20 border border-accent/40 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Quick Add Common Items
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { name: 'Onion', category: 'vegetables' },
                      { name: 'Tomato', category: 'vegetables' },
                      { name: 'Basmati Rice', category: 'grains' },
                      { name: 'Paneer', category: 'dairy' },
                      { name: 'Chicken', category: 'meat' },
                      { name: 'Turmeric Powder', category: 'spices' },
                    ].map((item) => {
                      const suggestion = searchInventoryItems(item.name).find(
                        (s) =>
                          s.name === item.name && s.category === item.category
                      );
                      return suggestion ? (
                        <button
                          key={suggestion.name}
                          onClick={() => selectSuggestion(suggestion)}
                          className="text-left p-2 text-xs bg-background hover:bg-accent/50 border border-border rounded transition-colors"
                        >
                          <div className="font-medium">{suggestion.name}</div>
                          <div className="text-muted-foreground">
                            ₹{suggestion.estimatedCostPerUnit}/{suggestion.unit}
                          </div>
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Item Name *
                      <Sparkles className="h-3 w-3 text-primary" />
                    </label>
                    <Input
                      value={newItemForm.name}
                      onChange={(e) => handleItemNameChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type to search common items"
                      autoComplete="off"
                    />

                    {/* Smart Suggestions Dropdown */}
                    {showSuggestions && itemSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        <div className="p-2 text-xs text-muted-foreground border-b">
                          Common Indian restaurant items
                        </div>
                        {itemSuggestions.slice(0, 5).map((suggestion, index) => (
                          <div
                            key={`${suggestion.name}-${suggestion.category}`}
                            className={cn(
                              'p-3 cursor-pointer border-b border-border/50 hover:bg-accent/50 transition-colors',
                              selectedSuggestionIndex === index && 'bg-accent'
                            )}
                            onClick={() => selectSuggestion(suggestion)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {suggestion.name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {suggestion.description}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    {suggestion.category}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {suggestion.unit} • ₹{suggestion.estimatedCostPerUnit}
                                  </span>
                                </div>
                              </div>
                              <Check className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category *</label>
                    <Select
                      value={newItemForm.category}
                      onValueChange={(value) =>
                        setNewItemForm({ ...newItemForm, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesData?.predefinedCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Unit *</label>
                    <Select
                      value={newItemForm.unit}
                      onValueChange={(value) =>
                        setNewItemForm({ ...newItemForm, unit: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitsData?.units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cost Per Unit *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newItemForm.costPerUnit}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          costPerUnit: e.target.value,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Current Stock</label>
                    <Input
                      type="number"
                      value={newItemForm.currentStock}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          currentStock: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Minimum Stock *</label>
                    <Input
                      type="number"
                      value={newItemForm.minimumStock}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          minimumStock: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Reorder Point *</label>
                    <Input
                      type="number"
                      value={newItemForm.reorderPoint}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          reorderPoint: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Reorder Quantity *</label>
                  <Input
                    type="number"
                    value={newItemForm.reorderQuantity}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        reorderQuantity: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddItem(false);
                      setNewItemForm({
                        name: '',
                        description: '',
                        category: '',
                        unit: '',
                        costPerUnit: '',
                        minimumStock: '',
                        reorderPoint: '',
                        reorderQuantity: '',
                        currentStock: '',
                        supplier: '',
                        tags: '',
                      });
                    }}
                    disabled={isCreatingItem}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddItem}
                    disabled={
                      isCreatingItem ||
                      !newItemForm.name ||
                      !newItemForm.category ||
                      !newItemForm.unit ||
                      !newItemForm.costPerUnit ||
                      !newItemForm.minimumStock ||
                      !newItemForm.reorderPoint ||
                      !newItemForm.reorderQuantity
                    }
                    className="flex-1"
                  >
                    {isCreatingItem && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {isCreatingItem ? 'Adding...' : 'Add Item'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      )}
    </div>
  );
}