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
  useGetPurchaseOrdersQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
  useSendPurchaseOrderMutation,
  useAcknowledgePurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useGeneratePurchaseOrderPdfMutation,
  useRecordInvoiceMutation,
  useRecordPaymentMutation,
  useClosePurchaseOrderMutation,
  useGenerateInvoiceReceiptPdfMutation,
} from '@/store/api/purchaseOrdersApi';
import {
  useGetSuppliersQuery,
} from '@/store/api/suppliersApi';
import {
  useGetInventoryItemsByBranchQuery,
} from '@/store/api/inventoryApi';
import {
  ShoppingCart,
  Plus,
  Edit,
  Eye,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Send,
  PackageCheck,
  ReceiptText,
  CreditCard,
  ThumbsUp,
  Ban,
  Lock,
  Download,
} from 'lucide-react';
import { useBranchContext } from '@/contexts/BranchContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-IN');

export function PurchaseOrdersView() {
  const session = useAppSelector(selectAuthSession);
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showViewPO, setShowViewPO] = useState(false);
  const [showEditPO, setShowEditPO] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Action modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showAckModal, setShowAckModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Acknowledge form
  const [ackMethod, setAckMethod] = useState('email');

  // Cancel form
  const [cancelReason, setCancelReason] = useState('');

  // Receive form
  const [receiveItems, setReceiveItems] = useState<Array<{
    inventoryItemId: string; name: string; unit: string;
    ordered: number; alreadyReceived: number; receivedQuantity: number; actualUnitCost: number;
  }>>([]);
  const [receiveNotes, setReceiveNotes] = useState('');

  // Invoice form
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'bank_transfer'|'cheque'|'upi'|'credit'>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleViewPO = (po: any) => {
    setSelectedPO(po);
    setShowViewPO(true);
  };

  const handleEditPO = (po: any) => {
    setSelectedPO(po);
    setEditDeliveryDate(
      po.delivery?.expectedDate
        ? new Date(po.delivery.expectedDate).toISOString().split('T')[0]
        : ''
    );
    setEditNotes(po.notes || '');
    setEditItems(
      (po.items || []).map((item: any) => ({
        inventoryItemId: item.inventoryItemId?._id || item.inventoryItemId,
        name: item.inventoryItemId?.name || 'Unknown Item',
        unit: item.inventoryItemId?.unit || '',
        quantity: item.quantity,
        unitCost: item.unitCost,
      }))
    );
    setShowEditPO(true);
  };

  const handleSaveEditPO = async () => {
    if (!selectedPO || !restaurantId) return;
    try {
      await updatePurchaseOrder({
        restaurantId,
        poId: selectedPO._id,
        items: editItems.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
        delivery: {
          expectedDate: editDeliveryDate || undefined,
        },
        notes: editNotes,
      }).unwrap();
      toast({ title: 'Purchase order updated successfully' });
      setShowEditPO(false);
    } catch {
      toast({ title: 'Failed to update purchase order', variant: 'destructive' });
    }
  };

  const handleDownloadPdf = async (po: any) => {
    if (!restaurantId) return;
    try {
      const blob = await generatePdf({ restaurantId, poId: po._id }).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${po.poNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const openAction = (po: any, modal: 'approve'|'send'|'ack'|'receive'|'cancel'|'invoice'|'payment') => {
    setSelectedPO(po);
    if (modal === 'receive') {
      setReceiveItems((po.items || []).map((item: any) => ({
        inventoryItemId: item.inventoryItemId?._id || item.inventoryItemId,
        name: item.inventoryItemId?.name || 'Unknown',
        unit: item.inventoryItemId?.unit || '',
        ordered: item.quantity,
        alreadyReceived: item.receivedQuantity || 0,
        receivedQuantity: item.quantity - (item.receivedQuantity || 0),
        actualUnitCost: item.unitCost,
      })));
      setReceiveNotes('');
      setShowReceiveModal(true);
    } else if (modal === 'cancel') {
      setCancelReason('');
      setShowCancelModal(true);
    } else if (modal === 'invoice') {
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setInvoiceAmount(String(po.totalAmount));
      setInvoiceNotes('');
      setShowInvoiceModal(true);
    } else if (modal === 'payment') {
      setPaymentAmount(String((po.invoice?.invoiceAmount ?? po.totalAmount) - (po.payment?.paidAmount ?? 0)));
      setPaymentMethod('bank_transfer');
      setPaymentReference('');
      setPaymentNotes('');
      setShowPaymentModal(true);
    } else if (modal === 'approve') { setShowApproveModal(true);
    } else if (modal === 'send') { setShowSendModal(true);
    } else if (modal === 'ack') { setAckMethod('email'); setShowAckModal(true); }
  };

  const handleApprove = async () => {
    if (!restaurantId || !selectedPO) return;
    try {
      await approvePO({ restaurantId, poId: selectedPO._id }).unwrap();
      toast({ title: `PO ${selectedPO.poNumber} approved — ready to send to supplier` });
      setShowApproveModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!restaurantId || !selectedPO) return;
    try {
      await sendPO({ restaurantId, poId: selectedPO._id }).unwrap();
      toast({ title: `PO ${selectedPO.poNumber} emailed to supplier` });
      setShowSendModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to send', variant: 'destructive' });
    }
  };

  const handleAcknowledge = async () => {
    if (!restaurantId || !selectedPO) return;
    try {
      await acknowledgePO({ restaurantId, poId: selectedPO._id, acknowledgmentMethod: ackMethod }).unwrap();
      toast({ title: `PO ${selectedPO.poNumber} marked as acknowledged` });
      setShowAckModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to acknowledge', variant: 'destructive' });
    }
  };

  const handleReceive = async () => {
    if (!restaurantId || !selectedPO) return;
    try {
      await receivePO({
        restaurantId,
        poId: selectedPO._id,
        items: receiveItems.map(i => ({
          inventoryItemId: i.inventoryItemId,
          receivedQuantity: i.receivedQuantity,
          actualUnitCost: i.actualUnitCost,
        })),
        notes: receiveNotes || undefined,
      }).unwrap();
      toast({ title: `Items received — inventory updated` });
      setShowReceiveModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to receive items', variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!restaurantId || !selectedPO) return;
    try {
      await cancelPO({ restaurantId, poId: selectedPO._id, reason: cancelReason }).unwrap();
      toast({ title: `PO ${selectedPO.poNumber} cancelled` });
      setShowCancelModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to cancel', variant: 'destructive' });
    }
  };

  const handleRecordInvoice = async () => {
    if (!restaurantId || !selectedPO) return;
    try {
      await recordInvoice({
        restaurantId, poId: selectedPO._id,
        invoiceNumber, invoiceDate,
        invoiceAmount: Number(invoiceAmount),
        notes: invoiceNotes || undefined,
      }).unwrap();
      toast({ title: `Invoice ${invoiceNumber} recorded` });
      setShowInvoiceModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to record invoice', variant: 'destructive' });
    }
  };

  const handleRecordPayment = async () => {
    if (!restaurantId || !selectedPO) return;
    try {
      await recordPayment({
        restaurantId, poId: selectedPO._id,
        paidAmount: Number(paymentAmount),
        method: paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      }).unwrap();
      toast({ title: `Payment of ${formatCurrency(Number(paymentAmount))} recorded` });
      setShowPaymentModal(false);
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to record payment', variant: 'destructive' });
    }
  };

  const handleClose = async (po: any) => {
    if (!restaurantId) return;
    try {
      await closePO({ restaurantId, poId: po._id }).unwrap();
      toast({ title: `PO ${po.poNumber} closed` });
    } catch (e: any) {
      toast({ title: e?.data?.message || 'Failed to close', variant: 'destructive' });
    }
  };

  const handleDownloadInvoicePdf = async (po: any) => {
    if (!restaurantId) return;
    try {
      const blob = await downloadInvoicePdf({ restaurantId, poId: po._id }).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-Receipt-${po.poNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Failed to generate invoice PDF', variant: 'destructive' });
    }
  };

  // PO Form State
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    currentStock: number;
  }>>([]);

  const {
    data: purchaseOrdersResponse,
    isLoading: purchaseOrdersLoading,
    isError: purchaseOrdersError,
  } = useGetPurchaseOrdersQuery(
    restaurantId && currentBranch?._id
      ? {
          restaurantId,
          branchId: currentBranch._id,
          search: searchQuery || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          page: currentPage,
          limit: pageSize,
        }
      : skipToken
  );

  const {
    data: suppliersResponse,
    isLoading: suppliersLoading,
  } = useGetSuppliersQuery(
    restaurantId
      ? { restaurantId, isActive: true }
      : skipToken
  );

  const {
    data: inventoryItems,
    isLoading: inventoryLoading,
  } = useGetInventoryItemsByBranchQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id }
      : skipToken
  );

  const [createPurchaseOrder, { isLoading: isCreating }] = useCreatePurchaseOrderMutation();
  const [updatePurchaseOrder, { isLoading: isUpdating }] = useUpdatePurchaseOrderMutation();
  const [approvePO, { isLoading: isApproving }] = useApprovePurchaseOrderMutation();
  const [sendPO, { isLoading: isSending }] = useSendPurchaseOrderMutation();
  const [acknowledgePO, { isLoading: isAcknowledging }] = useAcknowledgePurchaseOrderMutation();
  const [receivePO, { isLoading: isReceiving }] = useReceivePurchaseOrderMutation();
  const [cancelPO, { isLoading: isCancelling }] = useCancelPurchaseOrderMutation();
  const [generatePdf, { isLoading: isGeneratingPdf }] = useGeneratePurchaseOrderPdfMutation();
  const [recordInvoice, { isLoading: isRecordingInvoice }] = useRecordInvoiceMutation();
  const [recordPayment, { isLoading: isRecordingPayment }] = useRecordPaymentMutation();
  const [closePO, { isLoading: isClosing }] = useClosePurchaseOrderMutation();
  const [downloadInvoicePdf, { isLoading: isDownloadingInvoice }] = useGenerateInvoiceReceiptPdfMutation();

  // Edit form state (controlled)
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<Array<{
    inventoryItemId: string;
    name: string;
    unit: string;
    quantity: number;
    unitCost: number;
  }>>([]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  if (purchaseOrdersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const purchaseOrders = purchaseOrdersResponse?.purchaseOrders || [];
  const suppliers = suppliersResponse?.suppliers || [];

  // Helper functions
  const handleAddItem = () => {
    if (!selectedInventoryItem || !itemQuantity || parseFloat(itemQuantity) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please select an item and enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    const item = inventoryItems?.find(inv => inv._id === selectedInventoryItem);
    if (!item) return;

    // Check if item already exists in the list
    const existingItemIndex = poItems.findIndex(poItem => poItem.itemId === selectedInventoryItem);

    if (existingItemIndex >= 0) {
      // Update quantity if item already exists
      const updatedItems = [...poItems];
      updatedItems[existingItemIndex].quantity += parseFloat(itemQuantity);
      setPoItems(updatedItems);
    } else {
      // Add new item
      setPoItems([...poItems, {
        itemId: item._id,
        itemName: item.name,
        quantity: parseFloat(itemQuantity),
        unit: item.unit,
        currentStock: item.stockLevels.currentStock,
      }]);
    }

    // Reset form
    setSelectedInventoryItem('');
    setItemQuantity('');
  };

  const handleRemoveItem = (itemId: string) => {
    setPoItems(poItems.filter(item => item.itemId !== itemId));
  };

  const handleCreatePurchaseOrder = async () => {
    if (!selectedSupplier || poItems.length === 0 || !restaurantId || !currentBranch?._id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a supplier and add at least one item',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Prepare the payload
      const createPayload = {
        restaurantId,
        branchId: currentBranch._id,
        supplierId: selectedSupplier,
        items: poItems.map(item => {
          // Find the inventory item to get the unit cost
          const inventoryItem = inventoryItems?.find(inv => inv._id === item.itemId);
          const unitCost = inventoryItem?.pricing?.costPerUnit || 0;

          return {
            inventoryItemId: item.itemId,
            quantity: item.quantity,
            unitCost: unitCost,
            notes: '',
          };
        }),
        delivery: deliveryDate ? {
          expectedDate: deliveryDate,
          deliveryInstructions: poNotes || undefined,
        } : undefined,
        notes: poNotes || undefined,
      };

      const result = await createPurchaseOrder(createPayload).unwrap();

      toast({
        title: 'Success',
        description: `Purchase Order ${result.poNumber} created successfully`,
      });

      // Close dialog and reset form
      setShowCreatePO(false);
      resetPOForm();
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to create purchase order',
        variant: 'destructive',
      });
    }
  };

  const resetPOForm = () => {
    setSelectedSupplier('');
    setDeliveryDate('');
    setSelectedInventoryItem('');
    setItemQuantity('');
    setPoNotes('');
    setPoItems([]);
  };

  // Calculate summary stats
  const totalPOs = purchaseOrders.length;
  const pendingPOs = purchaseOrders.filter(po => po.status === 'pending').length;
  const totalValue = purchaseOrders.reduce((acc, po) => acc + po.totalAmount, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Create and manage purchase orders with suppliers
          </p>
        </div>
        <Button onClick={() => setShowCreatePO(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPOs}</div>
            <p className="text-xs text-muted-foreground">
              All purchase orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {pendingPOs}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting delivery
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
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total order value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {purchaseOrders.filter(po => {
                const poDate = new Date(po.createdAt);
                const now = new Date();
                return poDate.getMonth() === now.getMonth() && poDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Orders this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            Track your purchase orders and delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search purchase orders..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders?.length ? (
                  purchaseOrders.map((po) => (
                    <TableRow key={po._id}>
                      <TableCell>
                        <div className="font-medium">{po.poNumber}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{po.supplierId?.name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {po.supplierId?.supplierCode || ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(po.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {po.items.length} item{po.items.length !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(po.totalAmount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            po.status === 'delivered' ? 'default' :
                            po.status === 'cancelled' ? 'destructive' :
                            po.status === 'pending' ? 'secondary' : 'outline'
                          }
                        >
                          {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Always available */}
                          <Button variant="ghost" size="sm" onClick={() => handleViewPO(po)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadPdf(po)} disabled={isGeneratingPdf} title="Download PDF">
                            <FileText className="h-4 w-4" />
                          </Button>

                          {/* draft: Edit + Approve + Cancel */}
                          {po.status === 'draft' && (<>
                            <Button variant="ghost" size="sm" onClick={() => handleEditPO(po)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800" onClick={() => openAction(po, 'approve')} title="Approve PO">
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => openAction(po, 'cancel')} title="Cancel PO">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>)}

                          {/* pending: Send to Supplier + Cancel */}
                          {po.status === 'pending' && (<>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => openAction(po, 'send')} title="Send to Supplier">
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => openAction(po, 'cancel')} title="Cancel PO">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>)}

                          {/* sent: Acknowledge + Receive + Cancel */}
                          {po.status === 'sent' && (<>
                            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-800" onClick={() => openAction(po, 'ack')} title="Mark Acknowledged">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-800" onClick={() => openAction(po, 'receive')} title="Receive Items">
                              <PackageCheck className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => openAction(po, 'cancel')} title="Cancel PO">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>)}

                          {/* acknowledged: Receive + Cancel */}
                          {po.status === 'acknowledged' && (<>
                            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-800" onClick={() => openAction(po, 'receive')} title="Receive Items">
                              <PackageCheck className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => openAction(po, 'cancel')} title="Cancel PO">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>)}

                          {/* partial: Receive More + Invoice/Payment + Invoice actions + Close */}
                          {po.status === 'partial' && (<>
                            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-800" onClick={() => openAction(po, 'receive')} title="Receive More">
                              <PackageCheck className="h-4 w-4" />
                            </Button>
                            {!po.invoice?.invoiceNumber ? (
                              <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-800" onClick={() => openAction(po, 'invoice')} title="Record Invoice">
                                <ReceiptText className="h-4 w-4" />
                              </Button>
                            ) : (<>
                              {po.payment?.status !== 'paid' && (
                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800" onClick={() => openAction(po, 'payment')} title="Record Payment">
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleDownloadInvoicePdf(po)} disabled={isDownloadingInvoice} title="Download Invoice PDF">
                                <Download className="h-4 w-4" />
                              </Button>
                            </>)}
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800" onClick={() => handleClose(po)} disabled={isClosing} title="Close PO">
                              <Lock className="h-4 w-4" />
                            </Button>
                          </>)}

                          {/* delivered: Record Invoice + Record Payment + Download + Close */}
                          {po.status === 'delivered' && (<>
                            {!po.invoice?.invoiceNumber ? (
                              <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-800" onClick={() => openAction(po, 'invoice')} title="Record Invoice">
                                <ReceiptText className="h-4 w-4" />
                              </Button>
                            ) : (<>
                              {po.payment?.status !== 'paid' && (
                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800" onClick={() => openAction(po, 'payment')} title="Record Payment">
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleDownloadInvoicePdf(po)} disabled={isDownloadingInvoice} title="Download Invoice PDF">
                                <Download className="h-4 w-4" />
                              </Button>
                            </>)}
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800" onClick={() => handleClose(po)} disabled={isClosing} title="Close PO">
                              <Lock className="h-4 w-4" />
                            </Button>
                          </>)}

                          {/* closed: Download Invoice PDF */}
                          {po.status === 'closed' && po.invoice?.invoiceNumber && (
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleDownloadInvoicePdf(po)} disabled={isDownloadingInvoice} title="Download Invoice PDF">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {purchaseOrdersError
                          ? 'Error loading purchase orders'
                          : 'No purchase orders found'}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {purchaseOrdersResponse && purchaseOrdersResponse.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, purchaseOrdersResponse.total)} of {purchaseOrdersResponse.total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-1">
                  <span className="text-sm">Page {currentPage} of {purchaseOrdersResponse.totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === purchaseOrdersResponse.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(purchaseOrdersResponse.totalPages)}
                  disabled={currentPage === purchaseOrdersResponse.totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Purchase Order Modal */}
      {showCreatePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="bg-background border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Create Purchase Order</CardTitle>
              <CardDescription>
                Create a new purchase order to order supplies from vendors
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Supplier *</label>
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={suppliersLoading ? "Loading suppliers..." : "Select supplier"} />
                      </SelectTrigger>
                      <SelectContent className="max-w-[400px]">
                        {suppliers.length > 0 ? (
                          suppliers.map((supplier) => (
                            <SelectItem key={supplier._id} value={supplier._id} className="cursor-pointer">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{supplier.name}</span>
                                {supplier.contact?.contactPerson && (
                                  <span className="text-xs text-muted-foreground">
                                    Contact: {supplier.contact.contactPerson}
                                  </span>
                                )}
                                {supplier.contact?.phone && (
                                  <span className="text-xs text-muted-foreground">
                                    Phone: {supplier.contact.phone}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-suppliers" disabled>
                            {suppliersLoading ? "Loading..." : "No suppliers found"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expected Delivery Date</label>
                    <Input
                      type="date"
                      className="w-full"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Items to Order</label>
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/20">
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <Select
                        value={selectedInventoryItem}
                        onValueChange={(value) => {
                          setSelectedInventoryItem(value);

                          // Auto-fill suggested reorder quantity
                          if (value) {
                            const selectedItem = inventoryItems?.find(inv => inv._id === value);
                            if (selectedItem) {
                              const currentStock = selectedItem.stockLevels.currentStock;
                              const reorderQuantity = selectedItem.stockLevels.reorderQuantity;
                              const minimumStock = selectedItem.stockLevels.minimumStock;

                              // Calculate suggested quantity: reorder quantity OR amount to reach minimum stock
                              const suggestedQty = Math.max(reorderQuantity, minimumStock - currentStock);

                              if (suggestedQty > 0) {
                                setItemQuantity(suggestedQty.toString());
                              }
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1 min-w-0">
                          <SelectValue placeholder={inventoryLoading ? "Loading items..." : "Select inventory item"} />
                        </SelectTrigger>
                        <SelectContent className="max-w-[350px]">
                          {inventoryItems && inventoryItems.length > 0 ? (
                            inventoryItems.map((item) => (
                              <SelectItem key={item._id} value={item._id} className="cursor-pointer">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Stock: {item.stockLevels.currentStock} {item.unit}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-items" disabled>
                              {inventoryLoading ? "Loading..." : "No inventory items found"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Qty"
                          className="w-24"
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(e.target.value)}
                          title={selectedInventoryItem ? "Auto-filled based on reorder settings" : "Enter quantity"}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={handleAddItem}
                          disabled={!selectedInventoryItem || !itemQuantity}
                        >
                          Add Item
                        </Button>
                      </div>
                    </div>

                    {/* Added Items List */}
                    {poItems.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Items to Order ({poItems.length})</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {poItems.map((item) => (
                            <div key={item.itemId} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border">
                              <div className="flex-1">
                                <div className="font-medium">{item.itemName}</div>
                                <div className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity} {item.unit} | Current Stock: {item.currentStock} {item.unit}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.itemId)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded">
                        No items added yet. Select items from your inventory to order.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Special Instructions</label>
                  <textarea
                    placeholder="Special instructions or notes for the supplier..."
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>

            <div className="flex-shrink-0 p-6 pt-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreatePO(false);
                    resetPOForm();
                  }}
                  className="flex-1"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedSupplier || poItems.length === 0 || isCreating}
                  onClick={handleCreatePurchaseOrder}
                >
                  {isCreating ? 'Creating...' : `Create Purchase Order (${poItems.length} items)`}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* View Purchase Order Modal */}
      {showViewPO && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-2xl">Purchase Order Details</CardTitle>
                <CardDescription>
                  {selectedPO.poNumber} • {selectedPO.supplierId?.name}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowViewPO(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* PO Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge
                      variant={
                        selectedPO.status === 'delivered' ? 'default' :
                        selectedPO.status === 'cancelled' ? 'destructive' :
                        selectedPO.status === 'pending' ? 'secondary' : 'outline'
                      }
                    >
                      {selectedPO.status.charAt(0).toUpperCase() + selectedPO.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Branch</label>
                    <div className="text-sm">{selectedPO.branchId?.name || 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                    <div className="text-sm">{formatDate(selectedPO.createdAt)}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                    <div className="text-lg font-semibold">{formatCurrency(selectedPO.totalAmount)}</div>
                  </div>
                </div>

                {/* Supplier Information */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Supplier Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Supplier Name</label>
                        <div className="text-sm">{selectedPO.supplierId?.name || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Supplier Code</label>
                        <div className="text-sm">{selectedPO.supplierId?.supplierCode || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                        <div className="text-sm">{selectedPO.supplierId?.contact?.contactPerson || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <div className="text-sm">{selectedPO.supplierId?.contact?.phone || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Items Ordered</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.inventoryItemId?.name || 'Unknown Item'}
                            </TableCell>
                            <TableCell>{item.inventoryItemId?.unit || 'N/A'}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Delivery Information */}
                {selectedPO.delivery?.expectedDate && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Delivery Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Expected Delivery Date</label>
                        <div className="text-sm">{formatDate(selectedPO.delivery.expectedDate)}</div>
                      </div>
                      {selectedPO.delivery.deliveryInstructions && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Instructions</label>
                          <div className="text-sm">{selectedPO.delivery.deliveryInstructions}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Invoice Information */}
                {selectedPO.invoice?.invoiceNumber && (
                  <div className="border rounded-lg p-4 border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <ReceiptText className="h-5 w-5 text-amber-600" />
                      Invoice Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                        <div className="text-sm font-semibold">{selectedPO.invoice.invoiceNumber}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Invoice Date</label>
                        <div className="text-sm">{selectedPO.invoice.invoiceDate ? formatDate(selectedPO.invoice.invoiceDate) : 'N/A'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Invoice Amount</label>
                        <div className="text-sm font-semibold">{formatCurrency(selectedPO.invoice.invoiceAmount || 0)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Received At</label>
                        <div className="text-sm">{selectedPO.invoice.receivedAt ? formatDate(selectedPO.invoice.receivedAt) : 'N/A'}</div>
                      </div>
                      {selectedPO.invoice.notes && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Notes</label>
                          <div className="text-sm">{selectedPO.invoice.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                {(selectedPO.invoice?.invoiceNumber || selectedPO.payment?.paidAmount > 0) && selectedPO.payment && (
                  <div className={`border rounded-lg p-4 ${
                    selectedPO.payment.status === 'paid'
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                      : selectedPO.payment.status === 'partial'
                      ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800'
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-900/20'
                  }`}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      Payment Status
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedPO.payment.status === 'paid' ? 'bg-green-200 text-green-800' :
                        selectedPO.payment.status === 'partial' ? 'bg-blue-200 text-blue-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {selectedPO.payment.status.charAt(0).toUpperCase() + selectedPO.payment.status.slice(1)}
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Amount Paid</label>
                        <div className="text-sm font-semibold">{formatCurrency(selectedPO.payment.paidAmount || 0)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Outstanding</label>
                        <div className="text-sm font-semibold text-red-600">
                          {formatCurrency(Math.max(0, (selectedPO.invoice?.invoiceAmount ?? selectedPO.totalAmount) - (selectedPO.payment.paidAmount || 0)))}
                        </div>
                      </div>
                      {selectedPO.payment.method && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                          <div className="text-sm capitalize">{selectedPO.payment.method.replace('_', ' ')}</div>
                        </div>
                      )}
                      {selectedPO.payment.reference && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Reference</label>
                          <div className="text-sm">{selectedPO.payment.reference}</div>
                        </div>
                      )}
                      {selectedPO.payment.paidAt && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Paid At</label>
                          <div className="text-sm">{formatDate(selectedPO.payment.paidAt)}</div>
                        </div>
                      )}
                      {selectedPO.payment.notes && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Notes</label>
                          <div className="text-sm">{selectedPO.payment.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/20">
                  <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedPO.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax Amount:</span>
                      <span>{formatCurrency(selectedPO.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping Cost:</span>
                      <span>{formatCurrency(selectedPO.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedPO.discountAmount)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(selectedPO.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Invoice actions footer inside View modal */}
            {selectedPO.invoice?.invoiceNumber && (
              <div className="px-6 pb-6 flex gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => handleDownloadInvoicePdf(selectedPO)}
                  disabled={isDownloadingInvoice}
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingInvoice ? 'Generating...' : 'Download Invoice PDF'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Edit Purchase Order Modal */}
      {showEditPO && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-2xl">Edit Purchase Order</CardTitle>
                <CardDescription>
                  {selectedPO.poNumber} • {selectedPO.supplierId?.name}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditPO(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="font-medium text-yellow-800 dark:text-yellow-200">
                        Edit Mode - Draft Order
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        You can modify items and delivery details for draft purchase orders.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supplier Info (Read-only) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Supplier</label>
                    <div className="text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded border">
                      {selectedPO.supplierId?.name} ({selectedPO.supplierId?.supplierCode})
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Branch</label>
                    <div className="text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded border">
                      {selectedPO.branchId?.name}
                    </div>
                  </div>
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <label className="text-sm font-medium">Expected Delivery Date</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                  />
                </div>

                {/* Items Table */}
                <div>
                  <label className="text-sm font-medium">Items</label>
                  <div className="mt-2 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="w-32">Quantity</TableHead>
                          <TableHead className="w-32">Unit Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.unit || 'N/A'}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...editItems];
                                  updated[index] = { ...updated[index], quantity: Number(e.target.value) };
                                  setEditItems(updated);
                                }}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) => {
                                  const updated = [...editItems];
                                  updated[index] = { ...updated[index], unitCost: Number(e.target.value) };
                                  setEditItems(updated);
                                }}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.quantity * item.unitCost)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => setEditItems(editItems.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Order Notes */}
                <div>
                  <label className="text-sm font-medium">Order Notes</label>
                  <textarea
                    placeholder="Additional notes or instructions..."
                    className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>

            <div className="flex-shrink-0 p-6 pt-0 border-t">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEditPO(false)}
                  className="flex-1"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveEditPO} disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* ── APPROVE MODAL ── */}
      {showApproveModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Approve Purchase Order</CardTitle>
              <CardDescription>{selectedPO.poNumber} · {selectedPO.supplierId?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Approving will move this PO to <strong>Pending</strong> status. You can then send it to the supplier via email.
              </p>
              <div className="mt-4 bg-muted rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Items</span><strong>{selectedPO.items?.length}</strong></div>
                <div className="flex justify-between"><span>Total Value</span><strong>{formatCurrency(selectedPO.totalAmount)}</strong></div>
              </div>
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setShowApproveModal(false)} disabled={isApproving}>Cancel</Button>
              <Button className="flex-1" onClick={handleApprove} disabled={isApproving}>
                {isApproving ? 'Approving...' : 'Approve PO'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── SEND EMAIL MODAL ── */}
      {showSendModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Send to Supplier</CardTitle>
              <CardDescription>{selectedPO.poNumber}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">This will email the PO PDF to the supplier and mark it as <strong>Sent</strong>.</p>
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Supplier</span><strong>{selectedPO.supplierId?.name}</strong></div>
                <div className="flex justify-between"><span>Email</span><strong>{selectedPO.supplierId?.contact?.email || '—'}</strong></div>
                <div className="flex justify-between"><span>Total</span><strong>{formatCurrency(selectedPO.totalAmount)}</strong></div>
              </div>
              {!selectedPO.supplierId?.contact?.email && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Supplier has no email address. Add one in the Suppliers tab first.
                </div>
              )}
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setShowSendModal(false)} disabled={isSending}>Cancel</Button>
              <Button className="flex-1" onClick={handleSend} disabled={isSending || !selectedPO.supplierId?.contact?.email}>
                {isSending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── ACKNOWLEDGE MODAL ── */}
      {showAckModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Mark as Acknowledged</CardTitle>
              <CardDescription>{selectedPO.poNumber} — supplier confirmed receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">How did the supplier confirm this order?</p>
              <div className="space-y-2">
                {['email', 'phone', 'whatsapp', 'in-person', 'portal'].map(m => (
                  <label key={m} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${ackMethod === m ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <input type="radio" name="ackMethod" value={m} checked={ackMethod === m} onChange={() => setAckMethod(m)} className="accent-primary" />
                    <span className="text-sm capitalize">{m}</span>
                  </label>
                ))}
              </div>
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setShowAckModal(false)} disabled={isAcknowledging}>Cancel</Button>
              <Button className="flex-1" onClick={handleAcknowledge} disabled={isAcknowledging}>
                {isAcknowledging ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── RECEIVE ITEMS MODAL ── */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5" /> Receive Items</CardTitle>
              <CardDescription>{selectedPO.poNumber} — enter quantities actually received</CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Ordered</TableHead>
                      <TableHead className="text-center">Already Rcvd</TableHead>
                      <TableHead className="text-center w-28">Receiving Now</TableHead>
                      <TableHead className="text-right w-32">Actual Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiveItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.name}<span className="text-muted-foreground text-xs ml-1">{item.unit}</span></TableCell>
                        <TableCell className="text-center">{item.ordered}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.alreadyReceived}</TableCell>
                        <TableCell>
                          <Input type="number" min="0" max={item.ordered - item.alreadyReceived} value={item.receivedQuantity}
                            onChange={e => { const u=[...receiveItems]; u[i]={...u[i],receivedQuantity:Number(e.target.value)}; setReceiveItems(u); }}
                            className="w-24 mx-auto" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" step="0.01" value={item.actualUnitCost}
                            onChange={e => { const u=[...receiveItems]; u[i]={...u[i],actualUnitCost:Number(e.target.value)}; setReceiveItems(u); }}
                            className="w-28 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <label className="text-sm font-medium">Delivery Notes (optional)</label>
                <textarea value={receiveNotes} onChange={e => setReceiveNotes(e.target.value)}
                  placeholder="Any notes about the delivery..."
                  className="mt-1 min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </CardContent>
            <div className="flex gap-3 p-6 pt-4 border-t flex-shrink-0">
              <Button variant="outline" className="flex-1" onClick={() => setShowReceiveModal(false)} disabled={isReceiving}>Cancel</Button>
              <Button className="flex-1" onClick={handleReceive} disabled={isReceiving}>
                {isReceiving ? 'Updating Inventory...' : 'Confirm Receipt'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── CANCEL MODAL ── */}
      {showCancelModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600"><Ban className="h-5 w-5" /> Cancel Purchase Order</CardTitle>
              <CardDescription>{selectedPO.poNumber}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">This action cannot be undone. Please provide a reason.</p>
              <div>
                <label className="text-sm font-medium">Cancellation Reason</label>
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Supplier unavailable, budget change..."
                  className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)} disabled={isCancelling}>Keep PO</Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={isCancelling || !cancelReason.trim()}>
                {isCancelling ? 'Cancelling...' : 'Cancel PO'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── RECORD INVOICE MODAL ── */}
      {showInvoiceModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5" /> Record Supplier Invoice</CardTitle>
              <CardDescription>{selectedPO.poNumber}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Invoice Number <span className="text-muted-foreground font-normal">(supplier's ref — edit if different)</span></label>
                <Input className="mt-1" placeholder="e.g. INV-2024-001" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Invoice Date *</label>
                <Input type="date" className="mt-1" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Invoice Amount (₹) *</label>
                <Input type="number" min="0" step="0.01" className="mt-1" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input className="mt-1" placeholder="Any discrepancies or notes..." value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} />
              </div>
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setShowInvoiceModal(false)} disabled={isRecordingInvoice}>Cancel</Button>
              <Button className="flex-1" onClick={handleRecordInvoice} disabled={isRecordingInvoice || !invoiceDate || !invoiceAmount}>
                {isRecordingInvoice ? 'Saving...' : 'Record Invoice'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── RECORD PAYMENT MODAL ── */}
      {showPaymentModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Record Payment</CardTitle>
              <CardDescription>{selectedPO.poNumber} · Outstanding: {formatCurrency((selectedPO.invoice?.invoiceAmount ?? selectedPO.totalAmount) - (selectedPO.payment?.paidAmount ?? 0))}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Amount Paid (₹) *</label>
                <Input type="number" min="0" step="0.01" className="mt-1" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method *</label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="credit">Credit (Pay Later)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Reference / Transaction ID</label>
                <Input className="mt-1" placeholder="e.g. UTR number, cheque number..." value={paymentReference} onChange={e => setPaymentReference(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input className="mt-1" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
              </div>
            </CardContent>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)} disabled={isRecordingPayment}>Cancel</Button>
              <Button className="flex-1" onClick={handleRecordPayment} disabled={isRecordingPayment || !paymentAmount}>
                {isRecordingPayment ? 'Saving...' : 'Record Payment'}
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}