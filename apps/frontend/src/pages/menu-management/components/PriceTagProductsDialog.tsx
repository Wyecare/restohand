import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useListMenuItemsByBranchQuery } from '@/store/api/restaurantsApi';
import { useUpdateMenuPriceTagMutation } from '@/store/api/menuPriceTagsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';
import type { MenuPriceTag } from '@/store/api/menuPriceTagsApi';

interface PriceTagProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceTag: MenuPriceTag | null;
}

export function PriceTagProductsDialog({
  open,
  onOpenChange,
  priceTag,
}: PriceTagProductsDialogProps) {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();

  const restaurantId = user?.restaurantId || '';
  const branchId = currentBranch?._id || '';

  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const { data: menuItemsData } = useListMenuItemsByBranchQuery(
    restaurantId && branchId ? { restaurantId, branchId } : skipToken
  );
  const menuItems = menuItemsData?.data || [];

  const [updatePriceTag, { isLoading }] = useUpdateMenuPriceTagMutation();

  // Get current product IDs from price tag
  const currentProductIds = priceTag?.itemPrices?.map(item => item.menuItemId) || [];

  // Get available products (not already in this price tag)
  const availableProducts = menuItems.filter(item => !currentProductIds.includes(item.id));

  const addProduct = async (productId: string) => {
    if (!priceTag) return;

    const menuItem = menuItems.find(item => item.id === productId);
    if (!menuItem) return;

    try {
      const newItemPrice = {
        menuItemId: productId,
        price: menuItem.pricing.amount,
        currency: 'INR',
        discountType: 'fixed' as const,
        isActive: true,
      };

      const updatedItemPrices = [...(priceTag.itemPrices || []), newItemPrice];

      await updatePriceTag({
        restaurantId,
        priceTagId: priceTag.id,
        body: {
          ...priceTag,
          itemPrices: updatedItemPrices,
        },
      }).unwrap();

      toast({
        title: 'Success',
        description: `Added ${menuItem.name} to ${priceTag.name}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to add product',
      });
    }
  };

  const removeProduct = async (productId: string) => {
    if (!priceTag) return;

    const menuItem = menuItems.find(item => item.id === productId);

    try {
      const updatedItemPrices = priceTag.itemPrices?.filter(item => item.menuItemId !== productId) || [];

      await updatePriceTag({
        restaurantId,
        priceTagId: priceTag.id,
        body: {
          ...priceTag,
          itemPrices: updatedItemPrices,
        },
      }).unwrap();

      toast({
        title: 'Success',
        description: `Removed ${menuItem?.name || 'item'} from ${priceTag.name}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to remove product',
      });
    }
  };

  if (!priceTag) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Products - {priceTag.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Products */}
          <div>
            <Label className="text-base font-medium">Current Products ({currentProductIds.length})</Label>
            {currentProductIds.length > 0 ? (
              <div className="mt-3 space-y-2">
                {currentProductIds.map((productId) => {
                  const menuItem = menuItems.find(item => item.id === productId);
                  const itemPrice = priceTag.itemPrices?.find(item => item.menuItemId === productId);

                  return menuItem ? (
                    <Card key={productId} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{menuItem.name}</div>
                          <div className="text-sm text-gray-500">
                            Price: ₹{itemPrice?.price || menuItem.pricing.amount}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProduct(productId)}
                          className="text-red-600 hover:text-red-700"
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="mt-3 p-4 text-center text-gray-500 border border-dashed rounded-md">
                No products in this price tag yet
              </div>
            )}
          </div>

          {/* Add Products */}
          <div>
            <Label className="text-base font-medium">Add Products</Label>
            <div className="mt-3">
              <Popover open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isProductSelectorOpen}
                    className="w-full justify-between"
                    disabled={availableProducts.length === 0}
                  >
                    {availableProducts.length === 0
                      ? 'No more products to add'
                      : 'Select a product to add...'
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandEmpty>No products found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                      {availableProducts.map((item) => (
                        <CommandItem
                          key={item.id}
                          onSelect={() => {
                            addProduct(item.id);
                            setIsProductSelectorOpen(false);
                          }}
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500">
                              ₹{item.pricing.amount}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}