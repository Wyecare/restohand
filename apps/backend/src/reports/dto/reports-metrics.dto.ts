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

  @ApiProperty({ description: 'Card payments total' })
  card: MetricValue;

  @ApiProperty({ description: 'Average ticket size' })
  averageTicket: MetricValue;

  @ApiProperty({ description: 'Net revenue after discounts' })
  netRevenue: MetricValue;

  @ApiProperty({ description: 'Total tax collected' })
  taxAmount: MetricValue;

  @ApiProperty({ description: 'Total discounts given' })
  discountAmount: MetricValue;
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

  @ApiProperty({ description: 'Order success rate percentage' })
  successRate: MetricValue;

  @ApiProperty({ description: 'Orders per hour during operating hours' })
  ordersPerHour: MetricValue;
}

export class PaymentMetrics {
  @ApiProperty({ description: 'Cash payment count' })
  cashCount: MetricValue;

  @ApiProperty({ description: 'UPI payment count' })
  upiCount: MetricValue;

  @ApiProperty({ description: 'Card payment count' })
  cardCount: MetricValue;

  @ApiProperty({ description: 'Cash percentage of total payments' })
  cashPercentage: number;

  @ApiProperty({ description: 'UPI percentage of total payments' })
  upiPercentage: number;

  @ApiProperty({ description: 'Card percentage of total payments' })
  cardPercentage: number;

  @ApiProperty({ description: 'Average payment processing time' })
  averagePaymentTime: MetricValue;
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

  @ApiProperty({ description: 'Chart type', enum: ['line', 'bar', 'pie', 'area', 'donut'] })
  type: 'line' | 'bar' | 'pie' | 'area' | 'donut';

  @ApiProperty({ description: 'Chart title' })
  title: string;

  @ApiPropertyOptional({ description: 'Y-axis label' })
  yAxisLabel?: string;

  @ApiPropertyOptional({ description: 'Chart color scheme' })
  colors?: string[];
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

  @ApiProperty({ description: 'Profit margin percentage' })
  profitMargin: number;

  @ApiProperty({ description: 'Average rating' })
  averageRating?: number;
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

  @ApiProperty({ description: 'Customer name if available' })
  customerName?: string;
}

export class CategoryPerformance {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiProperty({ description: 'Total orders in category' })
  orderCount: number;

  @ApiProperty({ description: 'Total revenue from category' })
  revenue: number;

  @ApiProperty({ description: 'Category percentage of total revenue' })
  revenuePercentage: number;

  @ApiProperty({ description: 'Average item price in category' })
  averageItemPrice: number;

  @ApiProperty({ description: 'Most popular item in category' })
  topItem: {
    name: string;
    orderCount: number;
  };
}

export class CustomerAnalytics {
  @ApiProperty({ description: 'Total unique customers' })
  totalCustomers: MetricValue;

  @ApiProperty({ description: 'New customers in period' })
  newCustomers: MetricValue;

  @ApiProperty({ description: 'Returning customers in period' })
  returningCustomers: MetricValue;

  @ApiProperty({ description: 'Customer retention rate' })
  retentionRate: MetricValue;

  @ApiProperty({ description: 'Average orders per customer' })
  averageOrdersPerCustomer: MetricValue;

  @ApiProperty({ description: 'Customer lifetime value' })
  customerLifetimeValue: MetricValue;
}

export class StaffPerformance {
  @ApiProperty({ description: 'Staff member ID' })
  id: string;

  @ApiProperty({ description: 'Staff member name' })
  name: string;

  @ApiProperty({ description: 'Orders handled' })
  ordersHandled: number;

  @ApiProperty({ description: 'Average order completion time' })
  averageCompletionTime: number;

  @ApiProperty({ description: 'Customer satisfaction rating' })
  customerSatisfaction: number;

  @ApiProperty({ description: 'Revenue generated' })
  revenueGenerated: number;
}

export class TimeAnalytics {
  @ApiProperty({ description: 'Peak hours data' })
  peakHours: {
    hour: number;
    orderCount: number;
    revenue: number;
    averageWaitTime: number;
  }[];

  @ApiProperty({ description: 'Day of week performance' })
  dayOfWeekPerformance: {
    day: string;
    orderCount: number;
    revenue: number;
    averageOrderValue: number;
  }[];

  @ApiProperty({ description: 'Busiest day of the period' })
  busiestDay: {
    date: string;
    orderCount: number;
    revenue: number;
  };

  @ApiProperty({ description: 'Slowest day of the period' })
  slowestDay: {
    date: string;
    orderCount: number;
    revenue: number;
  };
}

export class ProfitabilityMetrics {
  @ApiProperty({ description: 'Gross profit' })
  grossProfit: MetricValue;

  @ApiProperty({ description: 'Gross profit margin percentage' })
  grossProfitMargin: MetricValue;

  @ApiProperty({ description: 'Cost of goods sold' })
  costOfGoodsSold: MetricValue;

  @ApiProperty({ description: 'Operating expenses' })
  operatingExpenses: MetricValue;

  @ApiProperty({ description: 'Net profit' })
  netProfit: MetricValue;

  @ApiProperty({ description: 'Net profit margin percentage' })
  netProfitMargin: MetricValue;
}

export class ReportsMetricsDto {
  @ApiProperty({ description: 'Revenue-related metrics' })
  revenue: RevenueMetrics;

  @ApiProperty({ description: 'Order-related metrics' })
  orders: OrderMetrics;

  @ApiProperty({ description: 'Payment method metrics' })
  payments: PaymentMetrics;

  @ApiProperty({ type: [ChartData], description: 'Charts data for visualizations' })
  charts: ChartData[];

  @ApiProperty({ type: [TopMenuItem], description: 'Top performing menu items' })
  topMenuItems: TopMenuItem[];

  @ApiProperty({ type: [RecentOrder], description: 'Recent orders' })
  recentOrders: RecentOrder[];

  @ApiProperty({ type: [CategoryPerformance], description: 'Performance by category' })
  categoryPerformance: CategoryPerformance[];

  @ApiProperty({ description: 'Customer analytics' })
  customerAnalytics: CustomerAnalytics;

  @ApiProperty({ type: [StaffPerformance], description: 'Staff performance metrics' })
  staffPerformance: StaffPerformance[];

  @ApiProperty({ description: 'Time-based analytics' })
  timeAnalytics: TimeAnalytics;

  @ApiProperty({ description: 'Profitability metrics' })
  profitabilityMetrics: ProfitabilityMetrics;

  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: Date;

  @ApiProperty({ description: 'Data period information' })
  period: {
    from: Date;
    to: Date;
    label: string;
  };

  @ApiProperty({ description: 'Export options' })
  exportOptions: {
    pdf: boolean;
    excel: boolean;
    csv: boolean;
  };
}