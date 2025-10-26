import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, Wallet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/billing';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  itemCount: number;
  isPlacingOrder: boolean;
  onConfirm: (tableNumber: string, paymentMethod: 'upi' | 'cash') => void;
  defaultTable?: string;
}

export default function TableDialog({
  open,
  onOpenChange,
  totalAmount,
  itemCount,
  isPlacingOrder,
  onConfirm,
  defaultTable,
}: Props) {
  const [table, setTable] = useState(defaultTable || '');
  const [payment, setPayment] = useState<'upi' | 'cash'>('upi');

  // Update table state when defaultTable changes
  useEffect(() => {
    if (typeof defaultTable !== 'undefined') {
      setTable(defaultTable ?? '');
    }
  }, [defaultTable]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Confirm Your Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Table / Name</Label>
            <Input
              placeholder="Table number or takeaway name"
              value={table}
              onChange={(e) => setTable(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select
              value={payment}
              onValueChange={(v) => setPayment(v as 'upi' | 'cash')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upi">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    UPI
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Cash
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-3 text-sm text-muted-foreground space-y-2">
            <div className="flex items-center justify-between">
              <span>Items</span>
              <span>{itemCount}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Estimated total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <p className="text-xs text-muted-foreground/80">
              Final GST and any charges will be reflected on the printed bill.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full font-semibold"
            disabled={isPlacingOrder || !table.trim()}
            onClick={() => onConfirm(table, payment)}
          >
            {isPlacingOrder ? 'Placing Order...' : 'Confirm Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
