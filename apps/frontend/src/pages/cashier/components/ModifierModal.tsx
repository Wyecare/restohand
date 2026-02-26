import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import type { MenuItem } from '@/store/api/types';
import type { MenuModifier } from '@/store/api/menuModifiersApi';

export interface CartModifierSelection {
  modifierId: string;
  modifierName: string;
  selectedOptions: Array<{
    optionId: string;
    optionName: string;
    priceAdjustment: number;
    quantity: number;
  }>;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedModifiers: CartModifierSelection[];
  notes?: string;
}

interface ModifierModalProps {
  open: boolean;
  onClose: () => void;
  item: MenuItem | null;
  modifiers: MenuModifier[];
  onAddToCart: (cartItem: CartItem) => void;
}

export function ModifierModal({ open, onClose, item, modifiers, onAddToCart }: ModifierModalProps) {
  const [quantity, setQuantity] = React.useState(1);
  const [selections, setSelections] = React.useState<Record<string, string[]>>({});
  const [notes, setNotes] = React.useState('');

  const applicableModifiers = React.useMemo(() => {
    if (!item) return [];
    return modifiers.filter(
      (m) =>
        m.isActive &&
        (m.applicableMenuItems?.includes(item.id) || m.applicableCategories?.includes(item.categoryId ?? '')),
    );
  }, [item, modifiers]);

  React.useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelections({});
      setNotes('');
    }
  }, [open, item?.id]);

  if (!item) return null;

  const toggleOption = (modifier: MenuModifier, optionId: string) => {
    const current = selections[modifier.id] ?? [];
    if (modifier.selectionType === 'single') {
      setSelections((prev) => ({ ...prev, [modifier.id]: [optionId] }));
    } else {
      if (current.includes(optionId)) {
        setSelections((prev) => ({ ...prev, [modifier.id]: current.filter((id) => id !== optionId) }));
      } else if (!modifier.maxSelections || current.length < modifier.maxSelections) {
        setSelections((prev) => ({ ...prev, [modifier.id]: [...current, optionId] }));
      }
    }
  };

  const getModifierExtraPrice = () => {
    let extra = 0;
    applicableModifiers.forEach((mod) => {
      const selected = selections[mod.id] ?? [];
      selected.forEach((optId, idx) => {
        const opt = mod.options.find((o) => o.id === optId);
        if (opt && idx >= (mod.freeOptions ?? 0)) {
          extra += opt.priceAdjustment;
        }
      });
    });
    return extra;
  };

  const unitPrice = item.pricing.amount + getModifierExtraPrice();
  const totalPrice = unitPrice * quantity;

  const isValid = applicableModifiers.every((mod) => {
    const selected = selections[mod.id] ?? [];
    return !mod.isRequired || selected.length >= (mod.minSelections ?? 1);
  });

  const handleAdd = () => {
    const cartModifiers: CartModifierSelection[] = applicableModifiers
      .map((mod) => {
        const selected = selections[mod.id] ?? [];
        if (!selected.length) return null;
        return {
          modifierId: mod.id,
          modifierName: mod.name,
          selectedOptions: selected.map((optId) => {
            const opt = mod.options.find((o) => o.id === optId)!;
            return {
              optionId: optId,
              optionName: opt.name,
              priceAdjustment: opt.priceAdjustment,
              quantity: 1,
            };
          }),
        };
      })
      .filter(Boolean) as CartModifierSelection[];

    onAddToCart({
      menuItemId: item.id,
      name: item.name,
      quantity,
      unitPrice,
      selectedModifiers: cartModifiers,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">{item.name}</DialogTitle>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2">
          {applicableModifiers.map((mod) => {
            const selected = selections[mod.id] ?? [];
            return (
              <div key={mod.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{mod.name}</p>
                  {mod.isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  {mod.selectionType === 'multiple' && mod.maxSelections && (
                    <Badge variant="secondary" className="text-xs">Max {mod.maxSelections}</Badge>
                  )}
                  {mod.freeOptions > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600">{mod.freeOptions} free</Badge>
                  )}
                </div>

                {mod.selectionType === 'single' ? (
                  <RadioGroup
                    value={selected[0] ?? ''}
                    onValueChange={(val) => setSelections((prev) => ({ ...prev, [mod.id]: [val] }))}
                  >
                    {mod.options.filter((o) => o.isAvailable).map((opt) => (
                      <div key={opt.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.id} id={`${mod.id}-${opt.id}`} />
                          <Label htmlFor={`${mod.id}-${opt.id}`} className="cursor-pointer">{opt.name}</Label>
                        </div>
                        {opt.priceAdjustment > 0 && (
                          <span className="text-sm text-muted-foreground">+₹{opt.priceAdjustment}</span>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-1">
                    {mod.options.filter((o) => o.isAvailable).map((opt) => {
                      const checked = selected.includes(opt.id);
                      return (
                        <div key={opt.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${mod.id}-${opt.id}`}
                              checked={checked}
                              onCheckedChange={() => toggleOption(mod, opt.id)}
                            />
                            <Label htmlFor={`${mod.id}-${opt.id}`} className="cursor-pointer">{opt.name}</Label>
                          </div>
                          {opt.priceAdjustment > 0 && (
                            <span className="text-sm text-muted-foreground">+₹{opt.priceAdjustment}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Special Instructions (optional)</Label>
            <Textarea
              placeholder="E.g. no onions, extra spicy..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
          <div className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-bold text-lg w-6 text-center">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            className="flex-1 h-11 font-semibold text-base"
            disabled={!isValid}
            onClick={handleAdd}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Order · ₹{totalPrice.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
