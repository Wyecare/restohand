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
  averageTicket: MetricValue;
}

export interface OrderMetrics {
  total: MetricValue;
  completed: MetricValue;
  pending: MetricValue;
  cancelled: MetricValue;
  averageCompletionTime: MetricValue;
}

export interface PaymentMetrics {
  cashCount: MetricValue;
  upiCount: MetricValue;
  cashPercentage: number;
  upiPercentage: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface ChartData {
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  yAxisLabel?: string;
}

export interface TopMenuItem {
  id: string;
  name: string;
  orderCount: number;
  revenue: number;
  category: string;
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
}

export interface DashboardMetrics {
  revenue: RevenueMetrics;
  orders: OrderMetrics;
  payments: PaymentMetrics;
  charts: ChartData[];
  topMenuItems: TopMenuItem[];
  recentOrders: RecentOrder[];
  peakHours: {
    hour: number;
    orderCount: number;
    revenue: number;
  }[];
  generatedAt: Date;
  period: {
    from: Date;
    to: Date;
    label: string;
  };
}

export interface DashboardQueryParams {
  restaurantId: string;
  branchId?: string;
  period?: 'today' | '7d' | '30d' | '3m' | '1y';
  from?: string;
  to?: string;
}