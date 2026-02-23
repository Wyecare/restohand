import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/billing';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  MenuModifier,
  ModifierOption,
} from '@/store/api/menuModifiersApi';
import type {
  OptionSelection,
  ModifierSelection,
} from '@/store/slices/cartSlice';

interface ModifierSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItemId: string;
  menuItemName: string;
  basePrice: number;
  modifiers: MenuModifier[];
  onConfirm: (
    selections: ModifierSelection[],
    totalPrice: number,
    notes?: string
  ) => void;
}

export function ModifierSelectionModal({
  open,
  onOpenChange,
  menuItemId,
  menuItemName,
  basePrice,
  modifiers,
  onConfirm,
}: ModifierSelectionModalProps) {
  const [selections, setSelections] = useState<
    Record<string, OptionSelection[]>
  >({});
  const [notes, setNotes] = useState<string>('');

  const handleOptionSelect = (
    modifierId: string,
    option: ModifierOption,
    modifier: MenuModifier
  ) => {
    setSelections((prev) => {
      const currentSelections = prev[modifierId] || [];

      if (modifier.selectionType === 'single') {
        return {
          ...prev,
          [modifierId]: [
            {
              optionId: option.id,
              optionName: option.name,
              priceAdjustment: option.priceAdjustment,
              quantity: 1,
            },
          ],
        };
      } else {
        const existingIndex = currentSelections.findIndex(
          (sel) => sel.optionId === option.id
        );

        if (existingIndex >= 0) {
          // If unique modifier, remove the selection
          if (modifier.unique) {
            return {
              ...prev,
              [modifierId]: currentSelections.filter(
                (_, index) => index !== existingIndex
              ),
            };
          } else {
            // If non-unique, increment quantity but check max limit first
            const currentTotalCount = currentSelections.reduce((sum, sel) => sum + (sel.quantity || 0), 0);
            if (currentTotalCount >= modifier.maxSelections) {
              return prev; // Don't allow increment if already at max
            }
            return {
              ...prev,
              [modifierId]: currentSelections.map((sel, index) =>
                index === existingIndex ? { ...sel, quantity: (sel.quantity || 0) + 1 } : sel
              ),
            };
          }
        } else {
          // Check if we can add more selections based on total count
          const totalSelections = currentSelections.reduce((sum, sel) => sum + (sel.quantity || 0), 0);
          if (totalSelections < modifier.maxSelections) {
            return {
              ...prev,
              [modifierId]: [
                ...currentSelections,
                {
                  optionId: option.id,
                  optionName: option.name,
                  priceAdjustment: option.priceAdjustment,
                  quantity: 1,
                },
              ],
            };
          }
        }
      }
      return prev;
    });
  };

  const handleQuantityChange = (
    modifierId: string,
    optionId: string,
    newQuantity: number
  ) => {
    const modifier = modifiers.find(m => m.id === modifierId);
    if (!modifier) return;

    if (newQuantity <= 0) {
      setSelections((prev) => ({
        ...prev,
        [modifierId]:
          prev[modifierId]?.filter((sel) => sel.optionId !== optionId) || [],
      }));
    } else {
      setSelections((prev) => {
        const currentSelections = prev[modifierId] || [];
        const currentTotalCount = currentSelections.reduce((sum, sel) => sum + (sel.quantity || 0), 0);
        const currentOptionQuantity = currentSelections.find(sel => sel.optionId === optionId)?.quantity || 0;

        // Calculate what the new total would be
        const newTotalCount = currentTotalCount - currentOptionQuantity + newQuantity;

        // Don't allow if it would exceed maxSelections
        if (newTotalCount > modifier.maxSelections) {
          return prev;
        }

        return {
          ...prev,
          [modifierId]: currentSelections.map((sel) =>
            sel.optionId === optionId ? { ...sel, quantity: newQuantity } : sel
          ),
        };
      });
    }
  };

  const isOptionSelected = (modifierId: string, optionId: string) => {
    return (
      selections[modifierId]?.some((sel) => sel.optionId === optionId) || false
    );
  };

  const getOptionQuantity = (modifierId: string, optionId: string) => {
    const option = selections[modifierId]?.find(
      (sel) => sel.optionId === optionId
    );
    return option?.quantity || 0;
  };

  const validateSelections = () => {
    for (const modifier of modifiers) {
      const selectedOptions = selections[modifier.id] || [];
      const totalSelectionCount = selectedOptions.reduce((sum, sel) => sum + (sel.quantity || 0), 0);

      if (
        modifier.isRequired &&
        totalSelectionCount < modifier.minSelections
      ) {
        return false;
      }

      if (totalSelectionCount > modifier.maxSelections) {
        return false;
      }
    }
    return true;
  };

  const calculateTotalPrice = () => {
    let total = basePrice;

    // Calculate price adjustments with free options logic
    Object.entries(selections).forEach(([modifierId, modifierSelections]) => {
      const modifier = modifiers.find(m => m.id === modifierId);
      if (!modifier) return;

      // Sort selections by price (cheapest first) to maximize free options benefit
      const sortedSelections = modifierSelections
        .flatMap(selection =>
          Array(selection.quantity || 0).fill(null).map(() => ({
            priceAdjustment: selection.priceAdjustment
          }))
        )
        .sort((a, b) => a.priceAdjustment - b.priceAdjustment);

      let chargedSelections = 0;
      sortedSelections.forEach(selection => {
        chargedSelections++;
        // Apply free options logic - first N selections are free
        if (chargedSelections > (modifier.freeOptions || 0)) {
          total += selection.priceAdjustment;
        }
      });
    });

    return total;
  };

  const getOptionDisplayPrice = (option: ModifierOption, modifierId: string) => {
    const modifier = modifiers.find(m => m.id === modifierId);
    if (!modifier) return option.priceAdjustment;

    const currentSelections = selections[modifierId] || [];
    const totalSelectionCount = currentSelections.reduce((sum, sel) => sum + (sel.quantity || 0), 0);

    // Check if this would be a free option
    const freeOptions = modifier.freeOptions || 0;
    if (totalSelectionCount < freeOptions) {
      return 0; // This option would be free
    }

    return option.priceAdjustment;
  };

  const isOptionFree = (option: ModifierOption, modifierId: string) => {
    return getOptionDisplayPrice(option, modifierId) === 0 && option.priceAdjustment > 0;
  };

  const handleConfirm = () => {
    if (!validateSelections()) {
      return;
    }

    const finalSelections: ModifierSelection[] = Object.entries(selections)
      .filter(([_, options]) => options.length > 0)
      .map(([modifierId, options]) => {
        const modifier = modifiers.find((m) => m.id === modifierId)!;
        return {
          modifierId,
          modifierName: modifier.name,
          selectedOptions: options,
        };
      });

    const totalPrice = calculateTotalPrice();
    onConfirm(finalSelections, totalPrice, notes.trim() || undefined);
    onOpenChange(false);

    setSelections({});
    setNotes('');
  };


  const totalPrice = calculateTotalPrice();
  const isValid = validateSelections();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <DialogHeader className="p-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold line-clamp-2">
                Customize {menuItemName}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Select your preferences
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="space-y-5">
            {modifiers.map((modifier, modIndex) => (
              <motion.div
                key={modifier.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: modIndex * 0.05 }}
                className="space-y-3"
              >
                {/* Modifier Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base">{modifier.name}</h4>
                    {modifier.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {modifier.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {modifier.isRequired && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {modifier.selectionType === 'single'
                          ? 'Choose 1'
                          : `Choose ${modifier.minSelections}-${modifier.maxSelections}`}
                      </span>
                      {modifier.freeOptions > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          First {modifier.freeOptions} free
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Options List */}
                <div className="space-y-2">
                  {modifier.options
                    .filter((option) => option.isAvailable)
                    .map((option) => {
                      const isSelected = isOptionSelected(
                        modifier.id,
                        option.id
                      );
                      const quantity = getOptionQuantity(
                        modifier.id,
                        option.id
                      );
                      const displayPrice = getOptionDisplayPrice(option, modifier.id);
                      const isFree = isOptionFree(option, modifier.id);
                      const isOutOfStock = option.inStock === false;

                      return (
                        <div
                          key={option.id}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                            ${
                              isOutOfStock
                                ? 'bg-muted/10 border-muted opacity-50 cursor-not-allowed'
                                : isSelected
                                ? 'bg-primary/5 border-primary shadow-sm cursor-pointer'
                                : 'bg-muted/20 border-border hover:bg-muted/40 hover:border-muted-foreground/30 cursor-pointer'
                            }
                          `}
                          onClick={() =>
                            !isOutOfStock && handleOptionSelect(modifier.id, option, modifier)
                          }
                        >
                          {/* Checkbox/Radio */}
                          <div
                            className={`
                              w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                              ${
                                isSelected
                                  ? 'border-primary bg-primary'
                                  : 'border-muted-foreground/50'
                              }
                            `}
                          >
                            {isSelected && (
                              <Check
                                className="w-3 h-3 text-primary-foreground"
                                strokeWidth={3}
                              />
                            )}
                          </div>

                          {/* Option Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-medium text-sm leading-tight ${
                                isOutOfStock ? 'line-through text-muted-foreground' : ''
                              }`}>
                                {option.name}
                              </p>
                              {isFree && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-green-100 text-green-700 border-green-200 px-1.5 py-0.5"
                                >
                                  FREE
                                </Badge>
                              )}
                              {isOutOfStock && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs px-1.5 py-0.5"
                                >
                                  Out of Stock
                                </Badge>
                              )}
                            </div>
                            {option.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {option.description}
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-semibold ${
                              isOutOfStock ? 'text-muted-foreground' : ''
                            }`}>
                              {displayPrice === 0
                                ? 'Free'
                                : `+${formatCurrency(displayPrice)}`}
                            </p>
                          </div>

                          {/* Quantity Controls for Multiple Selection and Non-unique */}
                          {isSelected &&
                            modifier.selectionType === 'multiple' &&
                            !modifier.unique && (
                              <div
                                className="flex items-center gap-2 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="w-7 h-7 rounded-md border bg-background hover:bg-muted flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() =>
                                    handleQuantityChange(
                                      modifier.id,
                                      option.id,
                                      quantity - 1
                                    )
                                  }
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-6 text-center text-sm font-bold">
                                  {quantity}
                                </span>
                                <button
                                  className="w-7 h-7 rounded-md border bg-background hover:bg-muted flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={(() => {
                                    const currentSelections = selections[modifier.id] || [];
                                    const totalSelectionCount = currentSelections.reduce((sum, sel) => sum + (sel.quantity || 0), 0);
                                    return totalSelectionCount >= modifier.maxSelections;
                                  })()}
                                  onClick={() =>
                                    handleQuantityChange(
                                      modifier.id,
                                      option.id,
                                      quantity + 1
                                    )
                                  }
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            ))}

            {/* Special Notes */}
            <div className="pt-2">
              <label
                htmlFor="notes"
                className="text-sm font-semibold block mb-2"
              >
                Special Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests..."
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
                maxLength={200}
              />
              <div className="text-xs text-muted-foreground mt-1.5">
                {notes.length}/200 characters
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="border-t bg-background p-5 shrink-0">
          {/* Price Breakdown */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base price</span>
              <span className="font-medium">{formatCurrency(basePrice)}</span>
            </div>
            {totalPrice > basePrice && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Add-ons</span>
                <span className="font-medium text-primary">
                  +{formatCurrency(totalPrice - basePrice)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelections({});
                setNotes('');
                onOpenChange(false);
              }}
              className="flex-1"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1"
              size="lg"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
