import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray';
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  className?: string;
  onClick?: () => void;
  loading?: boolean;
}

const iconColorClasses = {
  blue: 'bg-blue-500/10 ',
  green: 'bg-green-500/10 text-green-600',
  orange: 'bg-orange-500/10 text-orange-600',
  red: 'bg-red-500/10 text-red-600',
  purple: 'bg-purple-500/10 text-purple-600',
  gray: 'bg-gray-500/10 text-gray-600',
};

const MetricsCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'blue',
  trend,
  badge,
  className,
  onClick,
  loading = false,
}: MetricsCardProps) => {
  const isClickable = Boolean(onClick);

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        className,
        'py-0'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              {Icon && (
                <div
                  className={cn(
                    'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md shrink-0',
                    iconColorClasses[iconColor]
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {title}
              </h3>
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
              {loading ? (
                <div className="h-7 w-16 sm:h-8 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-xl sm:text-2xl font-semibold tracking-tight break-words">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              )}

              {trend && (
                <span
                  className={cn(
                    'text-[10px] sm:text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full whitespace-nowrap',
                    trend.isPositive
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-red-500/10 text-red-600'
                  )}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value}%{trend.label && ` ${trend.label}`}
                </span>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {/* Badge */}
          {badge && (
            <Badge
              variant={badge.variant || 'secondary'}
              className="text-[10px] sm:text-xs shrink-0"
            >
              {badge.text}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;

// Collection component for multiple metrics
interface MetricsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export const MetricsGrid = ({
  children,
  columns = 3,
  className,
}: MetricsGridProps) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2 lg:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-3 md:gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
};
