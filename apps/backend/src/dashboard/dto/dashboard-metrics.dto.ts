import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetricValue {
  @ApiProperty({ description: 'Current period value' })
  current: number;

  @ApiProperty({ description: 'Previous period value for comparison' })
  previous: number;

  @ApiProperty({ description: 'Percentage change from previous period' })
  change: number;

  @ApiProperty({ description: 'Change direction', enum: ['up', 'down', 'same'] })
  trend: 'up' | 'down' | 'same';
}

export class RevenueMetrics {
  @ApiProperty({ description: 'Total revenue' })
  total: MetricValue;

  @ApiProperty({ description: 'Cash payments total' })
  cash: MetricValue;

  @ApiProperty({ description: 'UPI payments total' })
  upi: MetricValue;

  @ApiProperty({ description: 'Average ticket size' })
  averageTicket: MetricValue;
}

export class OrderMetrics {
  @ApiProperty({ description: 'Total orders count' })
  total: MetricValue;

  @ApiProperty({ description: 'Completed orders count' })
  completed: MetricValue;

  @ApiProperty({ description: 'Pending orders count' })
  pending: MetricValue;

  @ApiProperty({ description: 'Cancelled orders count' })
  cancelled: MetricValue;

  @ApiProperty({ description: 'Average order completion time in minutes' })
  averageCompletionTime: MetricValue;
}

export class PaymentMetrics {
  @ApiProperty({ description: 'Cash payment count' })
  cashCount: MetricValue;

  @ApiProperty({ description: 'UPI payment count' })
  upiCount: MetricValue;

  @ApiProperty({ description: 'Cash percentage of total payments' })
  cashPercentage: number;

  @ApiProperty({ description: 'UPI percentage of total payments' })
  upiPercentage: number;
}

export class ChartDataPoint {
  @ApiProperty({ description: 'Date/time label' })
  label: string;

  @ApiProperty({ description: 'Data value' })
  value: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class ChartData {
  @ApiProperty({ type: [ChartDataPoint], description: 'Chart data points' })
  data: ChartDataPoint[];

  @ApiProperty({ description: 'Chart type', enum: ['line', 'bar', 'pie', 'area'] })
  type: 'line' | 'bar' | 'pie' | 'area';

  @ApiProperty({ description: 'Chart title' })
  title: string;

  @ApiPropertyOptional({ description: 'Y-axis label' })
  yAxisLabel?: string;
}

export class TopMenuItem {
  @ApiProperty({ description: 'Menu item ID' })
  id: string;

  @ApiProperty({ description: 'Menu item name' })
  name: string;

  @ApiProperty({ description: 'Number of times ordered' })
  orderCount: number;

  @ApiProperty({ description: 'Total revenue from this item' })
  revenue: number;

  @ApiProperty({ description: 'Category name' })
  category: string;
}

export class RecentOrder {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Order number' })
  orderNumber: string;

  @ApiProperty({ description: 'Table number' })
  tableNumber: string;

  @ApiProperty({ description: 'Order status' })
  status: string;

  @ApiProperty({ description: 'Payment status' })
  paymentStatus: string;

  @ApiProperty({ description: 'Payment method' })
  paymentMethod: string;

  @ApiProperty({ description: 'Total amount' })
  totalAmount: number;

  @ApiProperty({ description: 'Order creation time' })
  createdAt: Date;

  @ApiProperty({ description: 'Time since order was placed (in minutes)' })
  timeSinceOrdered: number;
}

export class DashboardMetricsDto {
  @ApiProperty({ description: 'Revenue-related metrics' })
  revenue: RevenueMetrics;

  @ApiProperty({ description: 'Order-related metrics' })
  orders: OrderMetrics;

  @ApiProperty({ description: 'Payment method metrics' })
  payments: PaymentMetrics;

  @ApiProperty({ type: [ChartData], description: 'Charts data for graphs' })
  charts: ChartData[];

  @ApiProperty({ type: [TopMenuItem], description: 'Top selling menu items' })
  topMenuItems: TopMenuItem[];

  @ApiProperty({ type: [RecentOrder], description: 'Recent orders' })
  recentOrders: RecentOrder[];

  @ApiProperty({ description: 'Peak hours data' })
  peakHours: {
    hour: number;
    orderCount: number;
    revenue: number;
  }[];

  @ApiProperty({ description: 'Dashboard data timestamp' })
  generatedAt: Date;

  @ApiProperty({ description: 'Data period information' })
  period: {
    from: Date;
    to: Date;
    label: string;
  };
}