import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetPublicMenuQuery } from '@/store/api/restaurantsApi';
import {
  useCreateOrderMutation,
  useCreatePaymentLinkMutation,
  type CreatePaymentLinkResponse,
} from '@/store/api/ordersApi';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, Star, Clock, Flame } from 'lucide-react';
import TableDialog from './TableDialog';
import { CartBottomBar } from '@/components/customer/CartBottomBar';
import { CartPanel } from '@/components/customer/CartPanel';
import { MenuSearch, FilterOptions } from '@/components/customer/MenuSearch';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface CartEntry {
  id: string;
  name: string;
  pricing: {
    amount: number;
    currency?: string;
  };
  quantity: number;
}

const formatCurrency = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

export default function CustomerMenuPage() {
  const params = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const slug = params.slug ?? '';
  const tableFromUrl = searchParams.get('table') ?? undefined;

  const { data, isLoading, isError } = useGetPublicMenuQuery(slug, {
    skip: !slug,
  });
  const [createOrder, { isLoading: isPlacingOrder }] = useCreateOrderMutation();
  const [createPaymentLink] = useCreatePaymentLinkMutation();

  const [viewMode, setViewMode] = useState<'unified' | 'categories'>('unified');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [cartPanelOpen, setCartPanelOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    vegetarian: false,
    nonVegetarian: false,
    spicy: false,
    popular: false,
    quickPrep: false,
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const restaurant = data?.restaurant;
  const categories = data?.menu.categories ?? [];
  const uncategorised = data?.menu.uncategorised ?? [];

  const allProducts = useMemo(() => {
    const grouped = categories.flatMap((c) =>
      c.items.map((i) => ({
        ...i,
        _categoryId: c.id,
        _categoryName: c.name,
        _isVegetarian:
          i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
        _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
        _isPopular:
          i.tags?.includes('popular') || i.tags?.includes('bestseller'),
        _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
      }))
    );
    return [
      ...grouped,
      ...uncategorised.map((i) => ({
        ...i,
        _categoryId: 'uncategorised',
        _categoryName: 'Others',
        _isVegetarian:
          i.tags?.includes('vegetarian') || i.tags?.includes('veg'),
        _isSpicy: i.tags?.includes('spicy') || i.tags?.includes('hot'),
        _isPopular:
          i.tags?.includes('popular') || i.tags?.includes('bestseller'),
        _isQuick: i.tags?.includes('quick') || i.tags?.includes('fast'),
      })),
    ];
  }, [categories, uncategorised]);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    // Apply search filter
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

    // Apply filters
    if (filters.vegetarian && !filters.nonVegetarian) {
      filtered = filtered.filter((item) => item._isVegetarian);
    } else if (filters.nonVegetarian && !filters.vegetarian) {
      filtered = filtered.filter((item) => !item._isVegetarian);
    }

    if (filters.spicy) {
      filtered = filtered.filter((item) => item._isSpicy);
    }

    if (filters.popular) {
      filtered = filtered.filter((item) => item._isPopular);
    }

    if (filters.quickPrep) {
      filtered = filtered.filter((item) => item._isQuick);
    }

    return filtered;
  }, [allProducts, searchQuery, filters]);

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
      { id: 'all', name: 'All Items', icon: '🍽️' },
      ...categoriesWithItems,
      ...(hasUncategorised
        ? [{ id: 'uncategorised', name: 'Others', icon: '✨' }]
        : []),
    ];
  }, [categories, filteredProducts]);

  const totalItems = Object.values(cart).reduce(
    (sum, e) => sum + e.quantity,
    0
  );
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

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(id);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [id]: { ...prev[id], quantity },
    }));
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  const loadRazorpayScript = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    if (window.Razorpay) return true;

    return new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const openRazorpayCheckout = useCallback(
    async (
      intent: any,
      order: { id: string; orderNumber: string; customerName?: string; customerPhone?: string },
      tableNumber: string
    ) => {
      if (typeof window === 'undefined') return;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        toast({
          title: 'Payment system unavailable',
          description: 'Unable to load payment system. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const options = {
        key: intent.razorpayKey || process.env.VITE_RAZORPAY_KEY_ID,
        amount: intent.amount,
        currency: intent.currency || 'INR',
        name: restaurant?.name || 'Restaurant',
        description: `Order #${order.orderNumber}`,
        order_id: intent.razorpayOrderId,
        prefill: {
          name: order.customerName || '',
          contact: order.customerPhone || '',
        },
        theme: {
          color: '#16a34a',
        },
        handler: (response: any) => {
          toast({
            title: 'Payment successful!',
            description: 'Your order has been confirmed.',
          });
          navigate(`/c/${slug}/order/${order.id}?table=${tableNumber}&payment=success`);
        },
        modal: {
          ondismiss: () => {
            toast({
              title: 'Payment cancelled',
              description: 'You can complete payment later with staff if needed.',
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    },
    [restaurant?.name, slug, navigate, toast, loadRazorpayScript]
  );

  const handleConfirmOrder = async (
    tableNumber: string
  ) => {
    if (!restaurant) return;
    const trimmedTable = tableNumber.trim();

    if (!trimmedTable) {
      toast({
        title: 'Add a table or name',
        description:
          'Please enter a table number or takeaway name before placing the order.',
        variant: 'destructive',
      });
      return;
    }

    if (Object.keys(cart).length === 0) {
      toast({
        title: 'Cart is empty',
        description:
          'Add at least one item to your cart before placing an order.',
        variant: 'destructive',
      });
      setTableDialogOpen(false);
      return;
    }

    const payload = {
      restaurantId: restaurant.id,
      tableNumber: trimmedTable,
      paymentMethod: 'cash', // Default to cash, customer can choose payment method later
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

    setIsProcessingPayment(true);

    try {
      const order = await createOrder(payload).unwrap();
      setCart({});
      setCartPanelOpen(false);
      setTableDialogOpen(false);
      toast({
        title: 'Order placed! 🍽️',
        description: `Ticket #${order.orderNumber} created. You can pay when you're ready to leave.`,
      });

      navigate(`/c/${slug}/order/${order.id}?table=${trimmedTable}`);
    } catch (err) {
      toast({
        title: 'Unable to place order',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (isError || !restaurant)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Unable to load menu. Please try again later.
      </div>
    );

  return (
    <div className="relative min-h-screen bg-background pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b p-4"
      >
        <div className="max-w-lg mx-auto space-y-4">
          <div className="text-center">
            <h1 className="text-xl font-bold">{restaurant?.name || 'Menu'}</h1>
          </div>

          {/* Search and Filters */}
          <MenuSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </motion.div>

      {/* Category Tabs */}
      <div className="sticky top-[140px] z-20 bg-background/95 backdrop-blur-md border-b">
        <ScrollArea className="w-full">
          <div className="flex gap-2 p-4 max-w-lg mx-auto">
            {availableCategories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="shrink-0 flex items-center gap-2"
              >
                <span>{category.icon}</span>
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
        transition={{ delay: 0.2 }}
        className="p-4 max-w-lg mx-auto space-y-4"
      >
        {displayItems.length === 0 ? (
          <div className="text-center py-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {searchQuery || Object.values(filters).some(Boolean) ? (
                <>
                  <div className="text-4xl mb-3">🔍</div>
                  <h3 className="text-base font-semibold mb-2">
                    No matches found
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setFilters({
                        vegetarian: false,
                        nonVegetarian: false,
                        spicy: false,
                        popular: false,
                        quickPrep: false,
                      });
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">🍽️</div>
                  <h3 className="text-base font-semibold">
                    No items available
                  </h3>
                </>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map((item, index) => {
              const entry = cart[item.id];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex gap-3">
                      {/* Item Image */}
                      <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                        <img
                          src={item.imageUrls?.[0] || '/placeholder.svg'}
                          alt={item.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTEgMTRMMTUgMTBNMjEgMTJDMjEgMTYuOTcwNiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NCAyMSAzIDE2Ljk3MDYgMyAxMkMzIDcuMDI5NCA3LjAyOTQgMyAxMiAzQzE2Ljk3MDYgMyAyMSA3LjAyOTQgMjEgMTJaIiBzdHJva2U9IiNhMWE5YjgiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                          }}
                        />
                        {item.imageUrls && item.imageUrls.length > 1 && (
                          <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                            +{item.imageUrls.length - 1}
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 mr-2">
                            <h3 className="font-semibold text-sm truncate text-gray-900">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm text-gray-900">
                              {formatCurrency(item.pricing.amount)}
                            </p>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-1 mb-2">
                          {item._isVegetarian && (
                            <span className="text-green-600 text-xs">🌱</span>
                          )}
                          {item._isSpicy && (
                            <span className="text-red-600 text-xs">🌶️</span>
                          )}
                          {item._isPopular && (
                            <span className="text-yellow-600 text-xs">⭐</span>
                          )}
                          {item._isQuick && (
                            <span className="text-blue-600 text-xs">⚡</span>
                          )}
                        </div>

                        {/* Add to Cart */}
                        {entry ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-full"
                                onClick={() => handleRemove(item.id)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center font-medium text-sm">
                                {entry.quantity}
                              </span>
                              <Button
                                size="icon"
                                className="h-7 w-7 rounded-full"
                                onClick={() =>
                                  handleAdd(item.id, item.name, item.pricing)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs font-medium text-gray-700">
                              {formatCurrency(
                                item.pricing.amount * entry.quantity
                              )}
                            </p>
                          </div>
                        ) : (
                          <Button
                            className="w-full h-8 text-xs"
                            onClick={() =>
                              handleAdd(item.id, item.name, item.pricing)
                            }
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Cart Bottom Bar */}
      <AnimatePresence>
        <CartBottomBar
          cart={cart}
          totalItems={totalItems}
          totalAmount={totalAmount}
          onViewCart={() => setCartPanelOpen(true)}
          onCheckout={() => setTableDialogOpen(true)}
        />
      </AnimatePresence>

      {/* Cart Panel */}
      <CartPanel
        open={cartPanelOpen}
        onOpenChange={setCartPanelOpen}
        cart={cart}
        totalItems={totalItems}
        totalAmount={totalAmount}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => setTableDialogOpen(true)}
        onClearCart={handleClearCart}
      />

      {/* Table Dialog */}
      <TableDialog
        open={tableDialogOpen}
        onOpenChange={setTableDialogOpen}
        totalAmount={totalAmount}
        itemCount={totalItems}
        isPlacingOrder={isPlacingOrder || isProcessingPayment}
        onConfirm={handleConfirmOrder}
        defaultTable={tableFromUrl}
      />
    </div>
  );
}
