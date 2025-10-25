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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { MenuItemImageUpload } from './MenuItemImageUpload';
import { useUpdateMenuItemMutation } from '@/store/api/restaurantsApi';
import type { MenuItem, MenuCategory } from '@/store/api/types';

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

  const form = useForm<EditMenuItemFormData>({
    resolver: zodResolver(editMenuItemSchema),
    defaultValues: {
      name: menuItem.name,
      categoryId: menuItem.categoryId || '',
      description: menuItem.description || '',
      price: menuItem.pricing?.amount || 0,
      isTaxInclusive: menuItem.pricing?.isTaxInclusive ?? true,
      isAvailable: menuItem.isAvailable,
      tags: menuItem.tags?.join(', ') || '',
    },
  });

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      form.reset({
        name: menuItem.name,
        categoryId: menuItem.categoryId || '',
        description: menuItem.description || '',
        price: menuItem.pricing?.amount || 0,
        isTaxInclusive: menuItem.pricing?.isTaxInclusive ?? true,
        isAvailable: menuItem.isAvailable,
        tags: menuItem.tags?.join(', ') || '',
      });
      setTags(menuItem.tags || []);
      setTagsInput('');
    }
  }, [open, menuItem, form]);

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

  const onSubmit = async (data: EditMenuItemFormData) => {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Menu Item</DialogTitle>
          <DialogDescription>
            Update the details and images for this menu item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Images</h4>
            <MenuItemImageUpload
              restaurantId={restaurantId}
              itemId={menuItem.id}
              existingImages={menuItem.imageUrls || []}
              onImageUploaded={onSuccess}
              onImageRemoved={onSuccess}
            />
          </div>

          <Separator />

          {/* Form Section */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
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
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Uncategorized</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                              {category.description && (
                                <span className="text-muted-foreground ml-2">
                                  - {category.description}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the category this item belongs to
                      </FormDescription>
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
                        placeholder="e.g., Crispy rice crepe with spiced potatoes and chutneys"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Help customers understand what makes this dish special
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
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

                <FormField
                  control={form.control}
                  name="isTaxInclusive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Tax Inclusive Price</FormLabel>
                        <FormDescription className="text-xs">
                          Price includes all applicable taxes
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag (e.g., spicy, vegan, popular)"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
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
                <FormDescription>
                  Tags help customers find items and highlight special
                  attributes
                </FormDescription>
              </div>

              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Available for Orders</FormLabel>
                      <FormDescription>
                        Customers can order this item when available
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Updating...' : 'Update Menu Item'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
