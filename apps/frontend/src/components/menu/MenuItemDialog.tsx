import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { SimpleCombobox } from '@/components/ui/simple-combobox';
import {
  getCategorySuggestions,
  getMenuItemSuggestions,
  getPriceSuggestions,
} from '@/lib/kerala-menu-suggestions';
import { useCreateMenuItemMutation } from '@/store/api/restaurantsApi';
import type { MenuCategory } from '@/store/api/types';

const itemSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  categoryName: z.string().min(1, 'Please select a category'),
  description: z.string().optional(),
  price: z.number().min(1, 'Price must be at least ₹1'),
});

type FormData = z.infer<typeof itemSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  categories: MenuCategory[];
  onSuccess?: () => void;
}

export function MenuItemDialog({
  open,
  onOpenChange,
  restaurantId,
  categories,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [createMenuItem, { isLoading }] = useCreateMenuItemMutation();
  const [selectedCategory, setSelectedCategory] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', categoryName: '', description: '', price: 0 },
  });

  const allCategories = [
    ...categories.map((c) => c.name),
    ...getCategorySuggestions(),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const menuItemSuggestions = selectedCategory
    ? getMenuItemSuggestions(selectedCategory)
    : [];

  const priceSuggestions = getPriceSuggestions().map((p) => `₹${p}`);

  const handleSubmit = async (data: FormData) => {
    try {
      const existingCategory = categories.find(
        (c) => c.name.toLowerCase() === data.categoryName.toLowerCase()
      );

      await createMenuItem({
        restaurantId,
        body: {
          name: data.name,
          categoryId: existingCategory?.id,
          description: data.description || undefined,
          pricing: {
            amount: data.price,
            currency: 'INR',
            isTaxInclusive: true,
          },
          isAvailable: true,
        },
      }).unwrap();

      toast({
        title: 'Item added successfully!',
        description: `${data.name} added to menu.`,
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Could not create item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Menu Item</DialogTitle>
          <DialogDescription>
            Add a new dish to your restaurant menu.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Category */}
            <FormField
              control={form.control}
              name="categoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <FormControl>
                    <SimpleCombobox
                      value={field.value}
                      onValueChange={(v) => {
                        form.setValue('categoryName', v);
                        setSelectedCategory(v);
                      }}
                      suggestions={allCategories}
                      placeholder="e.g., Breakfast, Curry"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Item Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name *</FormLabel>
                  <FormControl>
                    <SimpleCombobox
                      value={field.value}
                      onValueChange={(v) => form.setValue('name', v)}
                      suggestions={menuItemSuggestions}
                      placeholder="e.g., Appam, Puttu, Dosa"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short note about the dish"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Price */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 25"
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

            <div className="flex flex-wrap gap-1">
              {priceSuggestions.slice(0, 6).map((price) => (
                <Button
                  key={price}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    form.setValue('price', parseInt(price.replace('₹', '')))
                  }
                >
                  {price}
                </Button>
              ))}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                Add Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
