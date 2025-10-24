import { useState } from 'react';
import { Plus, Utensils, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useListMenuItemsQuery } from '@/store/api/restaurantsApi';
import { skipToken } from '@reduxjs/toolkit/query';
import type { MenuCategory } from '@/store/api/types';
import { MenuItemDialog } from '@/components/menu/MenuItemDialog';
import MetricsCard, { MetricsGrid } from '@/components/MetricsCard';

interface SimpleMenuItemFormProps {
  restaurantId: string;
  categories: MenuCategory[];
  onSuccess?: () => void;
}

export function SimpleMenuItemForm({
  restaurantId,
  categories,
  onSuccess,
}: SimpleMenuItemFormProps) {
  const { toast } = useToast();

  // Dialog open state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch menu items for insights
  const { data: menuItemsResponse, isLoading } = useListMenuItemsQuery(
    restaurantId ? { restaurantId } : skipToken
  );

  const menuItems = menuItemsResponse?.data ?? [];
  const available = menuItems.filter((i) => i.isAvailable).length;
  const total = menuItems.length;

  const topCategories = categories
    .map((c) => ({
      name: c.name,
      count: menuItems.filter((i) => i.categoryId === c.id).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const handleAddItem = () => {
    if (categories.length === 0) {
      toast({
        title: 'No categories found',
        description: 'Create a category before adding menu items.',
        variant: 'destructive',
      });
      return;
    }
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Utensils className="h-5 w-5 text-muted-foreground" />
            Menu Items
          </h2>
          <p className="text-sm text-muted-foreground">
            Add and manage your dishes quickly.
          </p>
        </div>
        <Button onClick={handleAddItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </div>

      {/* Overview Cards */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-6">
          Loading menu data...
        </p>
      ) : total === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FolderOpen className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>No menu items yet — click “Add New Item” to start!</p>
        </div>
      ) : (
        <MetricsGrid columns={3}>
          <MetricsCard
            title="Total Items"
            value={total}
            description={`${available} available`}
            icon={Utensils}
            iconColor="green"
          />
          <MetricsCard
            title="Active Categories"
            value={categories.length}
            description="Linked categories"
            icon={FolderOpen}
            iconColor="blue"
          />
          <MetricsCard
            title="Top Categories"
            value={topCategories[0]?.name ?? '—'}
            description={
              topCategories.length > 0
                ? `${topCategories[0].count} items`
                : 'No data yet'
            }
            icon={Plus}
            iconColor="orange"
          />
        </MetricsGrid>
      )}

      {/* Callout Card */}
      {total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
            <CardDescription>
              Most popular categories and availability summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            {topCategories.length === 0 ? (
              <p>No data yet — add some menu items to see insights.</p>
            ) : (
              <>
                {topCategories.map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.count} items</span>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog for Add Item */}
      <MenuItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        restaurantId={restaurantId}
        categories={categories}
        onSuccess={() => {
          setDialogOpen(false);
          onSuccess?.();
        }}
      />
    </div>
  );
}
