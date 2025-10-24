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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
  useListMenuItemsQuery,
} from '@/store/api/restaurantsApi';
import { skipToken } from '@reduxjs/toolkit/query';
import type { MenuCategory } from '@/store/api/types';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name must be less than 50 characters'),
  description: z
    .string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryManagerProps {
  restaurantId: string;
  categories: MenuCategory[];
  isLoading?: boolean;
}

export function CategoryManager({
  restaurantId,
  categories,
  isLoading,
}: CategoryManagerProps) {
  const { toast } = useToast();

  // Get all menu items to calculate item counts per category
  const { data: menuItemsResponse } = useListMenuItemsQuery(
    restaurantId ? { restaurantId } : skipToken
  );
  const menuItems = menuItemsResponse?.data ?? [];
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [createCategory, { isLoading: isCreating }] = useCreateMenuCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateMenuCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteMenuCategoryMutation();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  const resetForm = () => {
    form.reset();
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: MenuCategory) => {
    setEditingCategory(category);
    setShowForm(true);
    form.reset({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
    });
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setShowForm(true);
    form.reset({
      name: '',
      description: '',
      isActive: true,
    });
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateCategory({
          restaurantId,
          categoryId: editingCategory.id,
          body: {
            name: data.name,
            description: data.description || undefined,
            isActive: data.isActive,
          },
        }).unwrap();

        toast({
          title: 'Category updated',
          description: `${data.name} has been updated successfully`,
        });
      } else {
        await createCategory({
          restaurantId,
          body: {
            name: data.name,
            description: data.description || undefined,
            displayOrder: categories.length,
            isActive: data.isActive,
          },
        }).unwrap();

        toast({
          title: 'Category created',
          description: `${data.name} has been added to your menu`,
        });
      }

      resetForm();
    } catch (error) {
      toast({
        title: editingCategory ? 'Failed to update category' : 'Failed to create category',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    try {
      await deleteCategory({ restaurantId, categoryId }).unwrap();
      toast({
        title: 'Category deleted',
        description: `${categoryName} has been removed from your menu`,
      });
    } catch (error) {
      toast({
        title: 'Failed to delete category',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const getItemCount = (categoryId: string) => {
    return menuItems.filter(item => item.categoryId === categoryId).length;
  };

  const getAvailableItemCount = (categoryId: string) => {
    return menuItems.filter(item => item.categoryId === categoryId && item.isAvailable).length;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menu Categories</CardTitle>
              <CardDescription>
                Organize your menu items into categories for better customer experience
              </CardDescription>
            </div>
            <Button onClick={handleCreate} disabled={isCreating || isUpdating}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                No categories yet. Create your first category to start organizing your menu.
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Card key={category.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold">{category.name}</h4>
                        {category.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{category.name}"?
                                Menu items in this category will become uncategorized.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(category.id, category.name)}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={category.isActive ? 'default' : 'secondary'}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getItemCount(category.id)} items
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getAvailableItemCount(category.id)} available
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </CardTitle>
            <CardDescription>
              {editingCategory
                ? 'Update the category details below'
                : 'Add a new category to organize your menu items'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Breakfast, Main Course, Desserts"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Choose a clear, descriptive name for this category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Fresh and healthy morning options"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional description to help customers understand this category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active Category</FormLabel>
                        <FormDescription>
                          Active categories are visible to customers
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
                    type="submit"
                    disabled={isCreating || isUpdating}
                    className="flex-1"
                  >
                    {isCreating || isUpdating
                      ? (editingCategory ? 'Updating...' : 'Creating...')
                      : (editingCategory ? 'Update Category' : 'Create Category')
                    }
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}