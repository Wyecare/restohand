'use client';
import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Sparkles,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetMyNotificationsQuery,
  useGetNotificationStatsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  NotificationData,
} from '@/store/api/notificationsApi';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const getNotificationIcon = (
  type: NotificationData['type'],
  urgency: NotificationData['urgency']
) => {
  const iconClass = cn(
    'h-4 w-4',
    urgency === 'urgent' && 'text-red-600',
    urgency === 'high' && 'text-orange-500',
    urgency === 'normal' && 'text-blue-500',
    urgency === 'low' && 'text-slate-500'
  );

  switch (type) {
    case 'payment_confirmation':
      return <Check className={cn(iconClass, 'text-green-600')} />;
    case 'call_waiter':
      return <Bell className={iconClass} />;
    case 'order_status_update':
      return <Package className={iconClass} />;
    case 'order_ready':
      return <Sparkles className={iconClass} />;
    case 'system_alert':
      return <AlertCircle className={iconClass} />;
    default:
      return <Bell className={iconClass} />;
  }
};

const getUrgencyStyles = (
  urgency: NotificationData['urgency'],
  isUnread: boolean
) => {
  const baseStyles = 'transition-colors duration-200';

  if (!isUnread) {
    return cn(baseStyles, 'border-l-transparent hover:border-l-slate-200');
  }

  switch (urgency) {
    case 'urgent':
      return cn(
        baseStyles,
        'border-l-red-500 bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30'
      );
    case 'high':
      return cn(
        baseStyles,
        'border-l-orange-500 bg-orange-50/50 hover:bg-orange-50 dark:bg-orange-950/20 dark:hover:bg-orange-950/30'
      );
    case 'normal':
      return cn(
        baseStyles,
        'border-l-blue-500 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
      );
    case 'low':
      return cn(
        baseStyles,
        'border-l-slate-400 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/30'
      );
    default:
      return cn(
        baseStyles,
        'border-l-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/20'
      );
  }
};

interface NotificationItemProps {
  notification: NotificationData;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const isUnread = notification.status === 'unread';

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border-l-4 cursor-pointer rounded-r-lg',
        getUrgencyStyles(notification.urgency, isUnread)
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div
        className={cn(
          'mt-1 flex-shrink-0 rounded-full p-2',
          isUnread ? 'bg-background shadow-sm' : 'bg-muted/50'
        )}
      >
        {getNotificationIcon(notification.type, notification.urgency)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              'text-sm leading-tight',
              isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'
            )}
          >
            {notification.title}
          </h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isUnread && (
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>

        <p
          className={cn(
            'text-xs leading-relaxed line-clamp-2',
            isUnread ? 'text-foreground/80' : 'text-muted-foreground'
          )}
        >
          {notification.message}
        </p>

        {/* Meta Information */}
        <div className="flex items-center gap-2 pt-1">
          {notification.tableNumber && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              Table {notification.tableNumber}
            </Badge>
          )}
          {notification.orderNumber && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              #{notification.orderNumber}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useGetMyNotificationsQuery(
    {
      restaurantId: restaurantId!,
      limit: 10,
      status: undefined,
    },
    {
      skip: !restaurantId,
      pollingInterval: 30000,
    }
  );

  const { data: stats } = useGetNotificationStatsQuery(
    { restaurantId: restaurantId! },
    {
      skip: !restaurantId,
      pollingInterval: 30000,
    }
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();

  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = stats?.unread ?? 0;

  const handleMarkAsRead = async (id: string) => {
    if (!restaurantId) return;
    try {
      await markAsRead({ restaurantId, id }).unwrap();
      refetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!restaurantId || unreadCount === 0) return;
    try {
      await markAllAsRead({ restaurantId }).unwrap();
      refetchNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  if (!restaurantId) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent"
        >
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <Badge
                variant="destructive"
                className="relative inline-flex h-5 w-5 items-center justify-center p-0 text-[10px] font-bold rounded-full"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[400px]" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div>
            <DropdownMenuLabel className="text-base font-semibold p-0">
              Notifications
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {unreadCount} unread{' '}
                {unreadCount === 1 ? 'notification' : 'notifications'}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 px-2 text-xs hover:bg-accent"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Notifications List */}
        <ScrollArea className="max-h-[500px]">
          {notificationsLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="relative">
                <Bell className="h-8 w-8 text-muted-foreground animate-pulse" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-ping" />
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                No notifications right now.
                <br />
                We'll notify you when something important happens.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-xs h-9 hover:bg-accent font-medium"
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
