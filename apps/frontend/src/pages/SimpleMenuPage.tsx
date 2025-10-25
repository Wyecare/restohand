import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  useMenuTranslation,
  useCommonTranslation,
} from '@/hooks/use-translation';
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
        title: `${tMenu('items.item')} ${
          !item.isAvailable ? tMenu('items.markedAvailable') : tMenu('items.setUnavailable')
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
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold">
          <span role="img" aria-label="restaurant">🍽️</span> {tMenu('management.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {tMenu('management.description')}
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
            <ChefHat className="h-4 w-4 mr-1" /> {tMenu('management.title')}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-1" /> {tMenu('analytics.title')}
          </TabsTrigger>
        </TabsList>

        {/* Menu Management Tab */}
        <TabsContent value="management" className="space-y-6">
          {/* Quick Actions Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{tMenu('management.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {tMenu('management.subtitle')}
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
{tMenu('items.create')}
              </Button>
            </div>
          </div>

          {/* Collapsible Categories Section */}
          <Collapsible
            open={categoriesExpanded}
            onOpenChange={setCategoriesExpanded}
          >
            <CollapsibleContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
{tMenu('categories.management')}
                  </CardTitle>
                  <CardDescription>
                    {tMenu('categories.organizeDesc')}
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
  {tMenu('items.create')}
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
            <h2 className="text-xl font-semibold">
              {tMenu('analytics.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tMenu('analytics.description')}
            </p>
          </div>

          <MetricsGrid columns={4}>
            <MetricsCard
              title={tMenu('analytics.totalItems')}
              value={totalItems}
              description={`${availableItems} ${tMenu('analytics.available')}`}
              icon={Utensils}
              iconColor="green"
            />
            <MetricsCard
              title={tMenu('categories.title')}
              value={totalCategories}
              description={`${activeCategories} ${tCommon(
                'status.active'
              ).toLowerCase()}`}
              icon={Grid3X3}
              iconColor="blue"
            />
            <MetricsCard
              title={tMenu('analytics.availability')}
              value={
                totalItems > 0
                  ? Math.round((availableItems / totalItems) * 100) + '%'
                  : '0%'
              }
              description={`${tMenu('analytics.of')} ${totalItems} ${tMenu(
                'items.title'
              ).toLowerCase()}`}
              icon={Layers}
              iconColor="orange"
              badge={{
                text: `${availableItems}/${totalItems}`,
                variant: 'outline',
              }}
            />
            <MetricsCard
              title={tMenu('analytics.quickAdd')}
              value={tMenu('items.create')}
              icon={PlusCircle}
              iconColor="purple"
              onClick={() => setCreateDialogOpen(true)}
              className="cursor-pointer"
              description={tMenu('analytics.quickAddDesc')}
            />
          </MetricsGrid>

          {/* Category Overview */}
          <Card>
            <CardHeader>
              <CardTitle>{tMenu('analytics.categoryPerformance')}</CardTitle>
              <CardDescription>
                {tMenu('analytics.categoryBreakdown')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryStats.length === 0 ? (
                <div className="text-center py-8">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-3">
                    {tMenu('analytics.noCategoriesYet')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab('management');
                      setCategoriesExpanded(true);
                    }}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    {tMenu('categories.create')}
                  </Button>
                </div>
              ) : (
                <MetricsGrid columns={3}>
                  {categoryStats.map((c) => (
                    <MetricsCard
                      key={c.name}
                      title={c.name}
                      value={`${c.itemCount} ${tMenu('items.title')}`}
                      description={`${c.availableCount} ${tMenu(
                        'analytics.available'
                      )}`}
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
            <AlertDialogTitle>{tMenu('items.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tCommon('messages.deleteConfirmation').replace('item', `"${deleteItem?.name}"`)} {tMenu('items.deleteWarning')}
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
