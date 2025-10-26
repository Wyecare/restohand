import { motion } from 'framer-motion';
import { ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/billing';
import { useCustomerTranslation } from '@/hooks/use-translation';

interface CartEntry {
  id: string;
  name: string;
  pricing: {
    amount: number;
    currency?: string;
  };
  quantity: number;
}

interface CartBottomBarProps {
  cart: Record<string, CartEntry>;
  totalItems: number;
  totalAmount: number;
  onViewCart: () => void;
  onCheckout: () => void;
  className?: string;
}


export function CartBottomBar({
  cart,
  totalItems,
  totalAmount,
  onViewCart,
  onCheckout,
  className,
}: CartBottomBarProps) {
  const { t } = useCustomerTranslation();

  if (totalItems === 0) return null;

  const cartEntries = Object.values(cart);
  const firstThreeItems = cartEntries.slice(0, 3);
  const hasMoreItems = cartEntries.length > 3;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-lg',
        className
      )}
    >
      <div className="max-w-lg mx-auto p-4">
        {/* Cart preview items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('cart.title')}</span>
            <Badge variant="secondary" className="ml-auto">
              {totalItems} {totalItems === 1 ? t('cart.item') : t('cart.items')}
            </Badge>
          </div>

          <div className="space-y-1">
            {firstThreeItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-2 py-1"
              >
                <span className="truncate mr-2">{item.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">×{item.quantity}</span>
                  <span className="font-medium">
                    {formatCurrency(item.pricing.amount * item.quantity)}
                  </span>
                </div>
              </div>
            ))}

            {hasMoreItems && (
              <div className="text-xs text-muted-foreground text-center py-1">
                +{cartEntries.length - 3} {t('cart.moreItems')}
              </div>
            )}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          {/* Total amount */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">{t('cart.totalIncTax')}</span>
            <span className="text-lg font-bold">
              {formatCurrency(totalAmount)}
            </span>
            <span className="text-[10px] text-muted-foreground/80">
              Taxes and GST will be confirmed at checkout.
            </span>
          </div>

          {/* View cart button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onViewCart}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {t('menu.viewDetails')}
          </Button>

          {/* Checkout button */}
          <Button
            onClick={onCheckout}
            className="flex-1 font-semibold"
            size="lg"
          >
            {t('checkout.title')}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
