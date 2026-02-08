import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Trash2,
  GripVertical,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateMenuModifierForBranchMutation,
  useUpdateMenuModifierMutation,
} from '@/store/api/menuModifiersApi';
import { useListMenuItemsByBranchQuery } from '@/store/api/restaurantsApi';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useBranchContext } from '@/contexts/BranchContext';
import type { MenuModifier } from '@/store/api/menuModifiersApi';

const modifierOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  description: z.string().optional(),
  priceAdjustment: z.number().min(0, 'Price adjustment must be positive'),
  currency: z.string().default('INR'),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().min(0).default(0),
  imageUrl: z.string().optional(),
  allergens: z.array(z.string()).default([]),
});

const modifierFormSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    selectionType: z.enum(['single', 'multiple']),
    minSelections: z.number().min(0),
    maxSelections: z.number().min(1),
    isRequired: z.boolean().default(false),
    options: z
      .array(modifierOptionSchema)
      .min(1, 'At least one option is required'),
    isActive: z.boolean().default(true),
    displayOrder: z.number().min(0).default(0),
    applicableMenuItems: z.array(z.string()).default([]),
  })
  .refine((data) => data.minSelections <= data.maxSelections, {
    message: 'Minimum selections cannot exceed maximum selections',
    path: ['minSelections'],
  })
  .refine(
    (data) => {
      if (data.selectionType === 'single' && data.maxSelections > 1) {
        return false;
      }
      return true;
    },
    {
      message: 'Single selection type cannot have maximum selections > 1',
      path: ['maxSelections'],
    }
  );

type ModifierFormData = z.infer<typeof modifierFormSchema>;

interface ModifierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modifier?: MenuModifier | null;
}

const commonAllergens = [
  'Nuts',
  'Dairy',
  'Gluten',
  'Soy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Sesame',
];

