import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  useListMenuCategoriesQuery,
  useListMenuItemsQuery,
} from '@/store/api/restaurantsApi';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { SimpleCategoryManager } from '@/components/menu/SimpleCategoryManager';
import { SimpleMenuItemForm } from '@/components/menu/SimpleMenuItemForm';
import {
  Utensils,
  Grid3X3,
  PlusCircle,
  BarChart3,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MenuItemsTable } from '@/components/menu/MenuItemsTable';

function SimpleMenuPage() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [activeTab, setActiveTab] = useState('overview');

  if (!restaurantId) return <Navigate to="/onboarding" replace />;

  const { data: categoriesResponse, isLoading: categoriesLoading } =
    useListMenuCategoriesQuery(restaurantId ? { restaurantId } : skipToken);

  const { data: menuItemsResponse, isLoading: menuItemsLoading } =
    useListMenuItemsQuery(restaurantId ? { restaurantId } : skipToken);

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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Grid3X3 className="h-4 w-4 mr-1" /> Categories
          </TabsTrigger>
          <TabsTrigger value="add-item">
            <PlusCircle className="h-4 w-4 mr-1" /> Add Item
          </TabsTrigger>
          <TabsTrigger value="menu-items">
            <Utensils className="h-4 w-4 mr-1" /> Menu Items
          </TabsTrigger>
        </TabsList>

        {/* 🧠 Overview */}
        <TabsContent value="overview" className="space-y-6">
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
              value="Add Dish"
              icon={PlusCircle}
              iconColor="purple"
              onClick={() => setActiveTab('add-item')}
              className="cursor-pointer"
              description="Add a new dish instantly"
            />
          </MetricsGrid>

          {/* Category Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Category Overview</CardTitle>
              <CardDescription>
                Quick look at items and availability per category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryStats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-3">
                    No categories yet. Create one to organize your dishes.
                  </p>
                  <button
                    onClick={() => setActiveTab('categories')}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Create Category →
                  </button>
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

        {/* Categories */}
        <TabsContent value="categories">
          <SimpleCategoryManager
            restaurantId={restaurantId}
            categories={categories}
            isLoading={categoriesLoading}
          />
        </TabsContent>

        {/* Add Item */}
        <TabsContent value="add-item">
          {categories.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Create a Category First</CardTitle>
                <CardDescription>
                  Add at least one category to start adding dishes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <Grid3X3 className="h-4 w-4" />
                  Go to Categories
                </button>
              </CardContent>
            </Card>
          ) : (
            <SimpleMenuItemForm
              restaurantId={restaurantId}
              categories={categories}
              onSuccess={() => setActiveTab('menu-items')}
            />
          )}
        </TabsContent>

        {/* Menu Items */}
        <TabsContent value="menu-items">
          <Card>
            <CardHeader>
              <CardTitle>All Menu Items</CardTitle>
              <CardDescription>View and manage all dishes</CardDescription>
            </CardHeader>
            <CardContent>
              {menuItemsLoading ? (
                <p className="text-center py-6 text-muted-foreground">
                  Loading menu items...
                </p>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No dishes yet. Add one to get started.
                  </p>
                  <button
                    onClick={() => setActiveTab('add-item')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add First Dish →
                  </button>
                </div>
              ) : (
                <TabsContent value="menu-items">
                  <MenuItemsTable
                    menuItems={menuItems}
                    categories={categories}
                    isLoading={menuItemsLoading}
                    onEdit={(item) => console.log('Edit', item)}
                    onDelete={(item) => console.log('Delete', item)}
                    onToggleAvailability={(item) =>
                      console.log('Toggle Availability', item)
                    }
                  />
                </TabsContent>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SimpleMenuPage;
