import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CartItem } from './ModifierModal';

interface CartPanelProps {
  cart: CartItem[];
  tableNumber?: string;
  orderType: 'table' | 'walkin';
  tables: Array<{ id: string; tableNumber: string; displayName?: string }>;
  selectedTableId: string;
  onOrderTypeChange: (type: 'table' | 'walkin') => void;
  onTableChange: (tableId: string) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onCharge: () => void;
  onPrintBill?: () => void;
  billTotals?: {
    subTotalAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    taxType?: string;
  } | null;
  isCalculating?: boolean;
  tillOpen: boolean;
}

export function CartPanel({
  cart,
  orderType,
  tables,
  selectedTableId,
  onOrderTypeChange,
  onTableChange,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCharge,
  onPrintBill,
  billTotals,
  isCalculating,
  tillOpen,
}: CartPanelProps) {
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = billTotals?.totalAmount ?? subtotal;

  return (
    <div className="flex flex-col h-full bg-card border-l">
      {/* Order Type Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => onOrderTypeChange('table')}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium border transition-colors',
              orderType === 'table'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            Table Order
          </button>
          <button
            onClick={() => onOrderTypeChange('walkin')}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium border transition-colors',
              orderType === 'walkin'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            Walk-in
          </button>
        </div>

        {orderType === 'table' && (
          <Select value={selectedTableId} onValueChange={onTableChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select table..." />
            </SelectTrigger>
            <SelectContent>
              {tables.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.displayName || `Table ${t.tableNumber}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 px-4">
            <ShoppingCart className="h-10 w-10 opacity-20" />
            <p className="text-sm text-center">No items added yet.<br />Select items from the menu.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cart.map((item, idx) => (
              <div key={`${item.menuItemId}-${idx}`} className="rounded-lg border bg-background p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">{item.name}</p>
                    {item.selectedModifiers?.map((mod) => (
                      <p key={mod.modifierId} className="text-xs text-muted-foreground">
                        {mod.modifierName}: {mod.selectedOptions.map((o) => o.optionName).join(', ')}
                      </p>
                    ))}
                    {item.notes && (
                      <p className="text-xs italic text-muted-foreground mt-0.5">"{item.notes}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveItem(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-muted rounded-lg">
                    <button
                      onClick={() => onUpdateQuantity(idx, -1)}
                      className="h-7 w-7 flex items-center justify-center rounded-l-lg hover:bg-muted-foreground/20 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(idx, 1)}
                      className="h-7 w-7 flex items-center justify-center rounded-r-lg hover:bg-muted-foreground/20 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="font-semibold text-sm">₹{(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Totals & Actions */}
      <div className="border-t p-4 space-y-3">
        {cart.length > 0 && (
          <>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {billTotals && (
                <>
                  {billTotals.taxType === 'intra-state' ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>CGST (2.5%)</span>
                        <span>₹{billTotals.cgstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>SGST (2.5%)</span>
                        <span>₹{billTotals.sgstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-muted-foreground">
                      <span>IGST (5%)</span>
                      <span>₹{billTotals.igstAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary text-lg">
                  {isCalculating ? '...' : `₹${total.toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {onPrintBill && (
                <Button variant="outline" size="icon" className="h-11 w-11 flex-shrink-0" onClick={onPrintBill}>
                  <Printer className="h-4 w-4" />
                </Button>
              )}
              <Button
                className="flex-1 h-11 font-bold text-base"
                onClick={onCharge}
                disabled={!tillOpen || cart.length === 0 || isCalculating}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Charge ₹{total.toFixed(2)}
              </Button>
            </div>

            <button
              onClick={onClearCart}
              className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors text-center py-1"
            >
              Clear Order
            </button>
          </>
        )}

        {!tillOpen && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
            <p className="text-sm text-amber-700 font-medium">Till is not open</p>
            <p className="text-xs text-amber-600">Open the till to process payments</p>
          </div>
        )}
      </div>
    </div>
  );
}
