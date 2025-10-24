import { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  useListMenuItemsQuery,
  useDeleteMenuCategoryMutation,
} from '@/store/api/restaurantsApi';
import type { MenuCategory } from '@/store/api/types';
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
import { Edit2, Trash2, Plus, Utensils, FolderPlus } from 'lucide-react';
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
import { MenuCategoryDialog } from '@/components/menu/MenuCategoryDialog';

interface SimpleCategoryManagerProps {
  restaurantId: string;
  categories: MenuCategory[];
  isLoading?: boolean;
}

export function SimpleCategoryManager({
  restaurantId,
  categories,
  isLoading,
}: SimpleCategoryManagerProps) {
  const { toast } = useToast();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null
  );

  // Fetch menu items for stats
  const { data: menuItemsResponse } = useListMenuItemsQuery(
    restaurantId ? { restaurantId } : skipToken
  );
  const menuItems = menuItemsResponse?.data ?? [];

  // Delete mutation
  const [deleteCategory, { isLoading: deleting }] =
    useDeleteMenuCategoryMutation();

  // Helpers
  const countItems = (id: string) =>
    menuItems.filter((i) => i.categoryId === id).length;
  const countAvailable = (id: string) =>
    menuItems.filter((i) => i.categoryId === id && i.isAvailable).length;

  const handleEdit = (category: MenuCategory) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteCategory({ restaurantId, categoryId: id }).unwrap();
      toast({
        title: 'Deleted',
        description: `${name} has been removed.`,
      });
    } catch {
      toast({
        title: 'Failed to delete',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Utensils className="h-5 w-5 text-muted-foreground" />
            Menu Categories
          </h2>
          <p className="text-sm text-muted-foreground">
            Organize your dishes into categories like “Breakfast” or “Biriyani”.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-6">Loading...</p>
      ) : categories.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FolderPlus className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>No categories yet — create your first one!</p>
        </div>
      ) : (
        <MetricsGrid columns={3}>
          {categories.map((cat) => (
            <MetricsCard
              key={cat.id}
              title={cat.name}
              value={`${countItems(cat.id)} Items`}
              description={`${countAvailable(cat.id)} available`}
              icon={Utensils}
              iconColor="green"
              badge={{
                text: `${countAvailable(cat.id)} avail.`,
                variant: 'outline',
              }}
              className="relative group"
            >
              {/* Hover Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(cat);
                  }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{cat.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the category and all linked menu items.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={deleting}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </MetricsCard>
          ))}
        </MetricsGrid>
      )}

      {/* Dialog for Add/Edit */}
      <MenuCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        restaurantId={restaurantId}
        categories={categories}
        editingCategory={editingCategory}
        onSuccess={() => setDialogOpen(false)}
      />
    </div>
  );
}
