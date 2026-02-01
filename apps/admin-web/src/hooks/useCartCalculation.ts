import { useEffect, useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useCalculateCartTotalMutation } from '@/store/api/ordersApi';
import { setCalculating, updateBackendCalculation } from '@/store/slices/cartSlice';

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function useCartCalculation() {
  const dispatch = useAppDispatch();
  const [calculateCartTotal] = useCalculateCartTotalMutation();

  const {
    items,
    restaurantId,
    tableNumber,
    customerInfo,
    notes,
    backendCalculated
  } = useAppSelector((state) => ({
    items: state.cart.items,
    restaurantId: state.cart.restaurantId,
    tableNumber: state.cart.tableNumber,
    customerInfo: state.cart.customerInfo,
    notes: state.cart.notes,
    backendCalculated: state.cart.backendCalculated,
  }));

  // Debounced calculation function
  const debouncedCalculate = useCallback(
    debounce(async (
      restaurantId: string,
      items: any[],
      tableNumber?: string,
      customerInfo?: any,
      notes?: string
    ) => {
      if (!restaurantId || items.length === 0) {
        return;
      }

      try {
        dispatch(setCalculating(true));

        const payload = {
          restaurantId,
          tableNumber,
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            pricing: {
              unitAmount: item.price,
              currency: 'INR',
            },
          })),
          notes,
          customerInfo: customerInfo && customerInfo.name ? {
            name: customerInfo.name,
            phone: customerInfo.phone,
            email: customerInfo.email,
          } : undefined,
        };

        const result = await calculateCartTotal(payload).unwrap();

        dispatch(updateBackendCalculation({
          subtotal: result.subtotal,
          taxAmount: result.taxAmount,
          cgstAmount: result.cgstAmount,
          sgstAmount: result.sgstAmount,
          igstAmount: result.igstAmount,
          roundOffAmount: result.roundOffAmount,
          totalAmount: result.totalAmount,
        }));

      } catch (error) {
        console.error('Failed to calculate cart total:', error);
        dispatch(setCalculating(false));
      }
    }, 500), // 500ms debounce
    [calculateCartTotal, dispatch]
  );

  // Trigger calculation when cart changes
  useEffect(() => {
    if (restaurantId && items.length > 0) {
      debouncedCalculate(restaurantId, items, tableNumber, customerInfo, notes);
    }
  }, [debouncedCalculate, restaurantId, items, tableNumber, customerInfo, notes]);

  return {
    isCalculating: backendCalculated?.isCalculating ?? false,
    backendTotal: backendCalculated?.totalAmount ?? 0,
    backendSubtotal: backendCalculated?.subtotal ?? 0,
    taxBreakdown: {
      taxAmount: backendCalculated?.taxAmount ?? 0,
      cgstAmount: backendCalculated?.cgstAmount ?? 0,
      sgstAmount: backendCalculated?.sgstAmount ?? 0,
      igstAmount: backendCalculated?.igstAmount ?? 0,
      roundOffAmount: backendCalculated?.roundOffAmount ?? 0,
    },
    hasBackendCalculation: !!backendCalculated?.lastCalculated,
  };
}