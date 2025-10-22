'use client';

import { useMemo, useCallback } from 'react';
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

export default function CustomerOrderStatusPage() {
  const { slug = '', orderId = '' } = useParams();
  const { data, isLoading, isError, refetch } = useGetPublicOrderQuery(
    { slug, orderId },
    { skip: !slug || !orderId }
  );

  const order = data;

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
          className="absolute right-1/2 translate-x-1/2 mt-4 flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm text-primary shadow-sm"
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
