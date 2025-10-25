import { useMemo, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import {
  useListMenuItemsQuery,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} from '@/store/api/restaurantsApi';
import type { MenuCategory, MenuItem } from '@/store/api/types';
import { Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MenuItemsTable } from './MenuItemsTable';
import { MenuItemEditDialog } from './MenuItemEditDialog';

interface MenuItemManagerProps {
  restaurantId: string;
  categories: MenuCategory[];
}

export function MenuItemManager({ restaurantId, categories }: MenuItemManagerProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available' | 'unavailable'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);

  const categoryIdFilter = useMemo(
    () => (selectedCategory !== 'all' ? selectedCategory : undefined),
    [selectedCategory]
  );

  const {
    data: menuItemsResponse,
    isLoading: isItemsLoading,
    isFetching: isItemsFetching,
  } = useListMenuItemsQuery(
    restaurantId ? { restaurantId, categoryId: categoryIdFilter } : skipToken
  );
  const menuItems = menuItemsResponse?.data ?? [];

  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [deleteMenuItem] = useDeleteMenuItemMutation();

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Filter by availability
      if (availabilityFilter === 'available' && !item.isAvailable) {
        return false;
      }
      if (availabilityFilter === 'unavailable' && item.isAvailable) {
        return false;
      }

      // Filter by search term
      if (searchTerm.trim().length) {
        const needle = searchTerm.trim().toLowerCase();
        if (
          !item.name.toLowerCase().includes(needle) &&
          !(item.description ?? '').toLowerCase().includes(needle) &&
          !item.tags.some(tag => tag.toLowerCase().includes(needle))
        ) {
          return false;
        }
      }

      return true;
    });
  }, [menuItems, availabilityFilter, searchTerm]);

  const handleAvailabilityToggle = async (
    itemId: string,
    isAvailable: boolean
  ) => {
    try {
      await updateMenuItem({
        restaurantId,
        itemId,
        body: { isAvailable },
      }).unwrap();
      toast({
        title: `Item ${isAvailable ? 'marked available' : 'set unavailable'}`,
      });
    } catch (error) {
      toast({
        title: 'Unable to update item',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleBulkAvailability = async (isAvailable: boolean) => {
    if (filteredItems.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        filteredItems.map((item) =>
          updateMenuItem({
            restaurantId,
            itemId: item.id,
            body: { isAvailable },
          }).unwrap()
        )
      );
      toast({
        title: isAvailable ? 'Items marked available' : 'Items paused',
        description: `${filteredItems.length} item(s) updated`,
      });
    } catch (error) {
      toast({
        title: 'Unable to bulk update items',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    try {
      await deleteMenuItem({ restaurantId, itemId: item.id }).unwrap();
      toast({
        title: 'Item deleted',
        description: `${item.name} has been removed from your menu`,
      });
      setDeleteItem(null);
    } catch (error) {
      toast({
        title: 'Failed to delete item',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
  };

  const handleManageImages = (item: MenuItem) => {
    setEditingItem(item);
  };

  const handleToggleAvailability = (item: MenuItem) => {
    handleAvailabilityToggle(item.id, !item.isAvailable);
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name ?? 'Unknown Category';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Items</CardTitle>
        <CardDescription>
          Manage your menu items, their availability, and organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">
              Search Items
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, or tags..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1 md:w-[200px]">
            <Label className="text-xs uppercase text-muted-foreground">
              Category
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:w-[150px]">
            <Label className="text-xs uppercase text-muted-foreground">
              Availability
            </Label>
            <Select
              value={availabilityFilter}
              onValueChange={(value) => setAvailabilityFilter(value as typeof availabilityFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions */}
        {filteredItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              {filteredItems.length} item(s) showing
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={isBulkUpdating}
                onClick={() => handleBulkAvailability(true)}
              >
                Mark All Available
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isBulkUpdating}
                onClick={() => handleBulkAvailability(false)}
              >
                Mark All Unavailable
              </Button>
            </div>
          </div>
        )}

        {/* Items Table */}
        <MenuItemsTable
          menuItems={filteredItems}
          categories={categories}
          isLoading={isItemsLoading || isItemsFetching}
          onEdit={handleEditItem}
          onDelete={setDeleteItem}
          onToggleAvailability={handleToggleAvailability}
          onManageImages={handleManageImages}
        />
      </CardContent>

      {/* Edit Dialog */}
      {editingItem && (
        <MenuItemEditDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          menuItem={editingItem}
          restaurantId={restaurantId}
          categories={categories}
          onSuccess={() => {
            // Refresh will happen automatically via RTK Query cache invalidation
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"?
              This action cannot be undone and will also remove all associated images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && handleDeleteItem(deleteItem)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}