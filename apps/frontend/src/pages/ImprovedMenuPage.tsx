import { useMemo, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useListMenuCategoriesQuery, useListMenuItemsQuery } from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CategoryManager } from '@/components/menu/CategoryManager';
import { MenuItemForm } from '@/components/menu/MenuItemForm';
import { MenuItemManager } from '@/components/menu/MenuItemManager';
import { BarChart3, UtensilsCrossed, Tags, TrendingUp } from 'lucide-react';

const ImprovedMenuPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [activeTab, setActiveTab] = useState('overview');

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data: categoriesResponse, isLoading: isCategoriesLoading } =
    useListMenuCategoriesQuery(restaurantId ? { restaurantId } : skipToken);
  const categories = categoriesResponse?.data ?? [];

  const { data: menuItemsResponse, isLoading: isItemsLoading } = useListMenuItemsQuery(
    restaurantId ? { restaurantId } : skipToken
  );
  const menuItems = menuItemsResponse?.data ?? [];

  const menuStats = useMemo(() => {
    const total = menuItems.length;
    const available = menuItems.filter((item) => item.isAvailable).length;
    const categorized = menuItems.filter((item) => item.categoryId).length;
    const uncategorized = total - categorized;

    // Category distribution
    const categoryStats = categories.map((category) => ({
      name: category.name,
      count: menuItems.filter((item) => item.categoryId === category.id).length,
      available: menuItems.filter(
        (item) => item.categoryId === category.id && item.isAvailable
      ).length,
    }));

    return {
      total,
      available,
      unavailable: total - available,
      categories: categories.length,
      categorized,
      uncategorized,
      categoryStats,
    };
  }, [menuItems, categories]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Menu Management</h1>
        <p className="text-muted-foreground">
          Create categories, manage menu items, and control availability across your restaurant.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Menu Items
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Menu Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Items</CardDescription>
                <CardTitle className="text-3xl font-semibold">
                  {menuStats.total}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {menuStats.categorized} categorized, {menuStats.uncategorized} uncategorized
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Available</CardDescription>
                <CardTitle className="text-3xl font-semibold text-green-600">
                  {menuStats.available}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {((menuStats.available / Math.max(menuStats.total, 1)) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unavailable</CardDescription>
                <CardTitle className="text-3xl font-semibold text-red-600">
                  {menuStats.unavailable}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {((menuStats.unavailable / Math.max(menuStats.total, 1)) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Categories</CardDescription>
                <CardTitle className="text-3xl font-semibold">
                  {menuStats.categories}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Active categories
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution */}
          {menuStats.categoryStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>
                  Overview of items across different categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {menuStats.categoryStats.map((stat) => (
                    <div key={stat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{stat.name}</div>
                        <Badge variant="outline">{stat.count} items</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="text-green-600">{stat.available} available</span>
                        <span>•</span>
                        <span className="text-red-600">{stat.count - stat.available} unavailable</span>
                      </div>
                    </div>
                  ))}
                  {menuStats.uncategorized > 0 && (
                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-muted-foreground">Uncategorized</div>
                        <Badge variant="secondary">{menuStats.uncategorized} items</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Consider organizing these items into categories
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  Quick Category Setup
                </CardTitle>
                <CardDescription>
                  Create essential categories to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Categories help organize your menu and improve customer experience.
                  Start with common categories like:
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">Appetizers</Badge>
                  <Badge variant="outline">Main Course</Badge>
                  <Badge variant="outline">Desserts</Badge>
                  <Badge variant="outline">Beverages</Badge>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setActiveTab('categories')}
                  disabled={isCategoriesLoading}
                >
                  Manage Categories
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  Add Menu Items
                </CardTitle>
                <CardDescription>
                  Create and organize your menu offerings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {categories.length === 0
                    ? 'Create categories first to properly organize your menu items.'
                    : 'Add dishes to your menu with proper categorization and pricing.'
                  }
                </p>
                <Button
                  className="w-full"
                  onClick={() => setActiveTab(categories.length === 0 ? 'categories' : 'items')}
                  disabled={isItemsLoading}
                >
                  {categories.length === 0 ? 'Create Categories First' : 'Add Menu Items'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {isCategoriesLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <CategoryManager
              restaurantId={restaurantId}
              categories={categories}
              isLoading={isCategoriesLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <MenuItemForm
            restaurantId={restaurantId}
            categories={categories}
            onSuccess={() => {
              // Optionally scroll to items table or show success message
            }}
          />

          <MenuItemManager
            restaurantId={restaurantId}
            categories={categories}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Menu Analytics</CardTitle>
              <CardDescription>
                Insights about your menu performance (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Analytics Coming Soon</p>
                <p className="text-sm">
                  We're working on bringing you detailed insights about your menu performance,
                  popular items, and customer preferences.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedMenuPage;