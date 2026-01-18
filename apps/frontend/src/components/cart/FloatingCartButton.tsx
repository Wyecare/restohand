import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/store/hooks';
import { ShoppingCart, Plus, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/billing';
import { type CartItem } from '@/store/slices/cartSlice';

interface FloatingCartButtonProps {
  onClick: () => void;
}

export default function FloatingCartButton({ onClick }: FloatingCartButtonProps) {
  const { totalQuantity, totalAmount, isCalculating } = useAppSelector((state) => ({
    totalQuantity: state.cart.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
    totalAmount: state.cart.backendCalculated?.totalAmount ?? state.cart.total,
    isCalculating: state.cart.backendCalculated?.isCalculating ?? false,
  }));

  return (
    <AnimatePresence>
      {totalQuantity > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-0 right-0 z-40 px-4"
        >
          <div className="max-w-2xl mx-auto">
            <Button
              size="lg"
              className="w-full h-16 rounded-2xl shadow-2xl text-lg font-bold relative overflow-hidden"
              onClick={onClick}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
              <div className="relative flex items-center justify-between w-full px-2">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2 relative">
                    <ShoppingCart className="h-6 w-6" />
                    {totalQuantity > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                      >
                        {totalQuantity > 99 ? '99+' : totalQuantity}
                      </motion.div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm opacity-90">
                      {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                    </p>
                    <p className="text-base font-black">
                      {formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <span className="font-bold">View Cart</span>
                  <Plus className="h-5 w-5" />
                </div>
              </div>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}