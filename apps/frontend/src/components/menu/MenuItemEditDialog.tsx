import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MenuItemImageUpload } from './MenuItemImageUpload';
import {
  useUpdateMenuItemMutation,
  useGetRestaurantQuery,
} from '@/store/api/restaurantsApi';
import { useGetGstRatesQuery } from '@/store/api/gstApi';
import type { MenuItem, MenuCategory } from '@/store/api/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

const editMenuItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .min(2, 'Item name must be at least 2 characters')
    .max(100, 'Item name must be less than 100 characters'),
  categoryId: z.string().optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(10000, 'Price must be less than ₹10,000'),
  isTaxInclusive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  tags: z.string().optional(),
  hsnCode: z
    .string()
    .regex(/^\d{4,8}$/, 'HSN code must be 4-8 digits')
    .optional()
    .or(z.literal('')),
  gstRateId: z.string().optional(),
  useCustomGst: z.boolean().default(false),
  customGstRate: z
    .number()
    .min(0, 'GST rate cannot be negative')
    .max(100, 'GST rate cannot exceed 100%')
    .optional(),
});

type EditMenuItemFormData = z.infer<typeof editMenuItemSchema>;

interface MenuItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem;
  restaurantId: string;
  categories: MenuCategory[];
  onSuccess?: () => void;
}

