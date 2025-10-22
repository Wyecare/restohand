import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
import { useGetPublicMenuQuery } from '@/store/api/restaurantsApi';
import { useCreateOrderMutation } from '@/store/api/ordersApi';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { MenuItemPricing } from '@/store/api/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CartEntry {
  id: string;
  name: string;
  pricing: MenuItemPricing;
  quantity: number;
}

const formatCurrency = (pricing: MenuItemPricing) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: pricing.currency ?? 'INR',
    maximumFractionDigits: 2,
  }).format(pricing.amount);

const CustomerMenuPage = () => {
  const params = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const slug = params.slug ?? '';
  const table = searchParams.get('table') ?? undefined;

  const navigate = useNavigate();

  const { data, isLoading, isError } = useGetPublicMenuQuery(slug, {
    skip: !slug,
  });
  const [createOrder, { isLoading: isPlacingOrder }] = useCreateOrderMutation();

  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>('upi');
  const [tableNumber, setTableNumber] = useState(table ?? '');

  useEffect(() => {
    setTableNumber(table ?? '');
  }, [table]);

  const categories = data?.menu.categories ?? [];
  const uncategorised = data?.menu.uncategorised ?? [];
  const restaurant = data?.restaurant;

  const totalItems = useMemo(
    () => Object.values(cart).reduce((sum, entry) => sum + entry.quantity, 0),
    [cart]
  );

  const totalAmount = useMemo(
    () =>
      Object.values(cart).reduce(
        (sum, entry) => sum + entry.quantity * entry.pricing.amount,
        0
      ),
    [cart]
  );

  const handleAdd = (id: string, name: string, pricing: MenuItemPricing) => {
    setCart((prev) => {
      const existing = prev[id];
      return {
        ...prev,
        [id]: {
          id,
          name,
          pricing,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
  };

  const handleRemove = (id: string) => {
    setCart((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const handleCheckout = async () => {
    if (!totalItems) {
      toast({ title: 'Cart is empty', description: 'Add items to continue.' });
      return;
    }

    if (!restaurant) return;

    if (!tableNumber.trim()) {
      toast({
        title: 'Table required',
        description: 'Please tell us where you are seated so staff can deliver your order.',
        variant: 'destructive',
      });
      return;
    }

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
          taxAmount: entry.pricing.taxAmount ?? 0,
          discountAmount: entry.pricing.discountAmount ?? 0,
        },
      })),
    };

    try {
      const order = await createOrder(payload).unwrap();
      setCart({});
      toast({
        title: 'Order placed',
        description: `Ticket #${order.orderNumber} created`,
      });

      if (paymentMethod === 'upi' && order.paymentIntentUrl) {
        window.location.href = order.paymentIntentUrl;
      }

      const params = new URLSearchParams();
      if (tableNumber) params.set('table', tableNumber.trim());
      const query = params.toString();
      navigate(query ? `/c/${slug}/order/${order.id}?${query}` : `/c/${slug}/order/${order.id}`);
    } catch (error) {
      toast({
        title: 'Unable to place order',
        description:
          error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Unable to load menu right now. Please try again later.
      </div>
    );
  }

  const renderItems = (items: typeof uncategorised) => (
    <div className="grid gap-4">
      {items.map((item) => {
        const entry = cart[item.id];
        return (
          <Card key={item.id} className="border shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold">
                  {item.name}
                </CardTitle>
                <Badge variant="outline">{formatCurrency(item.pricing)}</Badge>
              </div>
              {item.description && (
                <CardDescription className="text-sm">
                  {item.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {entry && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemove(item.id)}
                  >
                    -
                  </Button>
                )}
                <Button size="sm" onClick={() => handleAdd(item.id, item.name, item.pricing)}>
                  {entry ? `Add more (${entry.quantity})` : 'Add'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const defaultTab = categories[0]?.id ?? (uncategorised.length ? 'uncategorised' : 'empty');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 bg-background px-4 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {restaurant.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {restaurant.upi.displayName} • {restaurant.upi.vpa}
          {tableNumber ? ` • Table ${tableNumber}` : ''}
        </p>
      </div>

      {!table && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where are you seated?</CardTitle>
            <CardDescription>
              Tell us your table number so the staff can bring your order to the right spot.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <Input
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
              placeholder="Table number"
              className="md:w-48"
            />
            <p className="text-xs text-muted-foreground">
              Not at a table? Enter takeaway, counter, or your name so staff can find you.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex flex-wrap justify-start gap-2 overflow-x-auto">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
          {uncategorised.length > 0 && (
            <TabsTrigger value="uncategorised">Others</TabsTrigger>
          )}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            {category.description && (
              <p className="text-sm text-muted-foreground">{category.description}</p>
            )}
            {category.items.length ? (
              renderItems(category.items)
            ) : (
              <p className="text-sm text-muted-foreground">
                No items in this section yet.
              </p>
            )}
          </TabsContent>
        ))}

        {uncategorised.length > 0 && (
          <TabsContent value="uncategorised" className="space-y-4">
            {renderItems(uncategorised)}
          </TabsContent>
        )}

        {categories.length === 0 && uncategorised.length === 0 && (
          <TabsContent value="empty">
            <p className="text-sm text-muted-foreground">
              Menu will appear here once the restaurant publishes dishes.
            </p>
          </TabsContent>
        )}
      </Tabs>

      <Separator className="my-4" />

      <div className="sticky bottom-4 rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Items
              </p>
              <p className="text-lg font-semibold">{totalItems}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Total
              </p>
              <p className="text-lg font-semibold">
                ₹{totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Table
              </Label>
              <Input
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                placeholder="Table number"
                disabled={!!table}
                className="md:w-40"
              />
            </div>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as 'upi' | 'cash')}
            >
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={isPlacingOrder || totalItems === 0}
            >
              {isPlacingOrder
                ? 'Placing order…'
                : paymentMethod === 'cash'
                  ? 'Place order'
                  : 'Proceed to pay'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerMenuPage;
