import { motion } from 'framer-motion';
import { Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/billing';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

interface CartEntry {
  id: string;
  name: string;
  pricing: {
    amount: number;
    currency?: string;
  };
  quantity: number;
}

interface CartPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: Record<string, CartEntry>;
  totalItems: number;
  totalAmount: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  onClearCart: () => void;
}


export function CartPanel({
  open,
  onOpenChange,
  cart,
  totalItems,
  totalAmount,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onClearCart,
}: CartPanelProps) {
  const cartEntries = Object.values(cart);

  if (totalItems === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Cart
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col items-center justify-center h-full text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">
              Browse our menu and add some delicious items to get started!
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Continue Shopping
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Cart
              <Badge variant="secondary">{totalItems} items</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 py-4">
          <div className="space-y-4">
            {cartEntries.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border"
              >
                {/* Item placeholder image */}
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-2xl">🍽️</span>
                </div>

                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.pricing.amount)} each
                  </p>
                  <p className="text-sm font-medium">
                    Total: {formatCurrency(item.pricing.amount * item.quantity)}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (item.quantity === 1) {
                          onRemoveItem(item.id);
                        } else {
                          onUpdateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </Button>

                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-destructive hover:text-destructive text-xs"
                  >
                    Remove
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <SheetFooter className="flex-col space-y-4 pt-4">
          <div className="w-full text-sm text-muted-foreground">
            <div className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Estimated total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <p className="text-xs mt-1">
              Taxes and any service charges will be finalised on your bill.
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onCheckout();
              }}
              className="flex-1 font-semibold"
              size="lg"
            >
              Proceed to Checkout
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
