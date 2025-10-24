import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { useCreateMenuItemMutation } from '@/store/api/restaurantsApi';
import type { MenuCategory } from '@/store/api/types';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const menuItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .min(2, 'Item name must be at least 2 characters')
    .max(100, 'Item name must be less than 100 characters'),
  categoryId: z.string().min(1, 'Please select a category'),
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

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface MenuItemFormProps {
  restaurantId: string;
  categories: MenuCategory[];
  onSuccess?: () => void;
  defaultCategoryId?: string;
}

export function MenuItemForm({
  restaurantId,
  categories,
  onSuccess,
  defaultCategoryId,
}: MenuItemFormProps) {
  const { toast } = useToast();
  const [createMenuItem, { isLoading }] = useCreateMenuItemMutation();

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      categoryId: defaultCategoryId || '',
      description: '',
      price: 0,
      isTaxInclusive: true,
      isAvailable: true,
      tags: '',
    },
  });

  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    const tag = tagsInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: MenuItemFormData) => {
    try {
      await createMenuItem({
        restaurantId,
        body: {
          name: data.name,
          categoryId: data.categoryId,
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

      form.reset();
      setTags([]);
      setTagsInput('');

      toast({
        title: 'Menu item created',
        description: `${data.name} has been added to your menu`,
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to create menu item',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Menu Item</CardTitle>
          <CardDescription>
            Create categories first to organize your menu items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You need at least one category before you can add menu items.
            Categories help organize your menu and improve the customer experience.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Menu Item</CardTitle>
        <CardDescription>
          Create a new dish and assign it to a category for better organization
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                      <Input
                        placeholder="e.g., Masala Dosa"
                        {...field}
                      />
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
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                <Button type="button" variant="outline" onClick={handleAddTag}>
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
                Tags help customers find items and highlight special attributes
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
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Creating...' : 'Create Menu Item'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setTags([]);
                  setTagsInput('');
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}