import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { DashboardQueryDto, DashboardPeriod } from './dto/dashboard-query.dto';
import {
  DashboardMetricsDto,
  MetricValue,
  RevenueMetrics,
  OrderMetrics,
  PaymentMetrics,
  ChartData,
  ChartDataPoint,
  TopMenuItem,
  RecentOrder,
} from './dto/dashboard-metrics.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async getDashboardMetrics(
    restaurantId: string,
    query: DashboardQueryDto,
  ): Promise<DashboardMetricsDto> {
    const { from, to } = this.getDateRange(query);
    const { from: previousFrom, to: previousTo } = this.getPreviousDateRange(from, to);

    this.logger.log(`Generating dashboard metrics for restaurant ${restaurantId} from ${from.toISOString()} to ${to.toISOString()}`);

    // Build base filter
    const baseFilter = {
      restaurantId,
      isArchived: false,
      ...(query.branchId && { branchId: query.branchId }),
    };

    // Get current and previous period data in parallel
    const [
      currentOrders,
      previousOrders,
      recentOrdersData,
      topMenuItemsData,
      hourlyData,
    ] = await Promise.all([
      this.getOrdersInPeriod(baseFilter, from, to),
      this.getOrdersInPeriod(baseFilter, previousFrom, previousTo),
      this.getRecentOrders(baseFilter, 10),
      this.getTopMenuItems(baseFilter, from, to),
      this.getHourlyData(baseFilter, from, to),
    ]);

    // Calculate metrics
    const revenue = this.calculateRevenueMetrics(currentOrders, previousOrders);
    const orders = this.calculateOrderMetrics(currentOrders, previousOrders);
    const payments = this.calculatePaymentMetrics(currentOrders);
    const charts = this.generateChartData(currentOrders, hourlyData, from, to);
    const peakHours = this.calculatePeakHours(hourlyData);

    return {
      revenue,
      orders,
      payments,
      charts,
      topMenuItems: topMenuItemsData,
      recentOrders: recentOrdersData,
      peakHours,
      generatedAt: new Date(),
      period: {
        from,
        to,
        label: this.getPeriodLabel(query, from, to),
      },
    };
  }

  private async getOrdersInPeriod(
    baseFilter: any,
    from: Date,
    to: Date,
  ): Promise<OrderDocument[]> {
    return this.orderModel
      .find({
        ...baseFilter,
        createdAt: { $gte: from, $lte: to },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  private async getRecentOrders(
    baseFilter: any,
    limit: number,
  ): Promise<RecentOrder[]> {
    const orders = await this.orderModel
      .find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return orders.map((order) => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber || 'N/A',
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod.toUpperCase(),
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      timeSinceOrdered: Math.floor(
        (Date.now() - order.createdAt.getTime()) / (1000 * 60),
      ),
    }));
  }

  private async getTopMenuItems(
    baseFilter: any,
    from: Date,
    to: Date,
  ): Promise<TopMenuItem[]> {
    const pipeline = [
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: from, $lte: to },
          status: { $ne: OrderStatus.Cancelled },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            itemId: '$items.menuItemId',
            itemName: '$items.name',
            category: '$items.category',
          },
          orderCount: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
    ];

    const results = await this.orderModel.aggregate(pipeline).exec();

    return results.map((item) => ({
      id: item._id.itemId,
      name: item._id.itemName,
      category: item._id.category || 'Uncategorized',
      orderCount: item.orderCount,
      revenue: item.revenue,
    }));
  }

  private async getHourlyData(
    baseFilter: any,
    from: Date,
    to: Date,
  ): Promise<{ hour: number; orderCount: number; revenue: number }[]> {
    const pipeline = [
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: from, $lte: to },
          status: { $ne: OrderStatus.Cancelled },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id': 1 } },
    ];

    const results = await this.orderModel.aggregate(pipeline).exec();

    // Fill missing hours with 0
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const data = results.find((r) => r._id === hour);
      return {
        hour,
        orderCount: data?.orderCount || 0,
        revenue: data?.revenue || 0,
      };
    });

    return hourlyData;
  }

  private calculateRevenueMetrics(
    currentOrders: OrderDocument[],
    previousOrders: OrderDocument[],
  ): RevenueMetrics {
    const currentRevenue = this.calculateRevenueByType(currentOrders);
    const previousRevenue = this.calculateRevenueByType(previousOrders);

    return {
      total: this.createMetricValue(currentRevenue.total, previousRevenue.total),
      cash: this.createMetricValue(currentRevenue.cash, previousRevenue.cash),
      upi: this.createMetricValue(currentRevenue.upi, previousRevenue.upi),
      averageTicket: this.createMetricValue(
        currentOrders.length ? currentRevenue.total / currentOrders.length : 0,
        previousOrders.length ? previousRevenue.total / previousOrders.length : 0,
      ),
    };
  }

  private calculateOrderMetrics(
    currentOrders: OrderDocument[],
    previousOrders: OrderDocument[],
  ): OrderMetrics {
    const currentStats = this.calculateOrderStats(currentOrders);
    const previousStats = this.calculateOrderStats(previousOrders);

    return {
      total: this.createMetricValue(currentStats.total, previousStats.total),
      completed: this.createMetricValue(currentStats.completed, previousStats.completed),
      pending: this.createMetricValue(currentStats.pending, previousStats.pending),
      cancelled: this.createMetricValue(currentStats.cancelled, previousStats.cancelled),
      averageCompletionTime: this.createMetricValue(
        currentStats.averageCompletionTime,
        previousStats.averageCompletionTime,
      ),
    };
  }

  private calculatePaymentMetrics(orders: OrderDocument[]): PaymentMetrics {
    const cashOrders = orders.filter((o) => o.paymentMethod === 'cash');
    const upiOrders = orders.filter((o) => o.paymentMethod === 'upi');
    const totalOrders = orders.length;

    const cashCount = cashOrders.length;
    const upiCount = upiOrders.length;

    return {
      cashCount: this.createMetricValue(cashCount, 0), // No previous comparison for now
      upiCount: this.createMetricValue(upiCount, 0),
      cashPercentage: totalOrders ? (cashCount / totalOrders) * 100 : 0,
      upiPercentage: totalOrders ? (upiCount / totalOrders) * 100 : 0,
    };
  }

  private generateChartData(
    orders: OrderDocument[],
    hourlyData: { hour: number; orderCount: number; revenue: number }[],
    from: Date,
    to: Date,
  ): ChartData[] {
    const charts: ChartData[] = [];

    // Revenue over time chart
    const revenueChart: ChartData = {
      type: 'line',
      title: 'Revenue Over Time',
      yAxisLabel: 'Revenue (₹)',
      data: this.generateTimeSeriesData(orders, from, to, 'revenue'),
    };

    // Orders over time chart
    const ordersChart: ChartData = {
      type: 'area',
      title: 'Orders Over Time',
      yAxisLabel: 'Order Count',
      data: this.generateTimeSeriesData(orders, from, to, 'count'),
    };

    // Peak hours chart
    const peakHoursChart: ChartData = {
      type: 'bar',
      title: 'Orders by Hour',
      yAxisLabel: 'Order Count',
      data: hourlyData.map((h) => ({
        label: `${h.hour}:00`,
        value: h.orderCount,
        metadata: { revenue: h.revenue },
      })),
    };

    // Payment method distribution
    const paymentChart: ChartData = {
      type: 'pie',
      title: 'Payment Method Distribution',
      data: this.generatePaymentDistributionData(orders),
    };

    charts.push(revenueChart, ordersChart, peakHoursChart, paymentChart);
    return charts;
  }

  private generateTimeSeriesData(
    orders: OrderDocument[],
    from: Date,
    to: Date,
    type: 'revenue' | 'count',
  ): ChartDataPoint[] {
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      // Hourly data for same day
      return this.generateHourlyTimeSeriesData(orders, type);
    } else if (diffDays <= 31) {
      // Daily data for up to a month
      return this.generateDailyTimeSeriesData(orders, from, to, type);
    } else {
      // Weekly data for longer periods
      return this.generateWeeklyTimeSeriesData(orders, from, to, type);
    }
  }

  private generateHourlyTimeSeriesData(
    orders: OrderDocument[],
    type: 'revenue' | 'count',
  ): ChartDataPoint[] {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourOrders = orders.filter((o) => o.createdAt.getHours() === hour);
      const value = type === 'revenue'
        ? hourOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        : hourOrders.length;

      return {
        label: `${hour}:00`,
        value,
      };
    });

    return hourlyData;
  }

  private generateDailyTimeSeriesData(
    orders: OrderDocument[],
    from: Date,
    to: Date,
    type: 'revenue' | 'count',
  ): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const currentDate = new Date(from);

    while (currentDate <= to) {
      const dayOrders = orders.filter((o) => {
        const orderDate = o.createdAt.toDateString();
        return orderDate === currentDate.toDateString();
      });

      const value = type === 'revenue'
        ? dayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        : dayOrders.length;

      data.push({
        label: currentDate.toLocaleDateString(),
        value,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  private generateWeeklyTimeSeriesData(
    orders: OrderDocument[],
    from: Date,
    to: Date,
    type: 'revenue' | 'count',
  ): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const currentDate = new Date(from);

    // Start from the beginning of the week
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    while (currentDate <= to) {
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekOrders = orders.filter((o) => {
        return o.createdAt >= currentDate && o.createdAt <= weekEnd;
      });

      const value = type === 'revenue'
        ? weekOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        : weekOrders.length;

      data.push({
        label: `${currentDate.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
        value,
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return data;
  }

  private generatePaymentDistributionData(orders: OrderDocument[]): ChartDataPoint[] {
    const cashCount = orders.filter((o) => o.paymentMethod === 'cash').length;
    const upiCount = orders.filter((o) => o.paymentMethod === 'upi').length;

    return [
      { label: 'Cash', value: cashCount },
      { label: 'UPI', value: upiCount },
    ];
  }

  private calculateRevenueByType(orders: OrderDocument[]) {
    const completedOrders = orders.filter((o) => o.status !== OrderStatus.Cancelled);

    const total = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const cash = completedOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const upi = completedOrders
      .filter((o) => o.paymentMethod === 'upi')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return { total, cash, upi };
  }

  private calculateOrderStats(orders: OrderDocument[]) {
    const total = orders.length;
    const completed = orders.filter((o) => o.status === OrderStatus.Completed).length;
    const pending = orders.filter((o) => o.status === OrderStatus.Pending).length;
    const cancelled = orders.filter((o) => o.status === OrderStatus.Cancelled).length;

    // Calculate average completion time for completed orders
    const completedOrders = orders.filter((o) => o.status === OrderStatus.Completed);
    const averageCompletionTime = completedOrders.length
      ? completedOrders.reduce((sum, o) => {
          const completionTime = o.updatedAt.getTime() - o.createdAt.getTime();
          return sum + (completionTime / (1000 * 60)); // Convert to minutes
        }, 0) / completedOrders.length
      : 0;

    return { total, completed, pending, cancelled, averageCompletionTime };
  }

  private calculatePeakHours(hourlyData: { hour: number; orderCount: number; revenue: number }[]) {
    return hourlyData.sort((a, b) => b.orderCount - a.orderCount);
  }

  private createMetricValue(current: number, previous: number): MetricValue {
    const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'same';

    return {
      current: Math.round(current * 100) / 100,
      previous: Math.round(previous * 100) / 100,
      change: Math.round(change * 100) / 100,
      trend,
    };
  }

  private getDateRange(query: DashboardQueryDto): { from: Date; to: Date } {
    if (query.from && query.to) {
      return {
        from: new Date(query.from),
        to: new Date(query.to),
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (query.period) {
      case DashboardPeriod.TODAY:
        return {
          from: today,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        };
      case DashboardPeriod.WEEK:
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { from: weekAgo, to: now };
      case DashboardPeriod.MONTH:
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return { from: monthAgo, to: now };
      case DashboardPeriod.QUARTER:
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return { from: quarterAgo, to: now };
      case DashboardPeriod.YEAR:
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { from: yearAgo, to: now };
      default:
        return {
          from: today,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        };
    }
  }

  private getPreviousDateRange(from: Date, to: Date): { from: Date; to: Date } {
    const duration = to.getTime() - from.getTime();
    return {
      from: new Date(from.getTime() - duration),
      to: new Date(from.getTime()),
    };
  }

  private getPeriodLabel(query: DashboardQueryDto, from: Date, to: Date): string {
    if (query.from && query.to) {
      return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
    }

    switch (query.period) {
      case DashboardPeriod.TODAY:
        return 'Today';
      case DashboardPeriod.WEEK:
        return 'Last 7 days';
      case DashboardPeriod.MONTH:
        return 'Last 30 days';
      case DashboardPeriod.QUARTER:
        return 'Last 3 months';
      case DashboardPeriod.YEAR:
        return 'Last year';
      default:
        return 'Today';
    }
  }
}