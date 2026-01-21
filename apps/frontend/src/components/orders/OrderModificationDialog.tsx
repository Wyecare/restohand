import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Plus,
  Minus,
  Edit3,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  useCreateOrderModificationMutation,
  useGetOrderModificationsQuery,
} from '@/store/api/ordersApi';
import { useGetPublicMenuQuery } from '@/store/api/restaurantsApi';
import type {
  Order,
  ModificationType,
  OrderModification,
  ModificationStatus,
} from '@/store/api/types';

interface OrderModificationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  restaurantSlug: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const getModificationStatusColor = (status: ModificationStatus) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'approved': return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    case 'applied': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getModificationTypeLabel = (type: ModificationType) => {
  switch (type) {
    case 'add_item': return 'Add Item';
    case 'remove_item': return 'Remove Item';
    case 'update_quantity': return 'Update Quantity';
    case 'update_notes': return 'Update Notes';
    case 'cancel_order': return 'Cancel Order';
    default: return type;
  }
};

export const OrderModificationDialog: React.FC<OrderModificationDialogProps> = ({
  isOpen,
  onOpenChange,
  order,
  restaurantSlug,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'modify' | 'history'>('modify');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modificationType, setModificationType] = useState<ModificationType | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [customerNotes, setCustomerNotes] = useState('');
  const [reason, setReason] = useState('');

  // API hooks
  const [createModification, { isLoading: isCreating }] = useCreateOrderModificationMutation();
  const { data: menu } = useGetPublicMenuQuery({ slug: restaurantSlug });
  const { data: modifications, isLoading: isLoadingHistory } = useGetOrderModificationsQuery({
    restaurantId: order.restaurantId,
    orderId: order.id,
  });

  // Check if order can be modified
  const canModifyOrder = () => {
    return ['pending', 'accepted'].includes(order.status) &&
           [0, 40].includes(order.progress);
  };

  // Get available menu items for adding
  const availableItems = menu?.menu.categories.flatMap(cat =>
    cat.items.map(item => ({ ...item, categoryName: cat.name }))
  ) || [];

  // Handle modification creation
  const handleCreateModification = async (type: ModificationType, itemData?: any) => {
    try {
      await createModification({
        restaurantId: order.restaurantId,
        body: {
          orderId: order.id,
          type,
          itemData,
          reason: reason || undefined,
          customerNotes: customerNotes || undefined,
          notifyKitchen: true,
        },
      }).unwrap();

      toast({
        title: 'Modification requested',
        description: 'Your order modification request has been submitted for approval.',
      });

      // Reset form
      setSelectedItem(null);
      setModificationType(null);
      setNewQuantity(1);
      setCustomerNotes('');
      setReason('');
      setActiveTab('history');
    } catch (error: any) {
      toast({
        title: 'Failed to submit modification',
        description: error.data?.message || 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  // Handle item quantity update
  const handleQuantityUpdate = (item: any, newQty: number) => {
    handleCreateModification('update_quantity', {
      menuItemId: item.menuItemId,
      name: item.name,
      originalQuantity: item.quantity,
      newQuantity: newQty,
    });
  };

  // Handle item removal
  const handleRemoveItem = (item: any) => {
    handleCreateModification('remove_item', {
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitAmount: item.pricing.unitAmount,
    });
  };

  // Handle adding new item
  const handleAddItem = (menuItem: any) => {
    handleCreateModification('add_item', {
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: newQuantity,
      unitAmount: menuItem.pricing.amount,
    });
  };

  if (!canModifyOrder()) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Cannot Modify Order
            </DialogTitle>
            <DialogDescription>
              Order #{order.orderNumber} cannot be modified as it's currently {order.status}
              {order.progress > 0 && ` with ${order.progress}% progress`}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Modify Order #{order.orderNumber}</DialogTitle>
          <DialogDescription>
            Make changes to your order. All modifications require approval.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <Button
            variant={activeTab === 'modify' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('modify')}
            className="rounded-none border-b-2"
          >
            Modify Order
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('history')}
            className="rounded-none border-b-2"
          >
            Modification History
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'modify' && (
              <motion.div
                key="modify"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 py-4"
              >
                {/* Current Order Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Current Items</h3>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.pricing.unitAmount)} × {item.quantity} =
                              {formatCurrency(item.pricing.unitAmount * item.quantity)}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleQuantityUpdate(item, Math.max(0, item.quantity - 1))}
                                disabled={isCreating}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                                disabled={isCreating}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Remove Item */}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => handleRemoveItem(item)}
                              disabled={isCreating}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Add New Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Add Items</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {availableItems.map((menuItem) => (
                      <Card key={menuItem.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{menuItem.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(menuItem.pricing.amount)}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {menuItem.categoryName}
                            </Badge>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleAddItem(menuItem)}
                            disabled={isCreating}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Modification Notes */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Reason for modification (optional)</Label>
                    <Input
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Dietary restriction, wrong item selected..."
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Any special instructions..."
                      rows={2}
                      disabled={isCreating}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 py-4"
              >
                <h3 className="text-lg font-semibold">Modification History</h3>

                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Loading modifications...</span>
                  </div>
                ) : modifications && modifications.length > 0 ? (
                  <div className="space-y-3">
                    {modifications.map((mod) => (
                      <Card key={mod.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getModificationStatusColor(mod.status)}>
                                {mod.status}
                              </Badge>
                              <span className="text-sm font-medium">
                                {getModificationTypeLabel(mod.type)}
                              </span>
                              {mod.status === 'pending' && (
                                <Clock className="h-4 w-4 text-amber-500" />
                              )}
                              {mod.status === 'applied' && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>

                            {mod.itemData && (
                              <div className="text-sm text-muted-foreground mb-1">
                                Item: {mod.itemData.name}
                                {mod.itemData.quantity && ` (Qty: ${mod.itemData.quantity})`}
                                {mod.itemData.originalQuantity && mod.itemData.newQuantity && (
                                  ` (${mod.itemData.originalQuantity} → ${mod.itemData.newQuantity})`
                                )}
                              </div>
                            )}

                            {mod.reason && (
                              <p className="text-sm text-muted-foreground">
                                Reason: {mod.reason}
                              </p>
                            )}

                            {mod.customerNotes && (
                              <p className="text-sm text-muted-foreground">
                                Notes: {mod.customerNotes}
                              </p>
                            )}

                            {mod.rejectionReason && (
                              <p className="text-sm text-red-600 mt-2">
                                Rejected: {mod.rejectionReason}
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              Requested: {new Date(mod.createdAt).toLocaleString()}
                              {mod.processedAt && (
                                <> • Processed: {new Date(mod.processedAt).toLocaleString()}</>
                              )}
                            </p>
                          </div>

                          {mod.amountDifference !== 0 && (
                            <div className={`text-sm font-medium ${
                              mod.amountDifference > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {mod.amountDifference > 0 ? '+' : ''}
                              {formatCurrency(Math.abs(mod.amountDifference))}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Edit3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No modifications yet</p>
                    <p className="text-sm">Switch to "Modify Order" tab to make changes</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Close
          </Button>
        </div>

        {isCreating && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span>Submitting modification...</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};