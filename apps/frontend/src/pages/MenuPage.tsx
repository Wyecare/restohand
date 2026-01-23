import { useMemo, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  useListMenuCategoriesQuery,
  useCreateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useListMenuItemsQuery,
} from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Utensils,
  Eye,
  EyeOff,
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';

const MenuPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [categoryName, setCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available' | 'unavailable'
  >('all');
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);

  if (!restaurantId) return <Navigate to="/onboarding" replace />;

  const { data: categoriesResponse, isLoading: isCategoriesLoading } =
    useListMenuCategoriesQuery(restaurantId ?? skipToken);
  const categories = categoriesResponse?.data ?? [];

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

  const [createCategory, { isLoading: isCreatingCategory }] =
    useCreateMenuCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] =
    useDeleteMenuCategoryMutation();
  const [createMenuItem, { isLoading: isCreatingItem }] =
    useCreateMenuItemMutation();
  const [updateMenuItem] = useUpdateMenuItemMutation();

  const menuStats = useMemo(() => {
    const total = menuItems.length;
    const available = menuItems.filter((i) => i.isAvailable).length;
    return {
      total,
      available,
      unavailable: total - available,
      categories: categories.length,
    };
  }, [menuItems, categories.length]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (availabilityFilter === 'available' && !item.isAvailable) return false;
      if (availabilityFilter === 'unavailable' && item.isAvailable)
        return false;
      if (searchTerm.trim()) {
        const needle = searchTerm.toLowerCase();
        if (
          !item.name.toLowerCase().includes(needle) &&
          !(item.description ?? '').toLowerCase().includes(needle)
        )
          return false;
      }
      return true;
    });
  }, [menuItems, availabilityFilter, searchTerm]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !categoryName) return;
    try {
      await createCategory({
        restaurantId,
        body: { name: categoryName, displayOrder: categories.length },
      }).unwrap();
      setCategoryName('');
      setShowAddCategoryDialog(false);
      toast({ title: 'Category created successfully' });
    } catch {
      toast({ title: 'Unable to create category', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!restaurantId) return;
    const confirmed = window.confirm(
      'Delete this category? Items will become uncategorized.'
    );
    if (!confirmed) return;
    try {
      await deleteCategory({ restaurantId, categoryId: id }).unwrap();
      if (selectedCategory === id) setSelectedCategory('all');
      toast({ title: 'Category removed' });
    } catch {
      toast({ title: 'Unable to delete category', variant: 'destructive' });
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !itemName || !itemPrice) return;
    try {
      await createMenuItem({
        restaurantId,
        body: {
          categoryId: categoryIdFilter,
          name: itemName,
          pricing: {
            amount: Number(itemPrice),
            currency: 'INR',
            isTaxInclusive: true,
          },
          isAvailable: true,
        },
      }).unwrap();
      setItemName('');
      setItemPrice('');
      setShowAddItemDialog(false);
      toast({ title: 'Item added to menu' });
    } catch {
      toast({ title: 'Unable to add item', variant: 'destructive' });
    }
  };

  const handleToggleAvailability = async (id: string, value: boolean) => {
    if (!restaurantId) return;
    try {
      await updateMenuItem({
        restaurantId,
        itemId: id,
        body: { isAvailable: value },
      }).unwrap();
      toast({ title: `Item ${value ? 'available' : 'paused'}` });
    } catch {
      toast({ title: 'Unable to update item', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your dishes, categories, and availability
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAddCategoryDialog(true)}
          >
            <Layers className="mr-2 h-4 w-4" />
            New Category
          </Button>
          <Button onClick={() => setShowAddItemDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Dish
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dishes</CardTitle>
            <Utensils className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Eye className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuStats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <EyeOff className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuStats.unavailable}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Layers className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuStats.categories}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={availabilityFilter}
              onValueChange={(v) => setAvailabilityFilter(v as any)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      {isItemsLoading || isItemsFetching ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Utensils className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No dishes found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || availabilityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first dish'}
            </p>
            {!searchTerm && availabilityFilter === 'all' && (
              <Button onClick={() => setShowAddItemDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Dish
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50">
                    {item.imageUrls?.[0] ? (
                      <img
                        src={item.imageUrls[0]}
                        alt={item.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge
                        variant={item.isAvailable ? 'default' : 'secondary'}
                        className={
                          item.isAvailable
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-orange-500 hover:bg-orange-600'
                        }
                      >
                        {item.isAvailable ? 'Available' : 'Paused'}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="space-y-2 pb-3">
                    <CardTitle className="text-base line-clamp-1">
                      {item.name}
                    </CardTitle>
                    {item.description && (
                      <CardDescription className="line-clamp-2 text-xs">
                        {item.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-lg font-bold">
                          ₹{item.pricing.amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Category
                        </p>
                        <p className="text-sm font-medium">
                          {categories.find((c) => c.id === item.categoryId)
                            ?.name ?? 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={(v) =>
                            handleToggleAvailability(item.id, v)
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.isAvailable ? 'Available' : 'Paused'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Categories Management Section */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              Manage your menu categories and organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant="outline"
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-muted"
                >
                  <span>{category.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="ml-2 hover:text-destructive"
                    disabled={isDeletingCategory}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Dish</DialogTitle>
            <DialogDescription>
              Add a new item to your menu. You can add more details later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Dish Name *</Label>
              <Input
                id="item-name"
                placeholder="e.g., Butter Chicken"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Price (₹) *</Label>
              <Input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Select
                value={categoryIdFilter || 'none'}
                onValueChange={(v) =>
                  setSelectedCategory(v === 'none' ? 'all' : v)
                }
              >
                <SelectTrigger id="item-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddItemDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingItem}>
                {isCreatingItem ? 'Adding...' : 'Add Dish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog
        open={showAddCategoryDialog}
        onOpenChange={setShowAddCategoryDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your menu items.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                placeholder="e.g., Starters, Main Course"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddCategoryDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingCategory}>
                {isCreatingCategory ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuPage;
