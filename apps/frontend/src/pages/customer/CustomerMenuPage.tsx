import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
import { useGetPublicMenuQuery } from '@/store/api/restaurantsApi';
import { useCreateOrderMutation } from '@/store/api/ordersApi';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import TableDialog from './TableDialog';

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

  const [step, setStep] = useState<'categories' | 'items'>('categories');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [tableDialogOpen, setTableDialogOpen] = useState(false);

  const restaurant = data?.restaurant;
  const categories = data?.menu.categories ?? [];
  const uncategorised = data?.menu.uncategorised ?? [];

  const allProducts = useMemo(() => {
    const grouped = categories.flatMap((c) =>
      c.items.map((i) => ({ ...i, _categoryId: c.id, _categoryName: c.name }))
    );
    return [
      ...grouped,
      ...uncategorised.map((i) => ({ ...i, _categoryId: 'uncategorised' })),
    ];
  }, [categories, uncategorised]);

  const activeItems = activeCategory
    ? allProducts.filter((p) => p._categoryId === activeCategory)
    : [];

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

  const handleConfirmOrder = async (
    tableNumber: string,
    paymentMethod: 'upi' | 'cash'
  ) => {
    if (!restaurant) return;

    const payload = {
      restaurantId: restaurant.id,
      tableNumber: tableNumber.trim(),
      paymentMethod,
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

    try {
      const order = await createOrder(payload).unwrap();
      setCart({});
      toast({
        title: 'Order placed',
        description: `Ticket #${order.orderNumber} created.`,
      });
      if (paymentMethod === 'upi' && order.paymentIntentUrl) {
        window.location.href = order.paymentIntentUrl;
      }
      navigate(`/c/${slug}/order/${order.id}?table=${tableNumber}`);
    } catch (err) {
      toast({
        title: 'Unable to place order',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
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
    <div className="relative min-h-screen bg-background">
      {/* Step 1 — Category Selection */}
      {step === 'categories' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 p-4 space-y-4">
          <h1 className="text-center text-2xl font-bold">
            What would you like today?
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            Choose a category to explore dishes
          </p>

          <ScrollArea className="w-full whitespace-nowrap mt-4">
            <RadioGroup className="flex gap-3 flex-wrap justify-center">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setStep('items');
                  }}
                  className="flex w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-4 hover:bg-muted transition-all"
                >
                  <span className="text-3xl">{category.icon ?? '🍽️'}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
              ))}
              {uncategorised.length > 0 && (
                <div
                  onClick={() => {
                    setActiveCategory('uncategorised');
                    setStep('items');
                  }}
                  className="flex w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-4 hover:bg-muted transition-all"
                >
                  <span className="text-3xl">✨</span>
                  <span className="text-sm font-medium">Others</span>
                </div>
              )}
            </RadioGroup>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Step 2 — Items */}
      {step === 'items' && (
        <div className="animate-in fade-in slide-in-from-right-2 space-y-4 p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep('categories')}>
              ← Back
            </Button>
            <h2 className="text-lg font-semibold">
              {categories.find((c) => c.id === activeCategory)?.name ?? 'Menu'}
            </h2>
            <div className="w-16" /> {/* spacing */}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {activeItems.length ? (
              activeItems.map((item) => {
                const entry = cart[item.id];
                return (
                  <Card
                    key={item.id}
                    className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="relative aspect-[4/3] bg-muted">
                      <img
                        src={item.imageUrl || '/placeholder.svg'}
                        alt={item.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{item.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {formatCurrency(item.pricing.amount)}
                        </Badge>
                      </div>
                      {entry ? (
                        <div className="flex items-center justify-between pt-1">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleRemove(item.id)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">
                              {entry.quantity}
                            </span>
                            <Button
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() =>
                                handleAdd(item.id, item.name, item.pricing)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full rounded-full mt-1"
                          onClick={() =>
                            handleAdd(item.id, item.name, item.pricing)
                          }
                        >
                          Add
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-10">
                No items found in this category.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart */}
      {totalItems > 0 && (
        <Button
          variant="outline"
          size="icon"
          className="bg-muted fixed bottom-4 right-4 z-40 rounded-full shadow-xl"
          onClick={() => setTableDialogOpen(true)}
        >
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            <Badge className="absolute -top-3 left-full min-w-5 -translate-x-1/2 rounded-full px-1">
              {totalItems}
            </Badge>
          </span>
        </Button>
      )}

      {/* Table Dialog */}
      <TableDialog
        open={tableDialogOpen}
        onOpenChange={setTableDialogOpen}
        totalAmount={totalAmount}
        isPlacingOrder={isPlacingOrder}
        onConfirm={handleConfirmOrder}
      />
    </div>
  );
}
