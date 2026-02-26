import * as React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { MenuGrid } from '../components/MenuGrid';
import { CartPanel } from '../components/CartPanel';
import { ModifierModal, CartItem } from '../components/ModifierModal';
import { PaymentModal, PaymentMethod } from '../components/PaymentModal';
import {
  useListMenuCategoriesByBranchQuery,
  useListMenuItemsByBranchQuery,
  useListRestaurantTablesByBranchQuery,
} from '@/store/api/restaurantsApi';
import { useListMenuModifiersByBranchQuery } from '@/store/api/menuModifiersApi';
import { useCreateOrderMutation, useUpdateOrderPaymentMutation, useCalculateCartTotalMutation } from '@/store/api/ordersApi';
import { useRecordTillTransactionMutation, TillSession } from '@/store/api/tillApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query';
import type { MenuItem } from '@/store/api/types';

interface PosViewProps {
  currentTill: TillSession | null;
}

export function PosView({ currentTill }: PosViewProps) {
  const { toast } = useToast();
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { currentBranch } = useBranchContext();

  const branchQueryArgs = restaurantId && currentBranch?._id
    ? { restaurantId, branchId: currentBranch._id, limit: 100 }
    : skipToken;

  const { data: categoriesData, isLoading: loadingCats } = useListMenuCategoriesByBranchQuery(branchQueryArgs);
  const { data: itemsData, isLoading: loadingItems } = useListMenuItemsByBranchQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id, isAvailable: true, limit: 200 }
      : skipToken,
  );
  const { data: modifiersData } = useListMenuModifiersByBranchQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id }
      : skipToken,
  );
  const { data: tablesData } = useListRestaurantTablesByBranchQuery(
    restaurantId && currentBranch?._id
      ? { restaurantId, branchId: currentBranch._id }
      : skipToken,
  );

  const [createOrder] = useCreateOrderMutation();
  const [updatePayment] = useUpdateOrderPaymentMutation();
  const [calculateCart] = useCalculateCartTotalMutation();
  const [recordTransaction] = useRecordTillTransactionMutation();

  // Cart state
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [orderType, setOrderType] = React.useState<'table' | 'walkin'>('table');
  const [selectedTableId, setSelectedTableId] = React.useState('');

  // Modifiers modal
  const [modifierItem, setModifierItem] = React.useState<MenuItem | null>(null);
  const [modifierOpen, setModifierOpen] = React.useState(false);

  // Payment modal
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [createdOrderId, setCreatedOrderId] = React.useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = React.useState<string | null>(null);

  // Bill calculation
  const [billTotals, setBillTotals] = React.useState<any>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);

  const categories = categoriesData?.data ?? [];
  const items = itemsData?.data ?? [];
  const modifiers = modifiersData?.data ?? [];
  const tables = tablesData ?? [];

  const tableOptions = tables
    .filter((t) => t.isActive !== false)
    .map((t) => ({ id: t.id, tableNumber: t.tableNumber, displayName: t.displayName }));

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  // Recalculate bill when cart changes
  React.useEffect(() => {
    if (!restaurantId || cart.length === 0) {
      setBillTotals(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const result = await calculateCart({
          restaurantId,
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            pricing: { unitAmount: item.unitPrice, currency: 'INR' },
          })),
        }).unwrap();
        // Normalize field names for CartPanel
        setBillTotals({
          subTotalAmount: result.subtotal,
          cgstAmount: result.cgstAmount,
          sgstAmount: result.sgstAmount,
          igstAmount: result.igstAmount,
          totalAmount: result.totalAmount,
          taxType: result.cgstAmount > 0 ? 'intra-state' : 'inter-state',
        });
      } catch {
        // ignore calc errors
      } finally {
        setIsCalculating(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [cart, restaurantId]);

  const handleSelectItem = (item: MenuItem) => {
    const applicableModifiers = modifiers.filter(
      (m: any) =>
        m.isActive &&
        (m.applicableMenuItems?.includes(item.id) ||
          m.applicableCategories?.includes(item.categoryId ?? '')),
    );

    if (applicableModifiers.length > 0) {
      setModifierItem(item);
      setModifierOpen(true);
    } else {
      addToCart({
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        unitPrice: item.pricing.amount,
        selectedModifiers: [],
      });
    }
  };

  const addToCart = (cartItem: CartItem) => {
    setCart((prev) => {
      // Try to merge with existing item (same item + same modifiers + same notes)
      const existingIdx = prev.findIndex(
        (c) =>
          c.menuItemId === cartItem.menuItemId &&
          c.notes === cartItem.notes &&
          JSON.stringify(c.selectedModifiers) === JSON.stringify(cartItem.selectedModifiers),
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + cartItem.quantity };
        return updated;
      }
      return [...prev, cartItem];
    });
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...updated[index], quantity: newQty };
      }
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCharge = async () => {
    if (!restaurantId || cart.length === 0) return;

    // Create order first, then open payment modal
    try {
      const orderItems = cart.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        pricing: { unitAmount: item.unitPrice, currency: 'INR' },
        notes: item.notes,
      }));

      const tableForOrder = orderType === 'table' ? selectedTable : null;

      const order = await createOrder({
        restaurantId,
        tableId: tableForOrder?.id,
        tableNumber: tableForOrder?.tableNumber,
        items: orderItems,
        paymentMethod: 'pending',
      }).unwrap();

      setCreatedOrderId(order.id);
      setCreatedOrderNumber(order.orderNumber);
      setPaymentOpen(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to create order', description: err?.data?.message });
    }
  };

  const handleConfirmPayment = async (method: PaymentMethod) => {
    if (!createdOrderId) return;
    setIsProcessingPayment(true);
    try {
      await updatePayment({
        restaurantId: restaurantId!,
        orderId: createdOrderId,
        paymentStatus: 'paid',
        provider: method,
      }).unwrap();

      if (currentTill) {
        await recordTransaction({
          restaurantId: restaurantId!,
          tillId: currentTill._id || currentTill.id,
          paymentMethod: method,
          amount: billTotals?.totalAmount ?? cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
        });
      }

      toast({
        title: 'Payment complete!',
        description: `Order #${createdOrderNumber} paid via ${method.toUpperCase()}`,
      });

      setPaymentOpen(false);
      setCart([]);
      setBillTotals(null);
      setCreatedOrderId(null);
      setCreatedOrderNumber(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Payment update failed', description: err?.data?.message });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Menu */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/10">
        <MenuGrid
          categories={categories}
          items={items}
          isLoading={loadingCats || loadingItems}
          onSelectItem={handleSelectItem}
        />
      </div>

      {/* Right: Cart Panel */}
      <div className="w-[340px] xl:w-[380px] flex-shrink-0">
        <CartPanel
          cart={cart}
          orderType={orderType}
          tables={tableOptions}
          selectedTableId={selectedTableId}
          onOrderTypeChange={setOrderType}
          onTableChange={setSelectedTableId}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={() => { setCart([]); setBillTotals(null); }}
          onCharge={handleCharge}
          billTotals={billTotals}
          isCalculating={isCalculating}
          tillOpen={!!currentTill}
        />
      </div>

      {/* Modifier selection modal */}
      <ModifierModal
        open={modifierOpen}
        onClose={() => { setModifierOpen(false); setModifierItem(null); }}
        item={modifierItem}
        modifiers={modifiers}
        onAddToCart={(cartItem) => { addToCart(cartItem); }}
      />

      {/* Payment modal */}
      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        totalAmount={billTotals?.totalAmount ?? cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)}
        orderNumbers={createdOrderNumber ? [createdOrderNumber] : undefined}
        onConfirmPayment={handleConfirmPayment}
        isProcessing={isProcessingPayment}
      />
    </div>
  );
}
