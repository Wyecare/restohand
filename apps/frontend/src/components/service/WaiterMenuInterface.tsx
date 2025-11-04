import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Search,
  X,
  Sparkles,
  Users,
  CreditCard,
  Clock,
} from 'lucide-react';
import { useGetPublicMenuQuery } from '@/store/api/restaurantsApi';
import { useCreateOrderMutation } from '@/store/api/ordersApi';
import type { Order, RestaurantTable, Restaurant } from '@/store/api/types';

interface CartEntry {
  id: string;
  name: string;
  pricing: {
    amount: number;
    currency?: string;
  };
  quantity: number;
}

interface WaiterMenuInterfaceProps {
  table: RestaurantTable;
  existingOrder: Order | null;
  restaurant: Restaurant | undefined;
  onBack: () => void;
  onPaymentFlow: (order: Order) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export default function WaiterMenuInterface({
  table,
  existingOrder,
  restaurant,
  onBack,
  onPaymentFlow,
}: WaiterMenuInterfaceProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const { data, isLoading, isError } = useGetPublicMenuQuery(restaurant?.slug || '', {
    skip: !restaurant?.slug,
  });
  const [createOrder] = useCreateOrderMutation();

  const categories = data?.menu.categories ?? [];
  const uncategorised = data?.menu.uncategorised ?? [];

  const allProducts = useMemo(() => {
    const grouped = categories.flatMap((c) =>
      c.items.map((i) => ({
        ...i,
        _categoryId: c.id,
        _categoryName: c.name,
        _isVegetarian: i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
        _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
        _isPopular: i.tags?.includes('popular') || i.tags?.includes('bestseller'),
        _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
      }))
    );
    return [
      ...grouped,
      ...uncategorised.map((i) => ({
        ...i,
        _categoryId: 'uncategorised',
        _categoryName: 'Others',
        _isVegetarian: i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
        _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
        _isPopular: i.tags?.includes('popular') || i.tags?.includes('bestseller'),
        _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
      })),
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

  const availableCategories = useMemo(() => {
    const categoriesWithItems = categories.filter((c) =>
      filteredProducts.some((item) => item._categoryId === c.id)
    );

    const hasUncategorised = filteredProducts.some(
      (item) => item._categoryId === 'uncategorised'
    );

    return [
      { id: 'all', name: 'All', icon: '🍽️' },
      ...categoriesWithItems.map((c) => ({
        ...c,
        icon: c.icon || '🍴',
      })),
      ...(hasUncategorised
        ? [{ id: 'uncategorised', name: 'Others', icon: '✨' }]
        : []),
    ];
  }, [categories, filteredProducts]);

  const totalItems = Object.values(cart).reduce((sum, e) => sum + e.quantity, 0);
  const totalAmount = Object.values(cart).reduce(
    (sum, e) => sum + e.quantity * e.pricing.amount,
    0
  );

  const handleAdd = (id: string, name: string, pricing: any) => {
    setCart((prev) => ({
      ...prev,
      [id]: { id, name, pricing, quantity: (prev[id]?.quantity ?? 0) + 1 },
    }));
  };

  const handleRemove = (id: string) => {
    setCart((prev) => {
      const current = prev[id];
      if (!current) return prev;
      if (current.quantity === 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...current, quantity: current.quantity - 1 } };
    });
  };

  const handlePlaceOrder = async () => {
    if (!restaurant) return;

    if (Object.keys(cart).length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add items to place an order',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      restaurantId: restaurant.id,
      tableNumber: table.tableNumber,
      paymentMethod: 'cash' as const,
      items: Object.values(cart).map((entry) => ({
        menuItemId: entry.id,
        name: entry.name,
        quantity: entry.quantity,
        pricing: {
          unitAmount: entry.pricing.amount,
          currency: entry.pricing.currency ?? 'INR',
        },
      })),
    };

    setIsPlacingOrder(true);
    try {
      const order = await createOrder(payload).unwrap();
      setCart({});
      toast({
        title: 'Order placed! 🎉',
        description: `Order #${order.orderNumber} sent to kitchen`,
      });
      onBack();
    } catch (err) {
      toast({
        title: 'Failed to place order',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePaymentAction = () => {
    if (existingOrder) {
      onPaymentFlow(existingOrder);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <LoadingSpinner size="lg" />
          <p className="text-lg text-muted-foreground mt-4">Loading menu...</p>
        </motion.div>
      </div>
    );
  }

  if (isError || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">Menu Unavailable</h2>
          <p className="text-muted-foreground mb-4">
            Unable to load the menu. Please try again.
          </p>
          <Button onClick={onBack}>Back to Tables</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-muted/5 to-background pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b"
      >
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">
                {table.displayName || `Table ${table.tableNumber}`}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {table.capacity && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {table.capacity} seats
                  </span>
                )}
                {table.zone && <span>• {table.zone}</span>}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Existing Order Alert */}
          {existingOrder && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">
                    Active Order #{existingOrder.orderNumber}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Clock className="h-3 w-3" />
                    <span className="capitalize">{existingOrder.status.replace('_', ' ')}</span>
                    <span>• ₹{existingOrder.totalAmount.toFixed(0)}</span>
                  </div>
                </div>
                {existingOrder.status === 'ready' && (
                  <Button
                    onClick={handlePaymentAction}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Payment
                  </Button>
                )}
              </div>
            </motion.div>
          )}

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
        </div>
      </motion.div>

      {/* Category Pills */}
      <div className="sticky top-[140px] z-20 bg-background/95 backdrop-blur-lg border-b">
        <ScrollArea className="w-full">
          <div className="flex gap-2 p-3 max-w-2xl mx-auto">
            {availableCategories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="shrink-0 h-9 px-4 rounded-full"
              >
                <span className="mr-1.5">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="p-4 max-w-2xl mx-auto"
      >
        {displayItems.length === 0 ? (
          <div className="text-center py-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search</p>
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
              const entry = cart[item.id];
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
                            <span className="text-4xl opacity-30">🍽️</span>
                          </div>
                        )}
                        {/* Veg/Non-veg indicator */}
                        <div className="absolute top-1.5 left-1.5 z-10">
                          {item._isVegetarian ? (
                            <div className="w-4 h-4 bg-white rounded-sm border-2 border-green-600 flex items-center justify-center shadow-sm">
                              <div className="w-2 h-2 bg-green-600 rounded-full" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 bg-white rounded-sm border-2 border-red-600 flex items-center justify-center shadow-sm">
                              <div className="w-2 h-2 bg-red-600 rounded-full" />
                            </div>
                          )}
                        </div>
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
                              <span className="bg-white/90 backdrop-blur-sm rounded px-1 text-xs">
                                🌶️
                              </span>
                            )}
                            {item._isQuick && (
                              <span className="bg-white/90 backdrop-blur-sm rounded px-1 text-xs">
                                ⚡
                              </span>
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
                        {entry ? (
                          <div className="flex items-center justify-center gap-1.5 bg-primary rounded-full px-1.5 py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-primary-foreground/20 text-primary-foreground p-0"
                              onClick={() => handleRemove(item.id)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-5 text-center font-bold text-sm text-primary-foreground">
                              {entry.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-primary-foreground/20 text-primary-foreground p-0"
                              onClick={() => handleAdd(item.id, item.name, item.pricing)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full rounded-full h-7 font-semibold text-xs"
                            onClick={() => handleAdd(item.id, item.name, item.pricing)}
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

      {/* Floating Cart Button */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 z-40 px-4"
          >
            <div className="max-w-2xl mx-auto">
              <Button
                size="lg"
                className="w-full h-16 rounded-2xl shadow-2xl text-lg font-bold relative overflow-hidden"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
                <div className="relative flex items-center justify-between w-full px-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm opacity-90">{totalItems} items</p>
                      <p className="text-base font-black">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                    <span className="font-bold">
                      {isPlacingOrder ? 'Placing...' : 'Place Order'}
                    </span>
                    {!isPlacingOrder && <Plus className="h-5 w-5" />}
                  </div>
                </div>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}