import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  Check,
  ChevronsUpDown,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateMenuPriceTagForBranchMutation,
  useUpdateMenuPriceTagMutation,
} from '@/store/api/menuPriceTagsApi';
import {
  useListMenuItemsByBranchQuery,
  useSearchMenuByBranchQuery,
} from '@/store/api/restaurantsApi';
import { useDebounce } from '@/hooks/use-debounce';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import { skipToken } from '@reduxjs/toolkit/query/react';
import type { MenuPriceTag } from '@/store/api/menuPriceTagsApi';

const itemPriceSchema = z.object({
  menuItemId: z.string(),
  price: z.number().min(0, 'Price must be positive'),
  currentPrice: z.number(),
  itemName: z.string(),
});

const priceTagFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  selectedItems: z
    .array(z.string())
    .min(1, 'At least one menu item is required'),
  itemPrices: z.array(itemPriceSchema),
});

type PriceTagFormData = z.infer<typeof priceTagFormSchema>;

interface PriceTagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceTag?: MenuPriceTag | null;
}

export function PriceTagFormDialog({
  open,
  onOpenChange,
  priceTag,
}: PriceTagFormDialogProps) {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();

  const restaurantId = user?.restaurantId || '';
  const branchId = currentBranch?._id || '';

  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: menuItemsData } = useListMenuItemsByBranchQuery(
    restaurantId && branchId ? { restaurantId, branchId } : skipToken
  );

  // Wrap menuItems in useMemo to prevent useEffect dependency issues
  const menuItems = useMemo(
    () => menuItemsData?.data || [],
    [menuItemsData?.data]
  );

  // Use search API when user is searching
  const { data: searchResults } = useSearchMenuByBranchQuery(
    debouncedSearchQuery.trim().length > 0 && restaurantId && branchId
      ? {
          restaurantId,
          branchId,
          query: debouncedSearchQuery.trim(),
          limit: 50,
        }
      : skipToken
  );

  // Create a combined items map for easy lookup
  const itemsMap = useMemo(() => {
    const map = new Map();

    // Add all menu items
    menuItems.forEach((item) => {
      map.set(item.id, item);
    });

    // Add/override with search results (in case they're more recent)
    if (searchResults?.results) {
      searchResults.results
        .filter((result) => result.type === 'item')
        .forEach((result) => {
          map.set(result.id, {
            id: result.id,
            name: result.name,
            description: result.description,
            pricing: {
              amount: result.pricing?.amount || 0,
              currency: result.pricing?.currency || 'INR',
            },
            isAvailable: result.isAvailable,
            categoryId: result.categoryId,
          });
        });
    }

    return map;
  }, [menuItems, searchResults]);

  // Display either search results or all menu items
  const displayItems = useMemo(() => {
    if (searchQuery.trim().length > 0 && searchResults) {
      return searchResults.results
        .filter((result) => result.type === 'item')
        .map((result) => itemsMap.get(result.id))
        .filter(Boolean);
    }
    return menuItems;
  }, [searchQuery, searchResults, menuItems, itemsMap]);

  const [createPriceTag, { isLoading: isCreating }] =
    useCreateMenuPriceTagForBranchMutation();
  const [updatePriceTag, { isLoading: isUpdating }] =
    useUpdateMenuPriceTagMutation();

  const form = useForm<PriceTagFormData>({
    resolver: zodResolver(priceTagFormSchema),
    defaultValues: {
      name: '',
      description: '',
      selectedItems: [],
      itemPrices: [],
    },
  });

  useEffect(() => {
    if (priceTag) {
      const currentItemIds =
        priceTag.itemPrices?.map((item) => item.menuItemId) || [];
      const itemPricesData =
        priceTag.itemPrices?.map((itemPrice) => {
          const menuItem = itemsMap.get(itemPrice.menuItemId);
          return {
            menuItemId: itemPrice.menuItemId,
            price: itemPrice.price,
            currentPrice: menuItem?.pricing.amount || 0,
            itemName: menuItem?.name || 'Unknown Item',
          };
        }) || [];

      form.reset({
        name: priceTag.name,
        description: priceTag.description || '',
        selectedItems: currentItemIds,
        itemPrices: itemPricesData,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        selectedItems: [],
        itemPrices: [],
      });
    }
  }, [priceTag, itemsMap, form]);

  const onSubmit = async (data: PriceTagFormData) => {
    if (!restaurantId || !branchId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing restaurant or branch information',
      });
      return;
    }

    try {
      const itemPrices = data.itemPrices.map((itemPrice) => ({
        menuItemId: itemPrice.menuItemId,
        price: itemPrice.price,
        currency: 'INR',
        discountType: 'fixed' as const,
        isActive: true,
      }));

      const payload = {
        name: data.name,
        description: data.description || '',
        color: '#1FB6FF',
        isActive: true,
        isDefault: false,
        priority: 10,
        itemPrices,
        autoActivate: false,
        displayOrder: 0,
      };

      if (priceTag) {
        await updatePriceTag({
          restaurantId,
          priceTagId: priceTag.id,
          body: payload,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Price tag updated successfully',
        });
      } else {
        await createPriceTag({
          restaurantId,
          branchId,
          body: payload,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Price tag created successfully',
        });
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to save price tag',
      });
    }
  };

  const toggleItem = (itemId: string) => {
    const currentItems = form.getValues('selectedItems');
    const currentPrices = form.getValues('itemPrices');
    const isSelected = currentItems.includes(itemId);

    if (isSelected) {
      // Remove item
      const newItems = currentItems.filter((id) => id !== itemId);
      const newPrices = currentPrices.filter(
        (price) => price.menuItemId !== itemId
      );
      form.setValue('selectedItems', newItems);
      form.setValue('itemPrices', newPrices);
    } else {
      // Add item - use itemsMap which includes both menu items and search results
      const item = itemsMap.get(itemId);
      if (item) {
        const newItems = [...currentItems, itemId];
        const newPriceEntry = {
          menuItemId: itemId,
          price: item.pricing.amount,
          currentPrice: item.pricing.amount,
          itemName: item.name,
        };
        const newPrices = [...currentPrices, newPriceEntry];

        form.setValue('selectedItems', newItems);
        form.setValue('itemPrices', newPrices);
      }
    }
  };

  const removeItem = (itemId: string) => {
    const currentItems = form.getValues('selectedItems');
    const currentPrices = form.getValues('itemPrices');

    const newItems = currentItems.filter((id) => id !== itemId);
    const newPrices = currentPrices.filter(
      (price) => price.menuItemId !== itemId
    );

    form.setValue('selectedItems', newItems);
    form.setValue('itemPrices', newPrices);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[60vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {priceTag ? 'Edit Price Tag' : 'Add New Price Tag'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {/* Basic Information - Always Visible */}
          <div className="space-y-6 bg-muted/30 p-6 rounded-lg">
            <div>
              <Label htmlFor="name" className="text-base font-semibold">
                Price Tag Name *
              </Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., Weekend Special, Happy Hour"
                className="mt-2 h-12 text-base"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-base font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Brief description of this price tag"
                rows={3}
                className="mt-2 text-base"
              />
            </div>

            {/* Select Menu Items */}
            <div>
              <Label className="text-base font-semibold">
                Select Menu Items *
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose which items this price tag applies to
              </p>

              <Popover
                open={isItemSelectorOpen}
                onOpenChange={setIsItemSelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isItemSelectorOpen}
                    className="w-full justify-between h-12 text-base"
                  >
                    <span className="truncate">
                      {form.watch('selectedItems').length === 0
                        ? 'Select menu items...'
                        : `${form.watch('selectedItems').length} item${
                            form.watch('selectedItems').length === 1 ? '' : 's'
                          } selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandEmpty>No menu items found.</CommandEmpty>
                    <CommandGroup className="max-h-[400px] overflow-y-auto">
                      {displayItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => {
                            toggleItem(item.id);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              form.watch('selectedItems').includes(item.id)
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ₹{item.pricing.amount}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              {form.formState.errors.selectedItems && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.selectedItems.message}
                </p>
              )}

              {/* Selected Items Display */}
              {form.watch('selectedItems').length > 0 && (
                <div className="mt-3">
                  <Label className="text-sm mb-2 block">Selected Items:</Label>
                  <div className="flex flex-wrap gap-2">
                    {form.watch('selectedItems').map((itemId) => {
                      const item = itemsMap.get(itemId);
                      return item ? (
                        <Badge
                          key={itemId}
                          variant="secondary"
                          className="cursor-pointer text-sm py-1.5 px-3"
                          onClick={() => removeItem(itemId)}
                        >
                          {item.name} <X className="ml-1 h-3 w-3" />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Accordion for Item Prices */}
          {form.watch('selectedItems').length > 0 && (
            <Accordion type="single" defaultValue="prices" className="w-full">
              <AccordionItem value="prices" className="border rounded-lg px-4">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Set Prices ({form.watch('itemPrices').length} items)
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Configure the special price for each selected item
                    </p>

                    <div className="space-y-3">
                      {form.watch('itemPrices').map((itemPrice, index) => {
                        const menuItem = itemsMap.get(itemPrice.menuItemId);
                        const priceDiff =
                          itemPrice.price - itemPrice.currentPrice;
                        const isDiscount = priceDiff < 0;
                        const isIncrease = priceDiff > 0;
                        const isSame = priceDiff === 0;

                        return (
                          <div
                            key={itemPrice.menuItemId}
                            className="border-2 rounded-lg p-4 bg-background"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">
                                  {menuItem?.name || itemPrice.itemName}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm text-muted-foreground">
                                    Regular Price:
                                  </span>
                                  <span className="font-medium">
                                    ₹{itemPrice.currentPrice.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(itemPrice.menuItemId)}
                                className="text-destructive hover:text-destructive shrink-0"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <Label
                                  htmlFor={`price-${index}`}
                                  className="font-medium"
                                >
                                  Special Price (₹) *
                                </Label>
                                <Input
                                  id={`price-${index}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...form.register(
                                    `itemPrices.${index}.price`,
                                    {
                                      valueAsNumber: true,
                                    }
                                  )}
                                  placeholder="Enter special price"
                                  className="mt-2 h-11 text-base"
                                />
                                {form.formState.errors.itemPrices?.[index]
                                  ?.price && (
                                  <p className="text-sm text-destructive mt-1">
                                    {
                                      form.formState.errors.itemPrices[index]
                                        ?.price?.message
                                    }
                                  </p>
                                )}
                              </div>

                              {/* Price Comparison */}
                              <div
                                className={cn(
                                  'p-3 rounded-lg flex items-center justify-between',
                                  isDiscount &&
                                    'bg-green-50 border border-green-200',
                                  isIncrease &&
                                    'bg-red-50 border border-red-200',
                                  isSame && 'bg-muted/50 border border-muted'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  {isDiscount && (
                                    <TrendingDown className="h-5 w-5 text-green-600" />
                                  )}
                                  {isIncrease && (
                                    <TrendingUp className="h-5 w-5 text-red-600" />
                                  )}
                                  {isSame && (
                                    <Minus className="h-5 w-5 text-muted-foreground" />
                                  )}
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      isDiscount && 'text-green-700',
                                      isIncrease && 'text-red-700',
                                      isSame && 'text-muted-foreground'
                                    )}
                                  >
                                    {isDiscount &&
                                      `Save ₹${Math.abs(priceDiff).toFixed(2)}`}
                                    {isIncrease && `+₹${priceDiff.toFixed(2)}`}
                                    {isSame && 'Same as regular price'}
                                  </span>
                                </div>
                                {!isSame && (
                                  <Badge
                                    variant={
                                      isDiscount ? 'default' : 'destructive'
                                    }
                                    className={isDiscount ? 'bg-green-600' : ''}
                                  >
                                    {Math.abs(
                                      (priceDiff / itemPrice.currentPrice) * 100
                                    ).toFixed(0)}
                                    %{isDiscount ? ' OFF' : ' MORE'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
              size="lg"
              className="min-w-32"
            >
              {isCreating || isUpdating
                ? 'Saving...'
                : priceTag
                ? 'Update Price Tag'
                : 'Create Price Tag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
