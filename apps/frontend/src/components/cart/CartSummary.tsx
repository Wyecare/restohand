import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeItem, updateItemQuantity, clearCart, type CartItem } from '@/store/slices/cartSlice';
import { ShoppingCart, Plus, Minus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/billing';
import { useCartCalculation } from '@/hooks/useCartCalculation';

interface CartSummaryProps {
  onCheckout: () => void;
  isLoading?: boolean;
}

export default function CartSummary({ onCheckout, isLoading = false }: CartSummaryProps) {
  const dispatch = useAppDispatch();
  const { items, totalQuantity } = useAppSelector((state) => ({
    items: state.cart.items,
    totalQuantity: state.cart.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
  }));

  const {
    isCalculating,
    backendTotal,
    backendSubtotal,
    taxBreakdown,
    hasBackendCalculation
  } = useCartCalculation();

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch(removeItem(itemId));
    } else {
      dispatch(updateItemQuantity({ id: itemId, quantity }));
    }
  };

  const handleRemoveItem = (itemId: string) => {
    dispatch(removeItem(itemId));
  };

  if (totalQuantity === 0) {
    return (
      <div className="text-center py-8">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
        <p className="text-muted-foreground">Your cart is empty</p>
        <p className="text-sm text-muted-foreground/80">Add items to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cart Items */}
      <div className="space-y-3">
        {items.map((item: CartItem, index: number) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Item Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    <div className="w-full h-full bg-linear-to-br from-muted to-muted/50 flex items-center justify-center">
                      <span className="text-2xl" role="img" aria-label="Food item">🍽️</span>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(item.price)}
                    </p>

                    {/* Customizations */}
                    {item.customizations && Object.keys(item.customizations).length > 0 && (
                      <div className="mt-1 space-y-1">
                        {Object.entries(item.customizations).map(([key, value]: [string, unknown]) => (
                          <p key={key} className="text-xs text-muted-foreground">
                            {key}: {String(value)}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatCurrency(item.itemTotal)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Cart Totals */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-3">
          {isCalculating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Calculating totals...</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Items ({totalQuantity})</span>
              <span>{formatCurrency(hasBackendCalculation ? backendSubtotal : items.reduce((sum: number, item: CartItem) => sum + item.itemTotal, 0))}</span>
            </div>

            {hasBackendCalculation && (
              <>
                {taxBreakdown.cgstAmount > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>CGST</span>
                    <span>{formatCurrency(taxBreakdown.cgstAmount)}</span>
                  </div>
                )}
                {taxBreakdown.sgstAmount > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>SGST</span>
                    <span>{formatCurrency(taxBreakdown.sgstAmount)}</span>
                  </div>
                )}
                {taxBreakdown.igstAmount > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>IGST</span>
                    <span>{formatCurrency(taxBreakdown.igstAmount)}</span>
                  </div>
                )}
                {taxBreakdown.roundOffAmount !== 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Round Off</span>
                    <span>{formatCurrency(taxBreakdown.roundOffAmount)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(hasBackendCalculation ? backendTotal : items.reduce((sum: number, item: CartItem) => sum + item.itemTotal, 0))}</span>
            </div>
            {!hasBackendCalculation && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>GST and other charges will be calculated at checkout</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={onCheckout}
          className="w-full h-12 text-base font-semibold"
          disabled={isLoading || totalQuantity === 0}
        >
          {isLoading ? 'Processing...' : 'Proceed to Checkout'}
        </Button>

        <Button
          variant="outline"
          onClick={() => dispatch(clearCart())}
          className="w-full text-sm"
          disabled={isLoading}
        >
          Clear Cart
        </Button>
      </div>
    </div>
  );
}