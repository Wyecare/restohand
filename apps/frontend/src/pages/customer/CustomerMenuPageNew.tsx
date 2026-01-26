import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { useGetPublicMenuQuery } from '@/store/api/restaurantsApi';
import {
  useCreateOrderMutation,
  useAddItemsToOrderMutation,
} from '@/store/api/ordersApi';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Plus,
  Minus,
  Search,
  X,
  Sparkles,
  ShoppingBag,
  Receipt,
  RefreshCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MenuItemPricing, PublicMenuCategory } from '@/store/api/types';
import { formatCurrency } from '@/lib/billing';
import { CallWaiterButton } from '@/components/customer/CallWaiterButton';

type DisplayCategory = {
  id: string;
  name: string;
  icon: {
    symbol: string;
    label: string;
  };
};

type AugmentedMenuItem = PublicMenuCategory['items'][number] & {
  _categoryId: string;
  _categoryName: string;
  _isVegetarian: boolean;
  _isSpicy: boolean;
  _isPopular: boolean;
  _isQuick: boolean;
};

// Removed session storage - using real-time API data only

const AccessibleEmoji = ({
  symbol,
  label,
  className,
}: {
  symbol: string;
  label: string;
  className?: string;
}) => (
  <span role="img" aria-label={label} className={className}>
    {symbol}
  </span>
);

const determineCategoryIcon = (name: string): DisplayCategory['icon'] => {
  const lower = name.toLowerCase();
  if (lower.includes('drink') || lower.includes('beverage')) {
    return { symbol: '🥤', label: `${name} category` };
  }
  if (lower.includes('dessert') || lower.includes('sweet')) {
    return { symbol: '🍨', label: `${name} category` };
  }
  if (lower.includes('starter') || lower.includes('snack')) {
    return { symbol: '🥟', label: `${name} category` };
  }
  if (lower.includes('veg') || lower.includes('vegetarian')) {
    return { symbol: '🥦', label: `${name} category` };
  }
  if (lower.includes('non-veg') || lower.includes('meat')) {
    return { symbol: '🍗', label: `${name} category` };
  }
  return { symbol: '🍴', label: `${name} category` };
};

