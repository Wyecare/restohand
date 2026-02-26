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
  useGetTransferOrdersQuery,
  useCreateTransferOrderMutation,
} from '@/store/api/transferOrdersApi';
import {
  useGetBranchesQuery,
} from '@/store/api/branchesApi';
import {
  useGetInventoryItemsByBranchQuery,
} from '@/store/api/inventoryApi';
import {
  ArrowRightLeft,
  Plus,
  Edit,
  Eye,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Package,
} from 'lucide-react';
import { useBranchContext } from '@/contexts/BranchContext';

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-IN');

export function TransferOrdersView() {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);

  const {
    data: transferOrdersResponse,
    isLoading: transferOrdersLoading,
    isError: transferOrdersError,
  } = useGetTransferOrdersQuery(
    restaurantId && currentBranch?._id
      ? {
          restaurantId,
          branchId: currentBranch._id,
          search: searchQuery || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }
      : skipToken
  );

  const {
    data: branchesResponse,
    isLoading: branchesLoading,
  } = useGetBranchesQuery();

  const {
    data: inventoryItems,
    isLoading: inventoryLoading,
  } = useGetInventoryItemsByBranchQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id }
      : skipToken
  );

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (transferOrdersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const transferOrders = transferOrdersResponse?.transferOrders || [];
  const branches = branchesResponse || []; // branchesResponse is directly an array

  // Filter by direction (incoming/outgoing)
  const filteredOrders = transferOrders.filter(order => {
    if (directionFilter === 'outgoing') {
      return order.fromBranch === currentBranch?._id;
    }
    if (directionFilter === 'incoming') {
      return order.toBranch === currentBranch?._id;
    }
    return true; // 'all'
  });

  // Calculate summary stats
  const totalTransfers = filteredOrders.length;
  const pendingTransfers = filteredOrders.filter(order => order.status === 'pending').length;
  const completedTransfers = filteredOrders.filter(order => order.status === 'completed').length;
  const outgoingTransfers = transferOrders.filter(order => order.fromBranch === currentBranch?._id).length;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfer Orders</h1>
          <p className="text-muted-foreground">
            Manage inventory transfers between branches
          </p>
        </div>
        <Button onClick={() => setShowCreateTransfer(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Transfer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransfers}</div>
            <p className="text-xs text-muted-foreground">
              All transfer orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {pendingTransfers}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting completion
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
              {completedTransfers}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully transferred
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outgoing</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outgoingTransfers}
            </div>
            <p className="text-xs text-muted-foreground">
              From this branch
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Orders</CardTitle>
          <CardDescription>
            Track inventory transfers between your branches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transfer orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transfers</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>From/To Branch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.length ? (
                  filteredOrders.map((transfer) => {
                    const isOutgoing = transfer.fromBranch === currentBranch?._id;
                    const otherBranchName = isOutgoing
                      ? transfer.toBranchDetails?.name
                      : transfer.fromBranchDetails?.name;

                    return (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          <div className="font-medium">{transfer.transferNumber}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className={`h-4 w-4 ${
                              isOutgoing ? 'text-red-500 rotate-90' : 'text-green-500 -rotate-90'
                            }`} />
                            <span className="text-sm">
                              {isOutgoing ? 'Outgoing' : 'Incoming'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{otherBranchName || 'Unknown Branch'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(transfer.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transfer.items.length} item{transfer.items.length !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transfer.status === 'completed' ? 'default' :
                              transfer.status === 'cancelled' ? 'destructive' :
                              transfer.status === 'pending' ? 'secondary' : 'outline'
                            }
                          >
                            {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {transferOrdersError
                          ? 'Error loading transfer orders'
                          : 'No transfer orders found'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Transfer Order Modal */}
      {showCreateTransfer && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Create Transfer Order</CardTitle>
              <CardDescription>
                Transfer inventory items between branches
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From Branch</label>
                    <Input value={currentBranch?.name || ''} disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Branch</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select destination branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.length > 0 ? (
                          branches
                            .filter(branch => branch._id !== currentBranch?._id) // Don't show current branch
                            .map((branch) => (
                              <SelectItem key={branch._id} value={branch._id}>
                                {branch.name}
                                <span className="text-muted-foreground ml-2">
                                  ({branch.address?.city || 'No location'})
                                </span>
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="no-branches" disabled>
                            {branchesLoading ? "Loading..." : "No other branches found"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Items to Transfer</label>
                  <div className="border rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={inventoryLoading ? "Loading items..." : "Select inventory item"} />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems && inventoryItems.length > 0 ? (
                            inventoryItems
                              .filter(item => item.stockLevels.currentStock > 0) // Only show items with stock
                              .map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                  <span className="text-muted-foreground ml-2">
                                    ({item.stockLevels.currentStock} {item.unit} available)
                                  </span>
                                </SelectItem>
                              ))
                          ) : (
                            <SelectItem value="no-items" disabled>
                              {inventoryLoading ? "Loading..." : "No items with stock available"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm">Add Item</Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      No items added yet. Select items with available stock to transfer.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Reason for Transfer</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock-rebalance">Stock Rebalancing</SelectItem>
                      <SelectItem value="demand">High Demand</SelectItem>
                      <SelectItem value="excess">Excess Stock</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Input placeholder="Additional notes or instructions" />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateTransfer(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1">
                    Create Transfer Order
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