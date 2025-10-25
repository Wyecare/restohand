'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  Loader2,
  Utensils,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useGetPublicOrderQuery } from '@/store/api/restaurantsApi';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import type { Order } from '@/store/api/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';

const progressDisplay = (value: Order['progress']) => {
  switch (value) {
    case 0:
      return 'Not started';
    case 40:
      return 'Prep started';
    case 60:
      return 'Almost ready';
    case 100:
      return 'Ready for pickup';
    default:
      return `${value}%`;
  }
};

const progressIcon = (value: Order['progress']) => {
  if (value < 40)
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (value < 100)
    return <Utensils className="h-5 w-5 text-primary animate-pulse" />;
  return <CheckCircle2 className="h-5 w-5 text-green-500" />;
};

const paymentStatusLabel = (status: Order['paymentStatus']) =>
  status.replace('_', ' ');

type DeviceOrder = {
  orderId: string;
  orderNumber: string;
  slug: string;
  totalAmount: number;
  createdAt: string;
  paymentMethod: Order['paymentMethod'];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

export default function CustomerOrderStatusPage() {
  const { slug = '', orderId = '' } = useParams();
  const { data, isLoading, isError, refetch } = useGetPublicOrderQuery(
    { slug, orderId },
    { skip: !slug || !orderId }
  );

  const order = data;
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceOrders, setDeviceOrders] = useState<DeviceOrder[]>([]);

  const handleSocketEvent = useCallback(
    (incoming: Order) => {
      if (incoming.id === orderId) {
        refetch();
      }
    },
    [orderId, refetch]
  );

  useOrdersSocket({ onEvent: handleSocketEvent, enabled: !!orderId });

  const progressValue = order?.progress ?? 0;
  const isCashDue =
    order?.paymentMethod === 'cash' && order.paymentStatus !== 'paid';

  const pastOrders = useMemo(() => {
    if (!orderId) return deviceOrders;
    return deviceOrders.filter((entry) => entry.orderId !== orderId);
  }, [deviceOrders, orderId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existingId = localStorage.getItem('restohand:device-id');
    if (existingId) {
      setDeviceId(existingId);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem('restohand:device-id', newId);
      setDeviceId(newId);
    }

    const historyRaw = localStorage.getItem('restohand:order-history');
    if (historyRaw) {
      try {
        const parsed = JSON.parse(historyRaw) as DeviceOrder[];
        setDeviceOrders(parsed);
      } catch (error) {
        console.error('Unable to parse order history', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!order || typeof window === 'undefined') return;

    const record: DeviceOrder = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      slug,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
    };

    setDeviceOrders((prev) => {
      const updated = [
        record,
        ...prev.filter((entry) => entry.orderId !== record.orderId),
      ];
      const trimmed = updated.slice(0, 5);
      localStorage.setItem('restohand:order-history', JSON.stringify(trimmed));
      return trimmed;
    });
  }, [order, slug]);

  const receiptUrl = useMemo(() => {
    if (!order) return null;
    const template = import.meta.env.VITE_BILL_DOWNLOAD_URL as
      | string
      | undefined;
    if (!template) return null;
    return template.replace(':slug', slug).replace(':orderId', order.id);
  }, [order, slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <AlertCircle className="mr-2 h-5 w-5" />
        Order not found or unavailable.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10"
    >
      {/* Header */}
      <div className="relative text-center space-y-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-extrabold tracking-tight"
        >
          Ticket #{order.orderNumber}
        </motion.h1>
        <p className="text-sm text-muted-foreground">
          Stay tuned — we’ll update you as your order moves through the kitchen.
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute right-1/2 translate-x-1/2 mt-4 flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm text-primary shadow-sm z-50"
        >
          {progressIcon(progressValue)}
          <span>{progressDisplay(progressValue)}</span>
        </motion.div>
      </div>

      {/* Order Progress */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="overflow-hidden border-0 shadow-md backdrop-blur-sm bg-gradient-to-br from-background/70 to-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order progress</span>
              {progressIcon(progressValue)}
            </CardTitle>
            <CardDescription>
              Latest update: {progressDisplay(progressValue)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress
              value={progressValue}
              className="h-3 overflow-hidden rounded-full"
            />
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary" className="capitalize">
                {order.status.replace('_', ' ')}
              </Badge>
              <Badge
                variant={
                  order.paymentMethod === 'cash' ? 'destructive' : 'secondary'
                }
              >
                {order.paymentMethod === 'cash' ? 'Cash due' : 'UPI'}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {paymentStatusLabel(order.paymentStatus)}
              </Badge>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <Clock className="mr-1 inline h-4 w-4" />
                Placed on: {new Date(order.createdAt).toLocaleString()}
              </p>
              {order.readyAt && (
                <p>
                  <Utensils className="mr-1 inline h-4 w-4" />
                  Ready at: {new Date(order.readyAt).toLocaleString()}
                </p>
              )}
              {order.paidAt && (
                <p>
                  <CheckCircle2 className="mr-1 inline h-4 w-4 text-green-500" />
                  Paid at: {new Date(order.paidAt).toLocaleString()}
                </p>
              )}
            </div>
            {isCashDue && (
              <div className="rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-3 py-2 text-sm">
                Please settle your bill with the staff when the order arrives.
                They will confirm your ticket number #{order.orderNumber} before
                marking it paid.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Order Items */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-0 shadow-md backdrop-blur-sm bg-gradient-to-br from-background/70 to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <motion.div
                key={`${item.name}-${item.quantity}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between rounded-lg bg-muted/30 p-2 px-3 text-sm"
              >
                <span>{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    ×{item.quantity}
                  </span>
                  <span className="font-medium text-foreground">
                    ₹{item.pricing.unitAmount.toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
            <Separator />
            <div className="flex items-center justify-between text-sm font-semibold pt-1">
              <span>Total</span>
              <span className="flex items-center gap-1">
                <IndianRupee className="h-4 w-4" />
                {order.totalAmount.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45 }}
      >
        <Card className="border-0 shadow-md backdrop-blur-sm bg-gradient-to-br from-background/70 to-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Bill summary
            </CardTitle>
            <CardDescription>
              Here&apos;s the total for this ticket.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Total payable</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
            {receiptUrl && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                  Download receipt
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Help card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Need help?</CardTitle>
            <CardDescription>
              Show this screen to staff or reach out if anything feels off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              For urgent assistance, let the staff know your ticket number{' '}
              <strong>#{order.orderNumber}</strong>.
            </p>
            <p>
              You can also email{' '}
              <a
                className="text-primary hover:underline"
                href="mailto:support@restohand.in"
              >
                support@restohand.in
              </a>{' '}
              with any concerns.
            </p>
            {deviceId && (
              <p className="text-xs text-muted-foreground/80">
                Device reference: <span className="font-mono">{deviceId}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Order history */}
      {pastOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="border-0 shadow-md backdrop-blur-sm bg-gradient-to-br from-background/70 to-muted/30">
            <CardHeader>
              <CardTitle>Orders on this device</CardTitle>
              <CardDescription>
                Quick glance at the last few tickets placed from here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {pastOrders.map((entry) => (
                <div
                  key={entry.orderId}
                  className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Ticket #{entry.orderNumber}
                    </p>
                    <p className="text-xs">
                      {new Date(entry.createdAt).toLocaleString()} •{' '}
                      {entry.paymentMethod === 'cash' ? 'Cash' : 'UPI'}
                    </p>
                  </div>
                  <span className="font-medium text-foreground">
                    {formatCurrency(entry.totalAmount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Thank You Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 text-center text-sm text-muted-foreground"
      >
        <p>Thank you for ordering with us! 🍽️</p>
        <p className="text-xs">
          This page auto-refreshes as your order updates.
        </p>
      </motion.div>
    </motion.div>
  );
}