export function MenuItemEditDialog({
  open,
  onOpenChange,
  menuItem,
  restaurantId,
  categories,
  onSuccess,
}: MenuItemEditDialogProps) {
  const { toast } = useToast();
  const [updateMenuItem, { isLoading }] = useUpdateMenuItemMutation();
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>(menuItem.tags || []);

  const { data: gstRatesResponse, isLoading: gstRatesLoading } =
    useGetGstRatesQuery(restaurantId);
  const gstRates = gstRatesResponse?.data ?? [];
  const { data: restaurant } = useGetRestaurantQuery(restaurantId);
  const autoApplyGst = restaurant?.applyDefaultGstToMenuItems ?? false;
  const defaultRestaurantGstRate =
    gstRates.find((rate) => rate.isDefault) ?? null;
  const itemHasCustomGst =
    !menuItem.gstRateId && typeof menuItem.gstRate === 'number';

  const form = useForm<EditMenuItemFormData>({
    resolver: zodResolver(editMenuItemSchema),
    defaultValues: {
      name: menuItem.name,
      categoryId: menuItem.categoryId || '',
      description: menuItem.description || '',
      price: menuItem.pricing?.amount || 0,
      isTaxInclusive: menuItem.pricing?.isTaxInclusive ?? false,
      isAvailable: menuItem.isAvailable,
      tags: menuItem.tags?.join(', ') || '',
      hsnCode: menuItem.hsnCode ?? '',
      gstRateId: menuItem.gstRateId ?? '',
      useCustomGst: autoApplyGst ? false : itemHasCustomGst,
      customGstRate: itemHasCustomGst ? menuItem.gstRate : undefined,
    },
  });

  useEffect(() => {
    if (open) {
      const hasCustomGst =
        !menuItem.gstRateId && typeof menuItem.gstRate === 'number';
      form.reset({
        name: menuItem.name,
        categoryId: menuItem.categoryId || '',
        description: menuItem.description || '',
        price: menuItem.pricing?.amount || 0,
        isTaxInclusive: menuItem.pricing?.isTaxInclusive ?? false,
        isAvailable: menuItem.isAvailable,
        tags: menuItem.tags?.join(', ') || '',
        hsnCode: menuItem.hsnCode ?? '',
        gstRateId: menuItem.gstRateId ?? '',
        useCustomGst: autoApplyGst ? false : hasCustomGst,
        customGstRate:
          !autoApplyGst && hasCustomGst ? menuItem.gstRate : undefined,
      });
      setTags(menuItem.tags || []);
      setTagsInput('');
    }
  }, [open, menuItem, form, autoApplyGst]);

  const handleAddTag = () => {
    const tag = tagsInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const useCustomGst = form.watch('useCustomGst');

  useEffect(() => {
    if (!autoApplyGst && !useCustomGst && gstRates.length > 0) {
      const current = form.getValues('gstRateId');
      if (!current) {
        const defaultRate =
          gstRates.find((rate) => rate.isDefault) ?? gstRates[0];
        form.setValue('gstRateId', defaultRate.id);
      }
    }
  }, [autoApplyGst, gstRates, useCustomGst, form]);

  useEffect(() => {
    if (autoApplyGst) {
      form.setValue('useCustomGst', false);
      form.setValue('gstRateId', '');
      form.setValue('customGstRate', undefined);
    }
  }, [autoApplyGst, form]);

  const onSubmit = async (data: EditMenuItemFormData) => {
    const trimmedHsn = data.hsnCode?.trim() ?? '';
    if (trimmedHsn && !/^\d{4,8}$/.test(trimmedHsn)) {
      toast({
        title: 'Invalid HSN code',
        description: 'HSN code must be 4 to 8 digits.',
        variant: 'destructive',
      });
      return;
    }

    const gstPayload: { gstRateId?: string; gstRate?: number } = {};
    if (!autoApplyGst) {
      if (data.useCustomGst) {
        if (
          data.customGstRate === undefined ||
          Number.isNaN(data.customGstRate)
        ) {
          toast({
            title: 'GST rate required',
            description: 'Enter the GST percentage when using a custom rate.',
            variant: 'destructive',
          });
          return;
        }
        gstPayload.gstRate = data.customGstRate;
      } else {
        gstPayload.gstRateId = data.gstRateId || undefined;
      }
    }

    try {
      await updateMenuItem({
        restaurantId,
        itemId: menuItem.id,
        body: {
          name: data.name,
          categoryId: data.categoryId || undefined,
          description: data.description || undefined,
          pricing: {
            amount: data.price,
            currency: 'INR',
            isTaxInclusive: data.isTaxInclusive,
          },
          tags: tags,
          isAvailable: data.isAvailable,
          hsnCode: trimmedHsn || undefined,
          ...gstPayload,
        },
      }).unwrap();

      toast({
        title: 'Menu item updated',
        description: `${data.name} has been updated successfully`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to update menu item',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-4">
        <DialogHeader>
          <DialogTitle>Edit Menu Item</DialogTitle>
          <DialogDescription>
            Update details and images for this menu item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pb-24">
          <Card>
            <CardHeader>
              <CardTitle>Images & gallery</CardTitle>
              <CardDescription>
                Update the photos that appear on your digital menu and QR flows.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-hidden">
              <MenuItemImageUpload
                restaurantId={restaurantId}
                itemId={menuItem.id}
                existingImages={menuItem.imageUrls || []}
                onImageUploaded={onSuccess}
                onImageRemoved={onSuccess}
              />
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic details</CardTitle>
                  <CardDescription>
                    Keep names and categories clear for your team and guests.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 overflow-x-hidden">
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Masala Dosa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(v)}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                Uncategorised
                              </SelectItem>
                              {categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Crispy rice crepe with chutneys"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {/* Pricing & Availability */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing & availability</CardTitle>
                    <CardDescription>
                      Control price visibility and orderability.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₹) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="89.00"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="isTaxInclusive"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 gap-2">
                              <div>
                                <FormLabel>Price includes GST</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Enable if listed price includes GST.
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isAvailable"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 gap-2">
                              <div>
                                <FormLabel>Accepting orders</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Turn off to hide dish from orders.
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* GST & Compliance */}
                <Card>
                  <CardHeader>
                    <CardTitle>GST & compliance</CardTitle>
                    <CardDescription>
                      Keep this dish aligned with your GST configuration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 overflow-x-hidden">
                    <FormField
                      control={form.control}
                      name="hsnCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HSN code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="4–8 digit HSN code"
                              maxLength={8}
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.replace(/\s+/g, '')
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* GST Logic */}
                    {autoApplyGst ? (
                      <Alert>
                        <AlertTitle>GST applied automatically</AlertTitle>
                        <AlertDescription>
                          This dish follows your default GST rate
                          {defaultRestaurantGstRate
                            ? ` (${
                                defaultRestaurantGstRate.categoryName ||
                                'Standard'
                              } · ${defaultRestaurantGstRate.totalGstRate}%)`
                            : '.'}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-3 rounded-lg border p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <FormLabel>Custom GST percentage</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Enable for special GST slab.
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="useCustomGst"
                              render={({ field }) => (
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        form.setValue('gstRateId', '');
                                      } else if (gstRates.length) {
                                        const defaultRate =
                                          gstRates.find((r) => r.isDefault) ??
                                          gstRates[0];
                                        form.setValue(
                                          'gstRateId',
                                          defaultRate.id
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                              )}
                            />
                          </div>

                          {useCustomGst ? (
                            <FormField
                              control={form.control}
                              name="customGstRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step="0.1"
                                      placeholder="Enter GST %"
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === ''
                                            ? undefined
                                            : parseFloat(e.target.value)
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <FormField
                              control={form.control}
                              name="gstRateId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Saved GST rate</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ''}
                                    disabled={
                                      gstRatesLoading || gstRates.length === 0
                                    }
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={
                                            gstRatesLoading
                                              ? 'Loading rates...'
                                              : gstRates.length === 0
                                              ? 'No GST rates'
                                              : 'Select GST rate'
                                          }
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {gstRates.map((rate) => (
                                        <SelectItem
                                          key={rate.id}
                                          value={rate.id}
                                        >
                                          {rate.categoryName || 'Standard'} ·{' '}
                                          {rate.totalGstRate}%{' '}
                                          {rate.isDefault ? '(Default)' : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Tags Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Tags & highlights</CardTitle>
                  <CardDescription>
                    Quick labels help staff filter dishes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 overflow-x-hidden">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      placeholder="Add a tag (e.g., spicy, vegan)"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-grow min-w-[150px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                    >
                      Add tag
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update menu item'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
