import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Banknote, CreditCard, Smartphone, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'cash' | 'card' | 'upi';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  totalAmount: number;
  orderNumbers?: string[];
  onConfirmPayment: (method: PaymentMethod, amountTendered?: number) => Promise<void>;
  isProcessing?: boolean;
}

const PAYMENT_METHODS = [
  { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote, color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' },
  { id: 'card' as PaymentMethod, label: 'Card', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { id: 'upi' as PaymentMethod, label: 'UPI', icon: Smartphone, color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100' },
];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export function PaymentModal({
  open,
  onClose,
  totalAmount,
  orderNumbers,
  onConfirmPayment,
  isProcessing,
}: PaymentModalProps) {
  const [method, setMethod] = React.useState<PaymentMethod>('cash');
  const [tendered, setTendered] = React.useState('');

  const tenderedAmount = parseFloat(tendered) || 0;
  const change = Math.max(0, tenderedAmount - totalAmount);
  const canConfirm = method !== 'cash' || tenderedAmount >= totalAmount;

  React.useEffect(() => {
    if (open) {
      setMethod('cash');
      setTendered('');
    }
  }, [open]);

  const handleQuickAmount = (amount: number) => {
    setTendered(amount.toFixed(2));
  };

  const handleConfirm = async () => {
    await onConfirmPayment(method, method === 'cash' ? tenderedAmount : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Process Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Order reference */}
          {orderNumbers && orderNumbers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {orderNumbers.map((n) => (
                <Badge key={n} variant="secondary">#{n}</Badge>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-4xl font-bold mt-1">₹{totalAmount.toFixed(2)}</p>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setMethod(id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all font-medium text-sm',
                  method === id
                    ? color + ' border-current shadow-sm'
                    : 'border-border hover:border-muted-foreground/30 text-muted-foreground',
                )}
              >
                <Icon className="h-6 w-6" />
                {label}
              </button>
            ))}
          </div>

          {/* Cash tendered */}
          {method === 'cash' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Amount Tendered</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <Input
                    type="number"
                    min={totalAmount}
                    step="0.01"
                    placeholder="0.00"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    className="pl-7 text-lg h-12 font-semibold"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(totalAmount)}
                  className="text-xs"
                >
                  Exact
                </Button>
                {QUICK_AMOUNTS.filter((a) => a >= totalAmount || a === Math.ceil(totalAmount / a) * a).slice(0, 5).map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(amt)}
                    className="text-xs"
                  >
                    ₹{amt}
                  </Button>
                ))}
              </div>

              {/* Change */}
              {tenderedAmount >= totalAmount && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex justify-between items-center">
                  <span className="text-green-700 font-medium">Change Due</span>
                  <span className="text-green-700 font-bold text-xl">₹{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {(method === 'card' || method === 'upi') && (
            <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              {method === 'upi' ? 'Ask customer to scan QR / enter UPI ID' : 'Swipe or tap card on terminal'}
              <br />
              <span className="font-medium text-foreground">then confirm once done.</span>
            </div>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 font-semibold"
              onClick={handleConfirm}
              disabled={!canConfirm || isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Payment</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
