import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
  BarChart3,
  Layers,
  ShoppingBag,
  ChefHat,
  Settings,
} from 'lucide-react';
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';
import type { MenuItem } from '@/store/api/types';

function SimpleMenuPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [activeTab, setActiveTab] = useState('management');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const { toast } = useToast();

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
  const activeCategories = categories.filter((c) => c.isActive).length;

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
        title: `Item ${!item.isAvailable ? 'marked available' : 'set unavailable'}`,
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold">🍽️ Menu Management</h1>
        <p className="text-muted-foreground text-sm">
          Manage your menu categories and dishes easily — designed for
          restaurants & cafés.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="management">
            <ChefHat className="h-4 w-4 mr-1" /> Menu Management
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-1" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* Menu Management Tab */}
        <TabsContent value="management" className="space-y-6">
          {/* Quick Actions Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Menu Management</h2>
              <p className="text-sm text-muted-foreground">
                Create and manage your menu items and categories
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCategoriesExpanded(!categoriesExpanded)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Categories
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Collapsible Categories Section */}
          <Collapsible open={categoriesExpanded} onOpenChange={setCategoriesExpanded}>
            <CollapsibleContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    Categories Management
                  </CardTitle>
                  <CardDescription>
                    Organize your menu items into categories
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
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Menu Items
                </div>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </CardTitle>
              <CardDescription>View and manage all your dishes</CardDescription>
            </CardHeader>
            <CardContent>
              {menuItemsLoading ? (
                <p className="text-center py-6 text-muted-foreground">
                  Loading menu items...
                </p>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-8">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">
                    No dishes yet. Add your first item to get started.
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add First Item
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
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Menu Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Insights and metrics about your menu performance
            </p>
          </div>

          <MetricsGrid columns={4}>
            <MetricsCard
              title="Total Items"
              value={totalItems}
              description={`${availableItems} available`}
              icon={Utensils}
              iconColor="green"
            />
            <MetricsCard
              title="Categories"
              value={totalCategories}
              description={`${activeCategories} active`}
              icon={Grid3X3}
              iconColor="blue"
            />
            <MetricsCard
              title="Availability"
              value={
                totalItems > 0
                  ? Math.round((availableItems / totalItems) * 100) + '%'
                  : '0%'
              }
              description={`of ${totalItems} items`}
              icon={Layers}
              iconColor="orange"
              badge={{
                text: `${availableItems}/${totalItems}`,
                variant: 'outline',
              }}
            />
            <MetricsCard
              title="Quick Add"
              value="Add Item"
              icon={PlusCircle}
              iconColor="purple"
              onClick={() => setCreateDialogOpen(true)}
              className="cursor-pointer"
              description="Add a new item instantly"
            />
          </MetricsGrid>

          {/* Category Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>
                Items and availability breakdown by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryStats.length === 0 ? (
                <div className="text-center py-8">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-3">
                    No categories yet. Create one to organize your dishes.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab('management');
                      setCategoriesExpanded(true);
                    }}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Create Category
                  </Button>
                </div>
              ) : (
                <MetricsGrid columns={3}>
                  {categoryStats.map((c) => (
                    <MetricsCard
                      key={c.name}
                      title={c.name}
                      value={`${c.itemCount} Items`}
                      description={`${c.availableCount} available`}
                      icon={ShoppingBag}
                      iconColor="gray"
                      badge={{
                        text: `${c.availableCount}/${c.itemCount}`,
                        variant: 'secondary',
                      }}
                    />
                  ))}
                </MetricsGrid>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}

export default SimpleMenuPage;
