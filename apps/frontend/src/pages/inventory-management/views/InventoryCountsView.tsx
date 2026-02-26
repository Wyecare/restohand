import { useState } from 'react';
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
import { useAppSelector } from '@/store/hooks';
import {
  selectActiveRestaurantId,
  selectAuthSession,
} from '@/store/slices/authSlice';
import {
  useGetInventoryCountsQuery,
  useCreateInventoryCountMutation,
} from '@/store/api/inventoryCountsApi';
import {
  ClipboardCheck,
  Plus,
  Edit,
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
} from 'lucide-react';
import { useBranchContext } from '@/contexts/BranchContext';

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-IN');

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export function InventoryCountsView() {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateCount, setShowCreateCount] = useState(false);

  const {
    data: inventoryCountsResponse,
    isLoading: inventoryCountsLoading,
    isError: inventoryCountsError,
  } = useGetInventoryCountsQuery(
    restaurantId && currentBranch?._id
      ? {
          restaurantId,
          branchId: currentBranch._id,
          search: searchQuery || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          type: typeFilter === 'all' ? undefined : typeFilter,
        }
      : skipToken
  );

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (inventoryCountsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const inventoryCounts = inventoryCountsResponse?.inventoryCounts || [];

  // Calculate summary stats
  const totalCounts = inventoryCounts.length;
  const pendingCounts = inventoryCounts.filter(count => count.status === 'pending').length;
  const completedCounts = inventoryCounts.filter(count => count.status === 'completed').length;
  const totalVarianceValue = inventoryCounts
    .filter(count => count.status === 'completed')
    .reduce((acc, count) => {
      const variance = count.results?.variance || { totalValue: 0 };
      return acc + Math.abs(variance.totalValue || 0);
    }, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Counts</h1>
          <p className="text-muted-foreground">
            Perform physical inventory counts and reconcile variances
          </p>
        </div>
        <Button onClick={() => setShowCreateCount(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Start New Count
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Counts</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCounts}</div>
            <p className="text-xs text-muted-foreground">
              All inventory counts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {pendingCounts}
            </div>
            <p className="text-xs text-muted-foreground">
              Ongoing counts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedCounts}
            </div>
            <p className="text-xs text-muted-foreground">
              Finished counts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalVarianceValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Variance value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Counts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Counts</CardTitle>
          <CardDescription>
            Track physical inventory counts and variance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory counts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full">Full Count</SelectItem>
                <SelectItem value="partial">Partial Count</SelectItem>
                <SelectItem value="cycle">Cycle Count</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Count ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryCounts?.length ? (
                  inventoryCounts.map((count) => {
                    const completedItems = count.items?.filter(item => item.actualQuantity !== null).length || 0;
                    const totalItems = count.items?.length || 0;
                    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                    const variance = count.results?.variance;
                    const hasVariance = variance && (variance.totalValue !== 0 || variance.items.length > 0);

                    return (
                      <TableRow key={count.id}>
                        <TableCell>
                          <div className="font-medium">{count.countId}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {count.type.charAt(0).toUpperCase() + count.type.slice(1)} Count
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {formatDate(count.scheduledDate)}
                            </div>
                            {count.completedAt && (
                              <div className="text-xs text-muted-foreground">
                                Completed: {formatDate(count.completedAt)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {progressPercentage}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {completedItems}/{totalItems} counted
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {count.status === 'completed' && variance ? (
                            <div className="space-y-1">
                              <div className={`text-sm font-medium flex items-center gap-1 ${
                                variance.totalValue > 0 ? 'text-green-600' :
                                variance.totalValue < 0 ? 'text-red-600' : 'text-muted-foreground'
                              }`}>
                                {variance.totalValue > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : variance.totalValue < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : null}
                                {formatCurrency(Math.abs(variance.totalValue))}
                              </div>
                              {variance.items.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {variance.items.length} variance{variance.items.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {count.status === 'pending' ? 'Pending' : 'No variance'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              count.status === 'completed' ? 'default' :
                              count.status === 'cancelled' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {count.status === 'pending' ? 'In Progress' :
                             count.status.charAt(0).toUpperCase() + count.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {count.status === 'pending' && (
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {inventoryCountsError
                          ? 'Error loading inventory counts'
                          : 'No inventory counts found'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Inventory Count Modal */}
      {showCreateCount && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Start New Inventory Count</CardTitle>
              <CardDescription>
                Schedule a physical inventory count to verify stock levels
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Count Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select count type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Count (All Items)</SelectItem>
                        <SelectItem value="partial">Partial Count (Selected Items)</SelectItem>
                        <SelectItem value="cycle">Cycle Count (Rotation)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Scheduled Date</label>
                    <Input type="date" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Category Filter</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="vegetables">Vegetables</SelectItem>
                      <SelectItem value="meat">Meat</SelectItem>
                      <SelectItem value="dairy">Dairy</SelectItem>
                      <SelectItem value="spices">Spices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Assigned Counter</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff1">John (Manager)</SelectItem>
                      <SelectItem value="staff2">Sarah (Chef)</SelectItem>
                      <SelectItem value="staff3">Mike (Assistant)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Instructions</label>
                  <Input placeholder="Special counting instructions" />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-900 dark:text-blue-100">
                        Best Practice
                      </div>
                      <div className="text-blue-700 dark:text-blue-200">
                        Schedule counts during low-activity periods for accuracy
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateCount(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1">
                    Start Inventory Count
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