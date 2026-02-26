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
  useSubmitTransferOrderMutation,
  useApproveTransferOrderMutation,
  useRejectTransferOrderMutation,
  useProcessTransferOrderMutation,
  useCancelTransferOrderMutation,
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
  Eye,
  Building2,
  Clock,
  CheckCircle,
  Search,
  Package,
  Trash2,
  X,
  Send,
  ThumbsUp,
  Ban,
  PackageCheck,
  XCircle,
} from 'lucide-react';
import { useBranchContext } from '@/contexts/BranchContext';

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-IN');

// helper: get _id from a possibly-populated field
const getId = (field: any): string =>
  typeof field === 'object' && field !== null ? (field._id?.toString() ?? '') : (field ?? '');

const getName = (field: any): string =>
  typeof field === 'object' && field !== null ? (field.name ?? '') : '';

export function TransferOrdersView() {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');

  // Create form state
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);
  const [toBranchId, setToBranchId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemQty, setSelectedItemQty] = useState('1');
  const [transferItems, setTransferItems] = useState<Array<{
    inventoryItemId: string;
    name: string;
    unit: string;
    requestedQuantity: number;
    currentStock: number;
  }>>([]);
  const [transferReason, setTransferReason] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferPriority, setTransferPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Action modal state
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [approveItems, setApproveItems] = useState<Array<{
    inventoryItemId: string; name: string; requestedQuantity: number; approvedQuantity: number;
  }>>([]);
  const [processItems, setProcessItems] = useState<Array<{
    inventoryItemId: string; name: string; approvedQuantity: number; transferredQuantity: number;
  }>>([]);

  // Queries
  const {
    data: transferOrdersResponse,
    isLoading: transferOrdersLoading,
    isError: transferOrdersError,
  } = useGetTransferOrdersQuery(
    restaurantId ? { restaurantId, search: searchQuery || undefined, status: statusFilter === 'all' ? undefined : statusFilter } : skipToken
  );

  const { data: branchesResponse, isLoading: branchesLoading } = useGetBranchesQuery();
  const { data: inventoryItems, isLoading: inventoryLoading } = useGetInventoryItemsByBranchQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id }
      : skipToken
  );

  // Mutations
  const [createTransfer, { isLoading: isCreating }] = useCreateTransferOrderMutation();
  const [submitTransfer, { isLoading: isSubmitting }] = useSubmitTransferOrderMutation();
  const [approveTransfer, { isLoading: isApproving }] = useApproveTransferOrderMutation();
  const [rejectTransfer, { isLoading: isRejecting }] = useRejectTransferOrderMutation();
  const [processTransfer, { isLoading: isProcessing }] = useProcessTransferOrderMutation();
  const [cancelTransfer, { isLoading: isCancelling }] = useCancelTransferOrderMutation();

  if (!session) return <Navigate to="/login" replace />;
  if (!restaurantId) return <Navigate to="/onboarding" replace />;
  if (transferOrdersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const branches = branchesResponse || [];
  const allTransfers = transferOrdersResponse?.transferOrders || [];

  // Filter by direction using populated fields
  const filteredOrders = allTransfers.filter(transfer => {
    const srcId = getId(transfer.sourceBranchId);
    const dstId = getId(transfer.destinationBranchId);
    const myId = currentBranch?._id ?? '';
    if (directionFilter === 'outgoing') return srcId === myId;
    if (directionFilter === 'incoming') return dstId === myId;
    return srcId === myId || dstId === myId;
  });

  // Stats
  const totalTransfers = filteredOrders.length;
  const pendingTransfers = filteredOrders.filter(o => o.status === 'pending').length;
  const completedTransfers = filteredOrders.filter(o => o.status === 'completed').length;
  const outgoingTransfers = allTransfers.filter(o => getId(o.sourceBranchId) === currentBranch?._id).length;

  // ── Form helpers ──────────────────────────────────────────────
  const resetForm = () => {
    setToBranchId('');
    setSelectedItemId('');
    setSelectedItemQty('1');
    setTransferItems([]);
    setTransferReason('');
    setTransferNotes('');
    setTransferPriority('normal');
  };

  const handleAddItem = () => {
    if (!selectedItemId || !inventoryItems) return;
    const item = inventoryItems.find(i => (i._id || i.id) === selectedItemId);
    if (!item) return;
    const qty = Number(selectedItemQty);
    if (!qty || qty <= 0) {
      toast({ title: 'Enter a valid quantity', variant: 'destructive' });
      return;
    }
    if (qty > item.stockLevels.currentStock) {
      toast({ title: `Only ${item.stockLevels.currentStock} ${item.unit} available`, variant: 'destructive' });
      return;
    }
    if (transferItems.some(t => t.inventoryItemId === selectedItemId)) {
      toast({ title: 'Item already added', variant: 'destructive' });
      return;
    }
    setTransferItems(prev => [...prev, {
      inventoryItemId: selectedItemId,
      name: item.name,
      unit: item.unit,
      requestedQuantity: qty,
      currentStock: item.stockLevels.currentStock,
    }]);
    setSelectedItemId('');
    setSelectedItemQty('1');
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTransfer = async () => {
    if (!restaurantId || !currentBranch?._id) return;
    if (!toBranchId) { toast({ title: 'Select a destination branch', variant: 'destructive' }); return; }
    if (transferItems.length === 0) { toast({ title: 'Add at least one item', variant: 'destructive' }); return; }
    if (!transferReason) { toast({ title: 'Select a reason', variant: 'destructive' }); return; }
    try {
      await createTransfer({
        restaurantId,
        sourceBranchId: currentBranch._id,
        destinationBranchId: toBranchId,
        items: transferItems.map(i => ({ inventoryItemId: i.inventoryItemId, requestedQuantity: i.requestedQuantity })),
        reason: transferReason,
        notes: transferNotes || undefined,
        priority: transferPriority,
      }).unwrap();
      toast({ title: 'Transfer order created successfully' });
      setShowCreateTransfer(false);
      resetForm();
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to create transfer order', variant: 'destructive' });
    }
  };

  // ── Action handlers ───────────────────────────────────────────
  const openAction = (transfer: any, modal: 'view' | 'submit' | 'approve' | 'reject' | 'process' | 'cancel') => {
    setSelectedTransfer(transfer);
    if (modal === 'approve') {
      setApproveItems((transfer.items || []).map((item: any) => ({
        inventoryItemId: getId(item.inventoryItemId),
        name: getName(item.inventoryItemId) || 'Unknown',
        requestedQuantity: item.requestedQuantity,
        approvedQuantity: item.requestedQuantity,
      })));
      setShowApproveModal(true);
    } else if (modal === 'process') {
      setProcessItems((transfer.items || []).filter((item: any) => item.status !== 'cancelled').map((item: any) => ({
        inventoryItemId: getId(item.inventoryItemId),
        name: getName(item.inventoryItemId) || 'Unknown',
        approvedQuantity: item.approvedQuantity,
        transferredQuantity: item.approvedQuantity,
      })));
      setShowProcessModal(true);
    } else if (modal === 'reject') {
      setRejectReason('');
      setShowRejectModal(true);
    } else if (modal === 'cancel') {
      setCancelReason('');
      setShowCancelModal(true);
    } else if (modal === 'view') {
      setShowViewModal(true);
    } else if (modal === 'submit') {
      setShowSubmitModal(true);
    }
  };

  const handleSubmit = async () => {
    if (!restaurantId || !selectedTransfer) return;
    try {
      await submitTransfer({ restaurantId, transferId: selectedTransfer._id }).unwrap();
      toast({ title: `${selectedTransfer.transferNumber} submitted for approval` });
      setShowSubmitModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to submit', variant: 'destructive' });
    }
  };

  const handleApprove = async () => {
    if (!restaurantId || !selectedTransfer) return;
    try {
      await approveTransfer({
        restaurantId,
        transferId: selectedTransfer._id,
        items: approveItems.map(i => ({ inventoryItemId: i.inventoryItemId, approvedQuantity: i.approvedQuantity })),
      }).unwrap();
      toast({ title: `${selectedTransfer.transferNumber} approved` });
      setShowApproveModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!restaurantId || !selectedTransfer || !rejectReason) return;
    try {
      await rejectTransfer({ restaurantId, transferId: selectedTransfer._id, reason: rejectReason }).unwrap();
      toast({ title: `${selectedTransfer.transferNumber} rejected` });
      setShowRejectModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to reject', variant: 'destructive' });
    }
  };

  const handleProcess = async () => {
    if (!restaurantId || !selectedTransfer) return;
    try {
      await processTransfer({
        restaurantId,
        transferId: selectedTransfer._id,
        items: processItems.map(i => ({ inventoryItemId: i.inventoryItemId, transferredQuantity: i.transferredQuantity })),
      }).unwrap();
      toast({ title: `${selectedTransfer.transferNumber} processed — stock updated` });
      setShowProcessModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to process', variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!restaurantId || !selectedTransfer || !cancelReason) return;
    try {
      await cancelTransfer({ restaurantId, transferId: selectedTransfer._id, reason: cancelReason }).unwrap();
      toast({ title: `${selectedTransfer.transferNumber} cancelled` });
      setShowCancelModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to cancel', variant: 'destructive' });
    }
  };

  const statusBadgeVariant = (status: string) => {
    if (status === 'completed') return 'default';
    if (status === 'cancelled' || status === 'rejected') return 'destructive';
    if (status === 'pending') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfer Orders</h1>
          <p className="text-muted-foreground">Manage inventory transfers between branches</p>
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
            <p className="text-xs text-muted-foreground">This branch (in + out)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingTransfers}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTransfers}</div>
            <p className="text-xs text-muted-foreground">Successfully transferred</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outgoing</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outgoingTransfers}</div>
            <p className="text-xs text-muted-foreground">Sent from this branch</p>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Orders</CardTitle>
          <CardDescription>Track inventory transfers between branches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by transfer number or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
                  <TableHead>Branch</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((transfer: any) => {
                    const srcId = getId(transfer.sourceBranchId);
                    const isOutgoing = srcId === currentBranch?._id;
                    const otherBranchName = isOutgoing
                      ? getName(transfer.destinationBranchId)
                      : getName(transfer.sourceBranchId);
                    const tid = transfer._id || transfer.id;

                    return (
                      <TableRow key={tid}>
                        <TableCell className="font-medium">{transfer.transferNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className={`h-4 w-4 ${isOutgoing ? 'text-red-500' : 'text-green-500'}`} />
                            <span className="text-sm">{isOutgoing ? 'Outgoing' : 'Incoming'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{otherBranchName || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(transfer.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transfer.items.length} item{transfer.items.length !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(transfer.status)}>
                            {transfer.status.replace('_', ' ').charAt(0).toUpperCase() + transfer.status.replace('_', ' ').slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* View */}
                            <Button variant="ghost" size="sm" onClick={() => openAction(transfer, 'view')} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* draft (outgoing): Submit for approval */}
                            {transfer.status === 'draft' && isOutgoing && (
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => openAction(transfer, 'submit')} title="Submit for Approval">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}

                            {/* pending: Approve + Reject (manager of destination or any manager) */}
                            {transfer.status === 'pending' && (<>
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800" onClick={() => openAction(transfer, 'approve')} title="Approve">
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => openAction(transfer, 'reject')} title="Reject">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>)}

                            {/* approved (outgoing): Process/Dispatch */}
                            {transfer.status === 'approved' && isOutgoing && (
                              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-800" onClick={() => openAction(transfer, 'process')} title="Dispatch Items">
                                <PackageCheck className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Cancel: allowed for draft, pending, approved */}
                            {['draft', 'pending', 'approved'].includes(transfer.status) && (
                              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700" onClick={() => openAction(transfer, 'cancel')} title="Cancel">
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {transferOrdersError ? 'Error loading transfer orders' : 'No transfer orders found'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create Transfer Order Modal ── */}
      {showCreateTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Create Transfer Order</CardTitle>
                <CardDescription>Transfer inventory items between branches</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateTransfer(false); resetForm(); }}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">

              {/* From / To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">From Branch</label>
                  <Input value={currentBranch?.name || ''} disabled className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">To Branch *</label>
                  <Select value={toBranchId} onValueChange={setToBranchId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={branchesLoading ? 'Loading...' : 'Select destination branch'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches
                        .filter((b: any) => b._id !== currentBranch?._id)
                        .map((branch: any) => (
                          <SelectItem key={branch._id} value={branch._id}>
                            {branch.name}
                            {branch.address?.city && <span className="text-muted-foreground ml-2">({branch.address.city})</span>}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={transferPriority} onValueChange={(v: any) => setTransferPriority(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Add Items */}
              <div>
                <label className="text-sm font-medium">Items to Transfer *</label>
                <div className="border rounded-lg p-3 mt-1 space-y-3">
                  <div className="flex gap-2">
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={inventoryLoading ? 'Loading items...' : 'Select item'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(inventoryItems || [])
                          .filter(item => item.stockLevels.currentStock > 0)
                          .map((item: any) => {
                            const itemId = item._id || item.id;
                            return (
                              <SelectItem key={itemId} value={itemId}>
                                {item.name}
                                <span className="text-muted-foreground ml-2">
                                  ({item.stockLevels.currentStock} {item.unit})
                                </span>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={selectedItemQty}
                      onChange={e => setSelectedItemQty(e.target.value)}
                      className="w-24"
                    />
                    <Button variant="outline" onClick={handleAddItem} disabled={!selectedItemId}>
                      Add
                    </Button>
                  </div>

                  {transferItems.length > 0 ? (
                    <div className="space-y-2">
                      {transferItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {item.requestedQuantity} {item.unit}
                              <span className="text-xs ml-1">(of {item.currentStock} available)</span>
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No items added yet. Select an item and click Add.
                    </p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-sm font-medium">Reason *</label>
                <Select value={transferReason} onValueChange={setTransferReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select reason for transfer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock_rebalance">Stock Rebalancing</SelectItem>
                    <SelectItem value="high_demand">High Demand at Destination</SelectItem>
                    <SelectItem value="excess_stock">Excess Stock at Source</SelectItem>
                    <SelectItem value="expiry_risk">Expiry Risk — Move Before Expiry</SelectItem>
                    <SelectItem value="emergency">Emergency Supply</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input
                  className="mt-1"
                  placeholder="Additional notes or instructions..."
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                />
              </div>
            </CardContent>

            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => { setShowCreateTransfer(false); resetForm(); }} className="flex-1" disabled={isCreating}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateTransfer}
                disabled={isCreating || !toBranchId || transferItems.length === 0 || !transferReason}
              >
                {isCreating ? 'Creating...' : `Create Transfer (${transferItems.length} item${transferItems.length !== 1 ? 's' : ''})`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── View Modal ── */}
      {showViewModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{selectedTransfer.transferNumber}</CardTitle>
                <CardDescription>
                  {getName(selectedTransfer.sourceBranchId)} → {getName(selectedTransfer.destinationBranchId)}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowViewModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
                  <div className="mt-1"><Badge variant={statusBadgeVariant(selectedTransfer.status)}>{selectedTransfer.status.replace('_', ' ')}</Badge></div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Priority</label>
                  <div className="text-sm mt-1 capitalize">{selectedTransfer.priority}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Reason</label>
                  <div className="text-sm mt-1">{selectedTransfer.reason?.replace('_', ' ')}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Created</label>
                  <div className="text-sm mt-1">{formatDate(selectedTransfer.createdAt)}</div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Requested</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead className="text-right">Transferred</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedTransfer.items || []).map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{getName(item.inventoryItemId) || 'Unknown'}</TableCell>
                        <TableCell className="text-right">{item.requestedQuantity}</TableCell>
                        <TableCell className="text-right">{item.approvedQuantity || '—'}</TableCell>
                        <TableCell className="text-right">{item.transferredQuantity || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedTransfer.notes && (
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 text-sm">
                  <span className="font-medium">Notes: </span>{selectedTransfer.notes}
                </div>
              )}

              {selectedTransfer.tracking?.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 rounded-lg p-3 text-sm">
                  <span className="font-medium text-red-700">Rejection reason: </span>
                  {selectedTransfer.tracking.rejectionReason}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Submit Modal ── */}
      {showSubmitModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Submit for Approval</CardTitle>
              <CardDescription>{selectedTransfer.transferNumber} · {selectedTransfer.items?.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This will submit the transfer order to managers for approval. Once submitted, it cannot be edited.
              </p>
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowSubmitModal(false)} className="flex-1" disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {showApproveModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2"><ThumbsUp className="h-5 w-5 text-green-600" /> Approve Transfer</CardTitle>
                <CardDescription>{selectedTransfer.transferNumber}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowApproveModal(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[calc(90vh-200px)] space-y-3">
              <p className="text-sm text-muted-foreground">Confirm or adjust the approved quantity for each item:</p>
              {approveItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4 border rounded-lg p-3">
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">Requested: {item.requestedQuantity}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Approve:</label>
                    <Input
                      type="number"
                      min="0"
                      max={item.requestedQuantity}
                      className="w-24"
                      value={item.approvedQuantity}
                      onChange={e => setApproveItems(prev => prev.map((it, idx) => idx === i ? { ...it, approvedQuantity: Number(e.target.value) } : it))}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowApproveModal(false)} className="flex-1" disabled={isApproving}>Cancel</Button>
              <Button onClick={handleApprove} disabled={isApproving} className="flex-1 bg-green-600 hover:bg-green-700">
                {isApproving ? 'Approving...' : 'Approve Transfer'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {showRejectModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" /> Reject Transfer</CardTitle>
              <CardDescription>{selectedTransfer.transferNumber}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="text-sm font-medium">Reason for Rejection *</label>
              <Input placeholder="e.g. Insufficient justification, wrong items..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1" disabled={isRejecting}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectReason} className="flex-1">
                {isRejecting ? 'Rejecting...' : 'Reject Transfer'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Process / Dispatch Modal ── */}
      {showProcessModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-orange-600" /> Dispatch Items</CardTitle>
                <CardDescription>{selectedTransfer.transferNumber} · Enter actual quantities dispatched</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowProcessModal(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[calc(90vh-200px)] space-y-3">
              {processItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4 border rounded-lg p-3">
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">Approved: {item.approvedQuantity}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Dispatching:</label>
                    <Input
                      type="number"
                      min="0"
                      max={item.approvedQuantity}
                      className="w-24"
                      value={item.transferredQuantity}
                      onChange={e => setProcessItems(prev => prev.map((it, idx) => idx === i ? { ...it, transferredQuantity: Number(e.target.value) } : it))}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Stock will be deducted from this branch and added to the destination branch immediately.</p>
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowProcessModal(false)} className="flex-1" disabled={isProcessing}>Cancel</Button>
              <Button onClick={handleProcess} disabled={isProcessing} className="flex-1 bg-orange-600 hover:bg-orange-700">
                {isProcessing ? 'Processing...' : 'Confirm Dispatch'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      {showCancelModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-gray-600" /> Cancel Transfer</CardTitle>
              <CardDescription>{selectedTransfer.transferNumber}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="text-sm font-medium">Reason for Cancellation *</label>
              <Input placeholder="Why is this transfer being cancelled?" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowCancelModal(false)} className="flex-1" disabled={isCancelling}>Back</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={isCancelling || !cancelReason} className="flex-1">
                {isCancelling ? 'Cancelling...' : 'Cancel Transfer'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
