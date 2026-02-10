export interface MetricValue {
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'same';
}

export interface RevenueMetrics {
  total: MetricValue;
  cash: MetricValue;
  upi: MetricValue;
  card: MetricValue;
  averageTicket: MetricValue;
  netRevenue: MetricValue;
  taxAmount: MetricValue;
  discountAmount: MetricValue;
}

export interface OrderMetrics {
  total: MetricValue;
  completed: MetricValue;
  pending: MetricValue;
  cancelled: MetricValue;
  averageCompletionTime: MetricValue;
  successRate: MetricValue;
  ordersPerHour: MetricValue;
}

export interface PaymentMetrics {
  cashCount: MetricValue;
  upiCount: MetricValue;
  cardCount: MetricValue;
  cashPercentage: number;
  upiPercentage: number;
  cardPercentage: number;
  averagePaymentTime: MetricValue;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface ChartData {
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  title: string;
  yAxisLabel?: string;
  colors?: string[];
}

export interface TopMenuItem {
  id: string;
  name: string;
  orderCount: number;
  revenue: number;
  category: string;
  profitMargin: number;
  averageRating?: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: Date;
  timeSinceOrdered: number;
  customerName?: string;
}

export interface CategoryPerformance {
  id: string;
  name: string;
  orderCount: number;
  revenue: number;
  revenuePercentage: number;
  averageItemPrice: number;
  topItem: {
    name: string;
    orderCount: number;
  };
}

export interface CustomerAnalytics {
  totalCustomers: MetricValue;
  newCustomers: MetricValue;
  returningCustomers: MetricValue;
  retentionRate: MetricValue;
  averageOrdersPerCustomer: MetricValue;
  customerLifetimeValue: MetricValue;
}

export interface StaffPerformance {
  id: string;
  name: string;
  ordersHandled: number;
  averageCompletionTime: number;
  customerSatisfaction: number;
  revenueGenerated: number;
}

export interface TimeAnalytics {
  peakHours: {
    hour: number;
    orderCount: number;
    revenue: number;
    averageWaitTime: number;
  }[];
  dayOfWeekPerformance: {
    day: string;
    orderCount: number;
    revenue: number;
    averageOrderValue: number;
  }[];
  busiestDay: {
    date: string;
    orderCount: number;
    revenue: number;
  };
  slowestDay: {
    date: string;
    orderCount: number;
    revenue: number;
  };
}

export interface ProfitabilityMetrics {
  grossProfit: MetricValue;
  grossProfitMargin: MetricValue;
  costOfGoodsSold: MetricValue;
  operatingExpenses: MetricValue;
  netProfit: MetricValue;
  netProfitMargin: MetricValue;
}

export interface ReportsMetrics {
  revenue: RevenueMetrics;
  orders: OrderMetrics;
  payments: PaymentMetrics;
  charts: ChartData[];
  topMenuItems: TopMenuItem[];
  recentOrders: RecentOrder[];
  categoryPerformance: CategoryPerformance[];
  customerAnalytics: CustomerAnalytics;
  staffPerformance: StaffPerformance[];
  timeAnalytics: TimeAnalytics;
  profitabilityMetrics: ProfitabilityMetrics;
  generatedAt: Date;
  period: {
    from: Date;
    to: Date;
    label: string;
  };
  exportOptions: {
    pdf: boolean;
    excel: boolean;
    csv: boolean;
  };
}

export interface ReportsQueryParams {
  period?: 'today' | '7d' | '30d' | '3m' | '1y';
  from?: string;
  to?: string;
  branchId?: string;
}

// Legacy interface for backward compatibility
export interface LegacyAnalyticsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    successRate: number;
    totalTax: number;
    totalDiscount: number;
  };
  trends: {
    revenueChange: number;
    ordersChange: number;
    avgOrderValueChange: number;
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
    amount: number;
  }>;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
    timesOrdered: number;
  }>;
  dailyPerformance: Array<{
    date: string;
    revenue: number;
    orders: number;
    avgOrder: number;
  }>;
}