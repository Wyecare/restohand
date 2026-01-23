import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { useGetPublicMenuQuery } from '@/store/api/restaurantsApi';
import { useCreateOrderWithPaymentMutation, useVerifyPaymentMutation } from '@/store/api/ordersApi';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Plus,
  Minus,
  Search,
  X,
  Sparkles,
  Clock,
  Receipt,
  RefreshCcw,
} from 'lucide-react';
import CartDialog, { type OrderFormData } from '@/components/cart/CartDialog';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import { CartErrorBoundary } from '@/components/cart/ErrorBoundary';
import { NetworkStatus } from '@/components/cart/NetworkErrorHandler';
import { useCartCalculation } from '@/hooks/useCartCalculation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addItem, removeItem, updateItemQuantity, updateCustomerInfo, clearCart, initializeCart } from '@/store/slices/cartSlice';
import { Input } from '@/components/ui/input';
import type { MenuItemPricing, PublicMenuCategory } from '@/store/api/types';
import { formatCurrency } from '@/lib/billing';

declare global {
  interface Window {
    Razorpay?: any;
  }
}


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

const formatOrderStatus = (status: string) =>
  status
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');


export default function CustomerMenuPage() {
  const params = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const slug = params.slug ?? '';
  const initialTableParam = searchParams.get('table');
  const tableFromUrl =
    initialTableParam && initialTableParam.trim().length > 0
      ? initialTableParam.trim()
      : undefined;

  const initialTableIdParam = searchParams.get('tableId');
  const tableIdFromUrl =
    initialTableIdParam && initialTableIdParam.trim().length > 0
      ? initialTableIdParam.trim()
      : undefined;

  const { data, isLoading, isError } = useGetPublicMenuQuery(
    { slug, table: tableFromUrl, tableId: tableIdFromUrl },
    { skip: !slug }
  );
  const [createOrderWithPayment, { isLoading: isPlacingOrder }] = useCreateOrderWithPaymentMutation();
  const [verifyPayment, { isLoading: isVerifyingPayment }] = useVerifyPaymentMutation();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { items: cartItems, totalQuantity, totalAmount } = useAppSelector((state) => ({
    items: state.cart.items,
    totalQuantity: state.cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    totalAmount: state.cart.backendCalculated?.totalAmount ?? state.cart.subtotal,
  }));

  // Initialize cart calculation hook
  const { isCalculating, backendTotal, hasBackendCalculation } = useCartCalculation();


  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      toast({
        title: 'Payment system unavailable',
        description: 'Online payments may not work. Please try cash payment or refresh the page.',
        variant: 'destructive',
      });
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [toast]);

  // Extract data from the API response
  const restaurant = data?.restaurant;
  const menu = data?.menu;

  // Initialize cart when restaurant data is available
  useEffect(() => {
    if (restaurant && slug) {
      dispatch(initializeCart({
        restaurantId: restaurant.id,
        restaurantSlug: slug,
        tableNumber: tableFromUrl,
      }));
    }
  }, [dispatch, restaurant, slug, tableFromUrl]);
  const activeOrder = data?.activeOrder;
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


  const handleAdd = (id: string, name: string, pricing: MenuItemPricing) => {
    try {
      dispatch(addItem({
        id: `${id}-${Date.now()}`, // Generate unique cart item ID
        menuItemId: id,
        name,
        price: pricing.amount,
        categoryId: '', // Will be set properly later
        categoryName: '',
        customizations: {},
      }));
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast({
        title: 'Failed to add item',
        description: 'Unable to add item to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = (id: string) => {
    try {
      const existingItem = cartItems.find((item: any) => item.menuItemId === id);
      if (existingItem) {
        if (existingItem.quantity === 1) {
          dispatch(removeItem(existingItem.id));
        } else {
          dispatch(updateItemQuantity({ id: existingItem.id, quantity: existingItem.quantity - 1 }));
        }
      }
    } catch (error) {
      console.error('Error removing item from cart:', error);
      toast({
        title: 'Failed to update cart',
        description: 'Unable to update cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getItemQuantity = (menuItemId: string): number => {
    const item = cartItems.find((item: any) => item.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  };

  const handlePlaceOrder = async (orderData: OrderFormData) => {
    if (!restaurant || cartItems.length === 0) return;

    // Store customer info in cart state
    dispatch(updateCustomerInfo(orderData.customerInfo));

    const payload = {
      tableNumber: orderData.tableNumber,
      items: cartItems.map((item: any) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        pricing: {
          unitAmount: item.price,
          currency: 'INR',
        },
      })),
      notes: orderData.notes,
      customerInfo: orderData.customerInfo,
      totalAmount: (hasBackendCalculation ? backendTotal : totalAmount) * 100, // Convert to paise
    };

    try {
      const result = await createOrderWithPayment({
        restaurantId: restaurant.id,
        ...payload,
      }).unwrap();

      if (orderData.paymentMethod === 'razorpay') {
        // Check if Razorpay is loaded
        if (!window.Razorpay) {
          toast({
            title: 'Payment system not ready',
            description: 'Please wait a moment and try again, or use cash payment.',
            variant: 'destructive',
          });
          return;
        }

        // Handle Razorpay payment
        const options = {
          key: result.razorpayKey,
          amount: result.amount,
          currency: result.currency,
          order_id: result.razorpayOrderId,
          name: restaurant.name,
          description: `Order #${result.orderNumber}`,
          handler: async (response: any) => {
            try {
              // Verify payment with backend
              await verifyPayment({
                restaurantId: restaurant.id,
                orderId: result.orderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }).unwrap();

              toast({
                title: 'Payment Successful! 🎉',
                description: `Order #${result.orderNumber} confirmed`,
              });
              dispatch(clearCart());
              setCartDialogOpen(false);
              navigate(`/c/${slug}/order/${result.orderId}`);
            } catch (error) {
              console.error('Payment verification error:', error);
              toast({
                title: 'Payment verification failed',
                description: 'Please contact support if amount was deducted.',
                variant: 'destructive',
              });
            }
          },
          prefill: {
            name: orderData.customerInfo.name,
            contact: orderData.customerInfo.phone,
            email: orderData.customerInfo.email,
          },
          modal: {
            ondismiss: () => {
              toast({
                title: 'Payment cancelled',
                description: 'You can complete the payment later from your order.',
                variant: 'destructive',
              });
            },
          },
          theme: {
            color: '#000000',
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        // Cash payment - order placed directly
        toast({
          title: 'Order placed! 🎉',
          description: `Order #${result.orderNumber} created`,
        });
        dispatch(clearCart());
        setCartDialogOpen(false);
        navigate(`/c/${slug}/order/${result.orderId}`);
      }
    } catch (err) {
      console.error('Order placement error:', err);

      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'data' in err) {
        const apiError = err as any;
        if (apiError.data?.message) {
          errorMessage = apiError.data.message;
        } else if (apiError.status === 400) {
          errorMessage = 'Please check your order details and try again.';
        } else if (apiError.status === 500) {
          errorMessage = 'Server error. Please try again in a moment.';
        }
      }

      toast({
        title: 'Unable to place order',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/20">
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
            Unable to load the menu. This could be due to:
          </p>
          <ul className="text-sm text-muted-foreground text-left space-y-1 mb-4">
            <li>• Network connectivity issues</li>
            <li>• Restaurant may be temporarily offline</li>
            <li>• Invalid restaurant link</li>
          </ul>
          <div className="space-y-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              variant="outline"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => navigate('/') }
              className="w-full"
              variant="ghost"
            >
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    );

  // Check if self-ordering is disabled - show menu but disable ordering
  const isSelfOrderingEnabled =
    restaurant?.settings?.selfOrderingEnabled ?? true;

  return (
    <CartErrorBoundary>
      <NetworkStatus />
      <div className="relative min-h-screen bg-linear-to-b from-background via-muted/5 to-background pb-32">
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

          <AnimatePresence>
            {activeOrder && tableFromUrl && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 dark:bg-orange-900/50 rounded-full p-2">
                          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                            Active Order for Table {tableFromUrl}
                          </h3>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            Order #{activeOrder.orderNumber} •{' '}
                            {formatOrderStatus(activeOrder.status)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/50"
                        onClick={() => {
                          const encodedTable = encodeURIComponent(tableFromUrl);
                          navigate(
                            `/c/${slug}/order/${activeOrder.id}?table=${encodedTable}`
                          );
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        View Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

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
                    className="shrink-0 h-9 px-4 rounded-full"
                  >
                    <AccessibleEmoji
                      symbol={category.icon.symbol}
                      label={category.icon.label}
                      className="mr-1.5"
                    />
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
        className="p-4 max-w-2xl mx-auto"
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
                  <Card className=" py-2 overflow-hidden border hover:shadow-md transition-all duration-200 hover:border-primary/30 h-full">
                    <CardContent className="px-2 py-0 flex flex-col h-full">
                      {/* Item Image */}
                      <div className="relative w-full aspect-square rounded-md overflow-hidden mb-2 bg-linear-to-br from-muted to-muted/50">
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

                        {/* Add Button - only show if self-ordering is enabled */}
                        {isSelfOrderingEnabled && (
                          <>
                            {quantity > 0 ? (
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
                                  {quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-full hover:bg-primary-foreground/20 text-primary-foreground p-0"
                                  onClick={() =>
                                    handleAdd(item.id, item.name, item.pricing)
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
                                  handleAdd(item.id, item.name, item.pricing)
                                }
                              >
                                Add
                              </Button>
                            )}
                          </>
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

      {/* Floating Cart Button - only show if self-ordering is enabled */}
      {isSelfOrderingEnabled && (
        <FloatingCartButton onClick={() => setCartDialogOpen(true)} />
      )}

      {/* Cart Dialog */}
      <CartDialog
        open={cartDialogOpen}
        onOpenChange={setCartDialogOpen}
        onPlaceOrder={handlePlaceOrder}
        isLoading={isPlacingOrder || isVerifyingPayment}
        defaultTableNumber={tableFromUrl}
      />
      </div>
    </CartErrorBoundary>
  );
}