export function ModifierFormDialog({
  open,
  onOpenChange,
  modifier,
}: ModifierFormDialogProps) {
  const { toast } = useToast();
  const { user } = useJwtAuth();
  const { currentBranch } = useBranchContext();

  const restaurantId = user?.restaurantId!;
  const branchId = currentBranch?._id!;

  const [createModifier, { isLoading: isCreating }] =
    useCreateMenuModifierForBranchMutation();
  const [updateModifier, { isLoading: isUpdating }] =
    useUpdateMenuModifierMutation();

  const { data: menuItemsData } = useListMenuItemsByBranchQuery({
    restaurantId,
    branchId,
  });
  const menuItems = menuItemsData?.data || [];

  const [isMenuItemSelectorOpen, setIsMenuItemSelectorOpen] = useState(false);

  const form = useForm<ModifierFormData>({
    resolver: zodResolver(modifierFormSchema),
    defaultValues: {
      name: '',
      description: '',
      selectionType: 'single',
      minSelections: 0,
      maxSelections: 1,
      isRequired: false,
      options: [
        {
          name: '',
          description: '',
          priceAdjustment: 0,
          currency: 'INR',
          isAvailable: true,
          displayOrder: 0,
          allergens: [],
        },
      ],
      isActive: true,
      displayOrder: 0,
      applicableMenuItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const watchSelectionType = form.watch('selectionType');

  useEffect(() => {
    if (modifier) {
      form.reset({
        name: modifier.name,
        description: modifier.description || '',
        selectionType: modifier.selectionType,
        minSelections: modifier.minSelections,
        maxSelections: modifier.maxSelections,
        isRequired: modifier.isRequired,
        options: modifier.options.map((option, index) => ({
          name: option.name,
          description: option.description || '',
          priceAdjustment: option.priceAdjustment,
          currency: option.currency,
          isAvailable: option.isAvailable,
          displayOrder: index,
          imageUrl: option.imageUrl,
          allergens: option.allergens,
        })),
        isActive: modifier.isActive,
        displayOrder: modifier.displayOrder,
        applicableMenuItems: modifier.applicableMenuItems || [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        selectionType: 'single',
        minSelections: 0,
        maxSelections: 1,
        isRequired: false,
        options: [
          {
            name: '',
            description: '',
            priceAdjustment: 0,
            currency: 'INR',
            isAvailable: true,
            displayOrder: 0,
            allergens: [],
          },
        ],
        isActive: true,
        displayOrder: 0,
        applicableMenuItems: [],
      });
    }
  }, [modifier, form]);

  useEffect(() => {
    if (watchSelectionType === 'single') {
      form.setValue('maxSelections', 1);
      if (form.getValues('minSelections') > 1) {
        form.setValue('minSelections', 0);
      }
    }
  }, [watchSelectionType, form]);

  const onSubmit = async (data: ModifierFormData) => {
    try {
      const optionsWithOrder = data.options.map((option, index) => ({
        ...option,
        displayOrder: index,
      }));

      const payload = {
        ...data,
        options: optionsWithOrder,
      };

      if (modifier) {
        await updateModifier({
          restaurantId,
          modifierId: modifier.id,
          body: payload,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Modifier updated successfully',
        });
      } else {
        await createModifier({
          restaurantId,
          branchId,
          body: payload,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Modifier created successfully',
        });
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.data?.message || 'Failed to save modifier',
      });
    }
  };

  const addOption = () => {
    append({
      name: '',
      description: '',
      priceAdjustment: 0,
      currency: 'INR',
      isAvailable: true,
      displayOrder: fields.length,
      allergens: [],
    });
  };

  const addAllergen = (optionIndex: number, allergen: string) => {
    const currentAllergens =
      form.getValues(`options.${optionIndex}.allergens`) || [];
    if (!currentAllergens.includes(allergen)) {
      form.setValue(`options.${optionIndex}.allergens`, [
        ...currentAllergens,
        allergen,
      ]);
    }
  };

  const removeAllergen = (optionIndex: number, allergen: string) => {
    const currentAllergens =
      form.getValues(`options.${optionIndex}.allergens`) || [];
    form.setValue(
      `options.${optionIndex}.allergens`,
      currentAllergens.filter((a) => a !== allergen)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[60vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {modifier ? 'Edit Modifier' : 'Add New Modifier'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit as any)}
          className="space-y-3"
        >
          {/* Basic Information - Always Visible */}
          <div className="space-y-3 bg-muted/30 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-base font-semibold">
                  Modifier Name *
                </Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="e.g., Pizza Toppings, Drink Size"
                  className="mt-2 h-12 text-base"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="selectionType"
                  className="text-base font-semibold"
                >
                  Selection Type *
                </Label>
                <Select
                  value={form.watch('selectionType')}
                  onValueChange={(value: 'single' | 'multiple') =>
                    form.setValue('selectionType', value)
                  }
                >
                  <SelectTrigger className="mt-2 h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      Single Choice (Select One)
                    </SelectItem>
                    <SelectItem value="multiple">
                      Multiple Choice (Select Many)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-base font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Brief description of this modifier"
                rows={3}
                className="mt-2 text-base"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label
                  htmlFor="minSelections"
                  className="text-base font-semibold"
                >
                  Min Selections
                </Label>
                <Input
                  id="minSelections"
                  type="number"
                  min="0"
                  {...form.register('minSelections', { valueAsNumber: true })}
                  className="mt-2 h-12 text-base"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  0 = optional
                </p>
                {form.formState.errors.minSelections && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.minSelections.message}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="maxSelections"
                  className="text-base font-semibold"
                >
                  Max Selections
                </Label>
                <Input
                  id="maxSelections"
                  type="number"
                  min="1"
                  {...form.register('maxSelections', { valueAsNumber: true })}
                  className="mt-2 h-12 text-base"
                  disabled={watchSelectionType === 'single'}
                />
                {form.formState.errors.maxSelections && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.maxSelections.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border mt-6">
                <Label
                  htmlFor="isRequired"
                  className="text-base font-medium cursor-pointer"
                >
                  Required
                </Label>
                <Switch
                  id="isRequired"
                  checked={form.watch('isRequired')}
                  onCheckedChange={(checked) =>
                    form.setValue('isRequired', checked)
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
              <Label
                htmlFor="isActive"
                className="text-base font-medium cursor-pointer"
              >
                Active (visible to customers)
              </Label>
              <Switch
                id="isActive"
                checked={form.watch('isActive')}
                onCheckedChange={(checked) =>
                  form.setValue('isActive', checked)
                }
              />
            </div>
          </div>

          {/* Accordion for Additional Details */}
          <Accordion type="multiple" className="w-full space-y-4">
            {/* Options */}
            <AccordionItem
              value="options"
              className="border rounded-lg px-4"
              defaultChecked
            >
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                Options ({fields.length}) - Add choices customers can select
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2 space-y-4">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border rounded-lg p-4 bg-muted/30"
                    >
                      <div className="flex items-start gap-4">
                        <div className="cursor-move pt-3 shrink-0">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">
                                Option Name *
                              </Label>
                              <Input
                                {...form.register(`options.${index}.name`)}
                                placeholder="e.g., Extra Cheese, Large"
                                className="mt-2 h-11"
                              />
                              {form.formState.errors.options?.[index]?.name && (
                                <p className="text-sm text-destructive mt-1">
                                  {
                                    form.formState.errors.options[index]?.name
                                      ?.message
                                  }
                                </p>
                              )}
                            </div>

                            <div>
                              <Label className="font-medium">
                                Price Adjustment (₹)
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register(
                                  `options.${index}.priceAdjustment`,
                                  { valueAsNumber: true }
                                )}
                                placeholder="0.00"
                                className="mt-2 h-11"
                              />
                              {form.formState.errors.options?.[index]
                                ?.priceAdjustment && (
                                <p className="text-sm text-destructive mt-1">
                                  {
                                    form.formState.errors.options[index]
                                      ?.priceAdjustment?.message
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <Label className="font-medium">
                              Description (Optional)
                            </Label>
                            <Input
                              {...form.register(`options.${index}.description`)}
                              placeholder="Brief description"
                              className="mt-2"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                            <Label className="font-medium cursor-pointer">
                              Available
                            </Label>
                            <Switch
                              checked={form.watch(
                                `options.${index}.isAvailable`
                              )}
                              onCheckedChange={(checked) =>
                                form.setValue(
                                  `options.${index}.isAvailable`,
                                  checked
                                )
                              }
                            />
                          </div>

                          {/* Allergens */}
                          <div>
                            <Label className="font-medium mb-2 block">
                              Allergens
                            </Label>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {form
                                  .watch(`options.${index}.allergens`)
                                  ?.map((allergen) => (
                                    <Badge
                                      key={allergen}
                                      variant="secondary"
                                      className="cursor-pointer"
                                      onClick={() =>
                                        removeAllergen(index, allergen)
                                      }
                                    >
                                      {allergen} ×
                                    </Badge>
                                  ))}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {commonAllergens.map((allergen) => {
                                  const isSelected = form
                                    .watch(`options.${index}.allergens`)
                                    ?.includes(allergen);
                                  if (!isSelected) {
                                    return (
                                      <Button
                                        key={allergen}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          addAllergen(index, allergen)
                                        }
                                      >
                                        + {allergen}
                                      </Button>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {form.formState.errors.options && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.options.message}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Menu Items */}
            <AccordionItem
              value="menu-items"
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                Apply to Menu Items ({form.watch('applicableMenuItems').length}{' '}
                selected)
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose which menu items this modifier should be available
                    for
                  </p>

                  <Popover
                    open={isMenuItemSelectorOpen}
                    onOpenChange={setIsMenuItemSelectorOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isMenuItemSelectorOpen}
                        className="w-full justify-between h-12"
                      >
                        <span className="truncate">
                          {form.watch('applicableMenuItems').length === 0
                            ? 'Select menu items...'
                            : `${
                                form.watch('applicableMenuItems').length
                              } item${
                                form.watch('applicableMenuItems').length === 1
                                  ? ''
                                  : 's'
                              } selected`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search menu items..." />
                        <CommandEmpty>No menu items found.</CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-auto">
                          {menuItems.map((item) => (
                            <CommandItem
                              key={item.id}
                              onSelect={() => {
                                const currentIds = form.getValues(
                                  'applicableMenuItems'
                                );
                                const isSelected = currentIds.includes(item.id);

                                if (isSelected) {
                                  form.setValue(
                                    'applicableMenuItems',
                                    currentIds.filter((id) => id !== item.id)
                                  );
                                } else {
                                  form.setValue('applicableMenuItems', [
                                    ...currentIds,
                                    item.id,
                                  ]);
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  form
                                    .watch('applicableMenuItems')
                                    .includes(item.id)
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ₹{item.pricing?.amount}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {form.watch('applicableMenuItems').length > 0 && (
                    <div>
                      <Label className="text-sm mb-2 block">
                        Selected Items:
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {form.watch('applicableMenuItems').map((itemId) => {
                          const item = menuItems?.find((i) => i.id === itemId);
                          return item ? (
                            <Badge
                              key={itemId}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const currentIds = form.getValues(
                                  'applicableMenuItems'
                                );
                                form.setValue(
                                  'applicableMenuItems',
                                  currentIds.filter((id) => id !== itemId)
                                );
                              }}
                            >
                              {item.name} ×
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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
                : modifier
                ? 'Update Modifier'
                : 'Create Modifier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
