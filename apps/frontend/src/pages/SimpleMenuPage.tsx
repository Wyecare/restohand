import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  useMenuTranslation,
  useCommonTranslation,
} from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useListMenuCategoriesQuery,
  useListMenuItemsQuery,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} from '@/store/api/restaurantsApi';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { SimpleCategoryManager } from '@/components/menu/SimpleCategoryManager';
import { MenuItemCreateDialog } from '@/components/menu/MenuItemCreateDialog';
import {
  Utensils,
  Grid3X3,
  PlusCircle,
  ShoppingBag,
  ChefHat,
  Settings,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { MenuItemsTable } from '@/components/menu/MenuItemsTable';
import { MenuItemEditDialog } from '@/components/menu/MenuItemEditDialog';
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
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';
import type { MenuItem } from '@/store/api/types';

function SimpleMenuPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const { toast } = useToast();
  const { t: tMenu } = useMenuTranslation();
  const { t: tCommon } = useCommonTranslation();

  const { data: categoriesResponse, isLoading: categoriesLoading } =
    useListMenuCategoriesQuery(restaurantId ? { restaurantId } : skipToken);

  const { data: menuItemsResponse, isLoading: menuItemsLoading } =
    useListMenuItemsQuery(restaurantId ? { restaurantId } : skipToken);

  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [deleteMenuItem] = useDeleteMenuItemMutation();

  if (!restaurantId) return <Navigate to="/onboarding" replace />;

  const categories = categoriesResponse?.data ?? [];
  const menuItems = menuItemsResponse?.data ?? [];

  const totalItems = menuItems.length;
  const availableItems = menuItems.filter((i) => i.isAvailable).length;
  const totalCategories = categories.length;

  const categoryStats = categories.map((c) => ({
    name: c.name,
    itemCount: menuItems.filter((i) => i.categoryId === c.id).length,
    availableCount: menuItems.filter(
      (i) => i.categoryId === c.id && i.isAvailable
    ).length,
  }));

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
  };

  const handleManageImages = (item: MenuItem) => {
    setEditingItem(item);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await updateMenuItem({
        restaurantId,
        itemId: item.id,
        body: { isAvailable: !item.isAvailable },
      }).unwrap();
      toast({
        title: `${tMenu('items.item')} ${
          !item.isAvailable
            ? tMenu('items.markedAvailable')
            : tMenu('items.setUnavailable')
        }`,
      });
    } catch (error) {
      toast({
        title: tCommon('messages.error'),
        description:
          error instanceof Error
            ? error.message
            : tCommon('messages.networkError'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    try {
      await deleteMenuItem({ restaurantId, itemId: item.id }).unwrap();
      toast({
        title: tCommon('messages.deleteSuccess'),
        description: `${item.name} ${tMenu('items.removedFromMenu')}`,
      });
      setDeleteItem(null);
    } catch (error) {
      toast({
        title: tCommon('messages.error'),
        description:
          error instanceof Error
            ? error.message
            : tCommon('messages.networkError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Menu Management</h1>
        <p className="text-sm text-muted-foreground">
          Add and manage your restaurant's dishes
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-lg font-semibold">{totalItems}</p>
            </div>
            <Utensils className="h-4 w-4 text-primary" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-lg font-semibold text-green-600">
                {availableItems}
              </p>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Categories</p>
              <p className="text-lg font-semibold">{totalCategories}</p>
            </div>
            <Grid3X3 className="h-4 w-4 text-primary" />
          </div>
        </Card>
        <Card
          className="p-3 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => setCreateDialogOpen(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Add Item</p>
              <p className="text-sm font-medium text-primary">Quick Add</p>
            </div>
            <PlusCircle className="h-4 w-4 text-primary" />
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="flex-1 sm:flex-none h-12"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Dish
        </Button>
        <Button
          variant="outline"
          onClick={() => setCategoriesExpanded(!categoriesExpanded)}
          className="flex-1 sm:flex-none h-12"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Categories
        </Button>
      </div>

      {/* Collapsible Categories Section */}
      <Collapsible
        open={categoriesExpanded}
        onOpenChange={setCategoriesExpanded}
      >
        <CollapsibleContent className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                Organize Categories
              </CardTitle>
              <CardDescription className="text-sm">
                Create categories to organize your menu items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleCategoryManager
                restaurantId={restaurantId}
                categories={categories}
                isLoading={categoriesLoading}
              />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Menu Items Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Your Menu Items
          </CardTitle>
          <CardDescription className="text-sm">
            {menuItems.length === 0
              ? 'Start building your menu'
              : `${menuItems.length} dishes in your menu`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {menuItemsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  Loading dishes...
                </p>
              </div>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">No dishes yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Add your first dish to start building your digital menu. Make it
                easy for customers to order!
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Your First Dish
              </Button>
            </div>
          ) : (
            <MenuItemsTable
              menuItems={menuItems}
              categories={categories}
              isLoading={menuItemsLoading}
              onEdit={handleEditItem}
              onDelete={setDeleteItem}
              onToggleAvailability={handleToggleAvailability}
              onManageImages={handleManageImages}
            />
          )}
        </CardContent>
      </Card>

      {/* Category Overview */}
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Categories Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryStats.map((c) => (
                <div
                  key={c.name}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{c.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {c.availableCount}/{c.itemCount}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.itemCount} dish{c.itemCount !== 1 ? 'es' : ''} •{' '}
                    {c.availableCount} available
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Item Dialog */}
      <MenuItemCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        restaurantId={restaurantId}
        categories={categories}
        onSuccess={() => {
          // Refresh will happen automatically via RTK Query cache invalidation
        }}
      />

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
            <AlertDialogTitle>{tMenu('items.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tCommon('messages.deleteConfirmation').replace(
                'item',
                `"${deleteItem?.name}"`
              )}{' '}
              {tMenu('items.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && handleDeleteItem(deleteItem)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SimpleMenuPage;