export default function CustomerMenuPageNew() {
  const params = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const slug = params.slug ?? '';
  const tableFromUrl = searchParams.get('table');
  const tableIdFromUrl = searchParams.get('tableId');

  // Removed session storage - activeOrder comes directly from API

  // Local cart for new items before placing order
  const [cart, setCart] = useState<
    Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      price: number;
    }>
  >([]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data, isLoading, isError, refetch } = useGetPublicMenuQuery(
    { slug, table: tableFromUrl, tableId: tableIdFromUrl },
    { skip: !slug }
  );

  const [createOrder, { isLoading: isPlacingOrder }] = useCreateOrderMutation();
  const [addItemsToOrder, { isLoading: isAddingItems }] =
    useAddItemsToOrderMutation();

  // Extract data from the API response
  const restaurant = data?.restaurant;
  const menu = data?.menu;
  const activeOrderFromAPI = data?.activeOrder;

  // Setup WebSocket for real-time order updates
  useOrdersSocket({
    onEvent: (order) => {
      // Refetch menu data to get updated activeOrder when our order is updated
      if (activeOrderFromAPI && order.id === activeOrderFromAPI.id) {
        refetch();
      }
    },
    enabled: !!activeOrderFromAPI, // Only listen when we have an active order
  });

  const categories = useMemo(() => menu?.categories ?? [], [menu]);
  const uncategorised = useMemo(() => menu?.uncategorised ?? [], [menu]);

  const allProducts = useMemo<AugmentedMenuItem[]>(() => {
    const grouped = categories.flatMap((c) =>
      c.items.map(
        (i) =>
          ({
            ...i,
            _categoryId: c.id,
            _categoryName: c.name,
            _isVegetarian:
              i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
            _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
            _isPopular:
              i.tags?.includes('popular') || i.tags?.includes('bestseller'),
            _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
          } satisfies AugmentedMenuItem)
      )
    );
    return [
      ...grouped,
      ...uncategorised.map(
        (i) =>
          ({
            ...i,
            _categoryId: 'uncategorised',
            _categoryName: 'Others',
            _isVegetarian:
              i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
            _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
            _isPopular:
              i.tags?.includes('popular') || i.tags?.includes('bestseller'),
            _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
          } satisfies AugmentedMenuItem)
      ),
    ];
  }, [categories, uncategorised]);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item._categoryName.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allProducts, searchQuery]);

  const displayItems = useMemo(() => {
    if (activeCategory === 'all') {
      return filteredProducts;
    }
    return filteredProducts.filter((p) => p._categoryId === activeCategory);
  }, [filteredProducts, activeCategory]);

  const availableCategories = useMemo<DisplayCategory[]>(() => {
    const categoriesWithItems = categories.filter((c) =>
      filteredProducts.some((item) => item._categoryId === c.id)
    );

    const hasUncategorised = filteredProducts.some(
      (item) => item._categoryId === 'uncategorised'
    );

    const displayCategories: DisplayCategory[] = [
      { id: 'all', name: 'All', icon: { symbol: '🍽️', label: 'All dishes' } },
      ...categoriesWithItems.map((c) => ({
        id: c.id,
        name: c.name,
        icon: determineCategoryIcon(c.name),
      })),
    ];

    if (hasUncategorised) {
      displayCategories.push({
        id: 'uncategorised',
        name: 'Others',
        icon: { symbol: '✨', label: 'Other items' },
      });
    }

    return displayCategories;
  }, [categories, filteredProducts]);

  // Check if we have an existing order from API only
  const hasActiveOrder = !!activeOrderFromAPI;

  const handleAddToCart = (
    id: string,
    name: string,
    pricing: MenuItemPricing
  ) => {
    const existingIndex = cart.findIndex((item) => item.menuItemId === id);

    if (existingIndex >= 0) {
      setCart((prev) =>
        prev.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          menuItemId: id,
          name,
          quantity: 1,
          price: pricing.amount,
        },
      ]);
    }
  };

  const handleRemoveFromCart = (id: string) => {
    const existingIndex = cart.findIndex((item) => item.menuItemId === id);

    if (existingIndex >= 0) {
      const item = cart[existingIndex];
      if (item.quantity === 1) {
        setCart((prev) => prev.filter((_, index) => index !== existingIndex));
      } else {
        setCart((prev) =>
          prev.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity - 1 }
              : item
          )
        );
      }
    }
  };

  const getItemQuantity = (menuItemId: string): number => {
    const item = cart.find((item) => item.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!restaurant || cart.length === 0) return;

    const orderItems = cart.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      pricing: {
        unitAmount: item.price,
        currency: 'INR',
      },
    }));

    try {
      // Customer info for first order - include tableId for proper branch isolation
      const customerInfo = {
        customerName: 'Guest Customer', // We'll add a form for this later
        tableNumber: tableFromUrl || undefined,
        tableId: tableIdFromUrl || undefined, // CRITICAL: Include tableId for branch lookup
      };

      if (hasActiveOrder && activeOrderFromAPI) {
        // Add to existing order
        await addItemsToOrder({
          restaurantId: restaurant.id,
          orderId: activeOrderFromAPI.id,
          items: orderItems,
          notes: `Additional items ordered at ${new Date().toLocaleTimeString()}`,
        }).unwrap();

        toast({
          title: 'Items added to your order! 🎉',
          description: `${cartItemCount} items added to order #${activeOrderFromAPI.orderNumber}`,
        });
      } else {
        // Create new order with tableId for proper branch isolation
        const result = await createOrder({
          restaurantId: restaurant.id,
          items: orderItems,
          ...customerInfo,
          paymentMethod: 'upi', // Default to UPI for customer orders
        }).unwrap();

        toast({
          title: 'Order placed! 🎉',
          description: `Order #${result.orderNumber} sent to kitchen`,
        });

        // Clear cart after successful order
        setCart([]);

        // Navigate to order status
        const tableSuffix = tableFromUrl
          ? `?table=${encodeURIComponent(tableFromUrl)}`
          : '';
        navigate(`/c/${slug}/order/${result.id}${tableSuffix}`);
      }

      // Clear cart after successful order if adding to existing
      if (hasActiveOrder) {
        setCart([]);
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        title: 'Failed to place order',
        description: 'Please try again or ask for assistance.',
        variant: 'destructive',
      });
    }
  };

  const handleViewOrder = () => {
    const orderId = activeOrderFromAPI?.id;
    if (orderId) {
      const tableSuffix = tableFromUrl
        ? `?table=${encodeURIComponent(tableFromUrl)}`
        : '';
      navigate(`/c/${slug}/order/${orderId}${tableSuffix}`);
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <img
            src="/gifs/food-pending.gif"
            alt="Loading menu"
            className="w-48 h-48 mx-auto mb-4 rounded-2xl"
          />
          <p className="text-lg text-muted-foreground">Loading menu...</p>
        </motion.div>
      </div>
    );

  if (isError || !restaurant)
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AccessibleEmoji
            symbol="😕"
            label="Menu unavailable"
            className="text-6xl mb-4"
          />
          <h2 className="text-xl font-bold mb-2">Menu Unavailable</h2>
          <p className="text-muted-foreground mb-4">
            Unable to load the menu. Please try refreshing or ask for
            assistance.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
            variant="outline"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    );

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-muted/5 to-background pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b"
      >
        <div className="max-w-2xl mx-auto p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl font-black tracking-tight">
                {restaurant?.name || 'Menu'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {allProducts.length} items available
                {tableFromUrl && ` • Table ${tableFromUrl}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? (
                <X className="h-5 w-5" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Order Banner - Compact */}
          <AnimatePresence>
            {hasActiveOrder && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-500 rounded-full w-2 h-2 animate-pulse"></div>
                    <span className="font-medium text-green-900 dark:text-green-100 text-sm">
                      Order #{activeOrderFromAPI?.orderNumber}
                    </span>
                    <span className="text-green-600 dark:text-green-400 text-xs">
                      • In Progress
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/50"
                    onClick={handleViewOrder}
                  >
                    <Receipt className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Call Waiter Button - Show when customer is at a table */}
            {restaurant && tableFromUrl && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <CallWaiterButton
                  tableId={tableFromUrl}
                  restaurantId={restaurant.id}
                  orderId={activeOrderFromAPI?.id}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories */}
          <div className="border-t border-border/70 pt-3 pb-1">
            <ScrollArea className="w-full">
              <div className="flex gap-2 max-w-2xl mx-auto pb-1">
                {availableCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      activeCategory === category.id ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setActiveCategory(category.id)}
                    className="shrink-0 h-12 px-4"
                  >
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="h-11 w-5 mr-2 flex-shrink-0 object-cover rounded-full"
                      />
                    ) : (
                      <AccessibleEmoji
                        symbol={category.icon.symbol}
                        label={category.icon.label}
                        className="mr-1.5"
                      />
                    )}

                    {category.name}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="p-0 max-w-2xl mx-auto"
      >
        {displayItems.length === 0 ? (
          <div className="text-center py-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="text-6xl mb-4">
                <AccessibleEmoji symbol="🔍" label="No items found" />
              </div>
              <h3 className="text-xl font-bold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                Clear filters
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayItems.map((item, index) => {
              const quantity = getItemQuantity(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className="py-2 overflow-hidden border hover:shadow-md transition-all duration-200 hover:border-primary/30 h-full">
                    <CardContent className="px-2 py-0 flex flex-col h-full">
                      {/* Item Image */}
                      <div className="relative w-full aspect-square rounded-md overflow-hidden mb-2 bg-gradient-to-br from-muted to-muted/50">
                        {item.imageUrls?.[0] ? (
                          <img
                            src={item.imageUrls[0]}
                            alt={item.name}
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <AccessibleEmoji
                              symbol="🍽️"
                              label="Dish placeholder"
                              className="text-4xl opacity-30"
                            />
                          </div>
                        )}
                        {/* Popular badge */}
                        {item._isPopular && (
                          <div className="absolute top-1.5 right-1.5 bg-yellow-500 rounded-full p-0.5 shadow-sm z-10">
                            <Sparkles className="h-3 w-3 text-white fill-white" />
                          </div>
                        )}
                        {/* Tags on image */}
                        {(item._isSpicy || item._isQuick) && (
                          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                            {item._isSpicy && (
                              <AccessibleEmoji
                                symbol="🌶️"
                                label="Spicy"
                                className="bg-white/90 backdrop-blur-sm rounded px-1 text-xs"
                              />
                            )}
                            {item._isQuick && (
                              <AccessibleEmoji
                                symbol="⚡"
                                label="Quick serve"
                                className="bg-white/90 backdrop-blur-sm rounded px-1 text-xs"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 flex flex-col px-1">
                        <h3 className="font-bold text-xs line-clamp-2 mb-1.5 leading-tight">
                          {item.name}
                        </h3>

                        {/* Price */}
                        <p className="text-base font-black mb-2">
                          {formatCurrency(item.pricing.amount)}
                        </p>

                        {/* Add Button */}
                        {quantity > 0 ? (
                          <div className="flex items-center justify-center gap-1.5 bg-primary rounded-full px-1.5 py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-primary-foreground/20 text-primary-foreground p-0"
                              onClick={() => handleRemoveFromCart(item.id)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-5 text-center font-bold text-sm text-primary-foreground">
                              {quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-primary-foreground/20 text-primary-foreground p-0"
                              onClick={() =>
                                handleAddToCart(
                                  item.id,
                                  item.name,
                                  item.pricing
                                )
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full rounded-full h-7 font-semibold text-xs"
                            onClick={() =>
                              handleAddToCart(item.id, item.name, item.pricing)
                            }
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Floating Order Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 left-4 right-4 z-40"
          >
            <div className="max-w-2xl mx-auto">
              <Card className="border-2 border-primary shadow-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg">
                        {hasActiveOrder ? 'Add to Order' : 'Place Order'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cartItemCount} items • {formatCurrency(cartTotal)}
                      </p>
                    </div>
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isPlacingOrder || isAddingItems}
                      size="lg"
                      className="font-bold px-6"
                    >
                      {isPlacingOrder || isAddingItems ? (
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 mr-2" />
                      )}
                      {hasActiveOrder ? 'Add Items' : 'Place Order'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
