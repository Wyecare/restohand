import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { ReportsQueryDto, ReportsPeriod } from './dto/reports-query.dto';
import {
  ReportsMetricsDto,
  MetricValue,
  RevenueMetrics,
  OrderMetrics,
  PaymentMetrics,
  ChartData,
  ChartDataPoint,
  TopMenuItem,
  RecentOrder,
  CategoryPerformance,
  CustomerAnalytics,
  StaffPerformance,
  TimeAnalytics,
  ProfitabilityMetrics,
} from './dto/reports-metrics.dto';
import * as puppeteer from 'puppeteer';


@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async getReportsMetrics(
    restaurantId: string,
    query: ReportsQueryDto,
  ): Promise<ReportsMetricsDto> {
    const { from, to } = this.getDateRange(query);
    const { from: previousFrom, to: previousTo } = this.getPreviousDateRange(from, to);

    this.logger.log(`Generating reports metrics for restaurant ${restaurantId} from ${from.toISOString()} to ${to.toISOString()}`);

    // Build base filter with proper ObjectId conversion
    const baseFilter = {
      restaurantId: new Types.ObjectId(restaurantId),
      isArchived: false,
      ...(query.branchId && { branchId: new Types.ObjectId(query.branchId) }),
    };

    // Get current and previous period data in parallel
    const [
      currentOrders,
      previousOrders,
      recentOrdersData,
      topMenuItemsData,
      hourlyData,
      categoryData,
    ] = await Promise.all([
      this.getOrdersInPeriod(baseFilter, from, to),
      this.getOrdersInPeriod(baseFilter, previousFrom, previousTo),
      this.getRecentOrders(baseFilter, 15),
      this.getTopMenuItems(baseFilter, from, to),
      this.getHourlyData(baseFilter, from, to),
      this.getCategoryPerformance(baseFilter, from, to),
    ]);

    // Calculate all metrics
    const revenue = this.calculateRevenueMetrics(currentOrders, previousOrders);
    const orders = this.calculateOrderMetrics(currentOrders, previousOrders);
    const payments = this.calculatePaymentMetrics(currentOrders, previousOrders);
    const charts = this.generateReportsChartData(currentOrders, hourlyData, from, to);
    const timeAnalytics = this.calculateTimeAnalytics(currentOrders, hourlyData);
    const customerAnalytics = this.calculateCustomerAnalytics(currentOrders, previousOrders);
    const profitabilityMetrics = this.calculateProfitabilityMetrics(currentOrders, previousOrders);
    const staffPerformance = this.calculateStaffPerformance(currentOrders);

    return {
      revenue,
      orders,
      payments,
      charts,
      topMenuItems: topMenuItemsData,
      recentOrders: recentOrdersData,
      categoryPerformance: categoryData,
      customerAnalytics,
      staffPerformance,
      timeAnalytics,
      profitabilityMetrics,
      generatedAt: new Date(),
      period: {
        from,
        to,
        label: this.getPeriodLabel(query, from, to),
      },
      exportOptions: {
        pdf: true,
        excel: true,
        csv: true,
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
      paymentMethod: order.paymentMethod?.toUpperCase() || 'N/A',
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      timeSinceOrdered: Math.floor(
        (Date.now() - order.createdAt.getTime()) / (1000 * 60),
      ),
      customerName: order.customerName,
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
          paymentStatus: PaymentStatus.Paid,
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
          totalCost: { $sum: { $multiply: ['$items.cost', '$items.quantity'] } },
        },
      },
      {
        $addFields: {
          profitMargin: {
            $cond: {
              if: { $gt: ['$revenue', 0] },
              then: { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$totalCost'] }, '$revenue'] }, 100] },
              else: 0,
            },
          },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 15 },
    ];

    const results = await this.orderModel.aggregate(pipeline).exec();

    return results.map((item) => ({
      id: item._id.itemId,
      name: item._id.itemName,
      category: item._id.category || 'Uncategorized',
      orderCount: item.orderCount,
      revenue: item.revenue,
      profitMargin: item.profitMargin || 0,
    }));
  }

  private async getHourlyData(
    baseFilter: any,
    from: Date,
    to: Date,
  ): Promise<{ hour: number; orderCount: number; revenue: number; averageWaitTime: number }[]> {
    const pipeline = [
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: from, $lte: to },
          status: { $ne: OrderStatus.Cancelled },
          paymentStatus: PaymentStatus.Paid,
        },
      },
      {
        $addFields: {
          waitTime: {
            $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60],
          },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          totalWaitTime: { $sum: '$waitTime' },
        },
      },
      {
        $addFields: {
          averageWaitTime: {
            $divide: ['$totalWaitTime', '$orderCount'],
          },
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
        averageWaitTime: data?.averageWaitTime || 0,
      };
    });

    return hourlyData;
  }

  private async getCategoryPerformance(
    baseFilter: any,
    from: Date,
    to: Date,
  ): Promise<CategoryPerformance[]> {
    const pipeline = [
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: from, $lte: to },
          status: { $ne: OrderStatus.Cancelled },
          paymentStatus: PaymentStatus.Paid,
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          orderCount: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          itemCount: { $sum: 1 },
          items: {
            $push: {
              name: '$items.name',
              quantity: '$items.quantity',
            },
          },
        },
      },
      {
        $addFields: {
          averageItemPrice: { $divide: ['$revenue', '$orderCount'] },
        },
      },
      { $sort: { revenue: -1 } },
    ];

    const results = await this.orderModel.aggregate(pipeline).exec();
    const totalRevenue = results.reduce((sum, cat) => sum + cat.revenue, 0);

    return results.map((category) => {
      // Find top item in category
      const itemCounts = category.items.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
      }, {});

      const topItemEntry = Object.entries(itemCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0];

      return {
        id: category._id || 'uncategorized',
        name: category._id || 'Uncategorized',
        orderCount: category.orderCount,
        revenue: category.revenue,
        revenuePercentage: totalRevenue ? (category.revenue / totalRevenue) * 100 : 0,
        averageItemPrice: category.averageItemPrice,
        topItem: {
          name: topItemEntry?.[0] || 'N/A',
          orderCount: topItemEntry?.[1] as number || 0,
        },
      };
    });
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
      card: this.createMetricValue(currentRevenue.card, previousRevenue.card),
      averageTicket: this.createMetricValue(
        currentOrders.length ? currentRevenue.total / currentOrders.length : 0,
        previousOrders.length ? previousRevenue.total / previousOrders.length : 0,
      ),
      netRevenue: this.createMetricValue(
        currentRevenue.total - currentRevenue.discount,
        previousRevenue.total - previousRevenue.discount,
      ),
      taxAmount: this.createMetricValue(currentRevenue.tax, previousRevenue.tax),
      discountAmount: this.createMetricValue(currentRevenue.discount, previousRevenue.discount),
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
      successRate: this.createMetricValue(
        currentStats.total ? (currentStats.completed / currentStats.total) * 100 : 0,
        previousStats.total ? (previousStats.completed / previousStats.total) * 100 : 0,
      ),
      ordersPerHour: this.createMetricValue(
        currentStats.ordersPerHour,
        previousStats.ordersPerHour,
      ),
    };
  }

  private calculatePaymentMetrics(
    currentOrders: OrderDocument[],
    previousOrders: OrderDocument[],
  ): PaymentMetrics {
    const currentPayments = this.calculatePaymentStats(currentOrders);
    const previousPayments = this.calculatePaymentStats(previousOrders);

    const totalCurrent = currentPayments.cash + currentPayments.upi + currentPayments.card;
    const totalPrevious = previousPayments.cash + previousPayments.upi + previousPayments.card;

    return {
      cashCount: this.createMetricValue(currentPayments.cash, previousPayments.cash),
      upiCount: this.createMetricValue(currentPayments.upi, previousPayments.upi),
      cardCount: this.createMetricValue(currentPayments.card, previousPayments.card),
      cashPercentage: totalCurrent ? (currentPayments.cash / totalCurrent) * 100 : 0,
      upiPercentage: totalCurrent ? (currentPayments.upi / totalCurrent) * 100 : 0,
      cardPercentage: totalCurrent ? (currentPayments.card / totalCurrent) * 100 : 0,
      averagePaymentTime: this.createMetricValue(
        currentPayments.averagePaymentTime,
        previousPayments.averagePaymentTime,
      ),
    };
  }

  private generateReportsChartData(
    orders: OrderDocument[],
    hourlyData: { hour: number; orderCount: number; revenue: number; averageWaitTime: number }[],
    from: Date,
    to: Date,
  ): ChartData[] {
    const charts: ChartData[] = [];

    // Revenue over time chart
    const revenueChart: ChartData = {
      type: 'area',
      title: 'Revenue Trend',
      yAxisLabel: 'Revenue (₹)',
      data: hourlyData.map((h) => ({
        label: `${h.hour}:00`,
        value: h.revenue,
      })),
      colors: ['#3b82f6', '#06b6d4'],
    };

    // Orders over time chart
    const ordersChart: ChartData = {
      type: 'line',
      title: 'Order Volume',
      yAxisLabel: 'Order Count',
      data: hourlyData.map((h) => ({
        label: `${h.hour}:00`,
        value: h.orderCount,
      })),
      colors: ['#10b981', '#059669'],
    };

    // Peak hours chart
    const peakHoursChart: ChartData = {
      type: 'bar',
      title: 'Orders by Hour',
      yAxisLabel: 'Order Count',
      data: hourlyData.map((h) => ({
        label: `${h.hour}:00`,
        value: h.orderCount,
        metadata: { revenue: h.revenue, waitTime: h.averageWaitTime },
      })),
      colors: ['#8b5cf6', '#7c3aed'],
    };

    // Payment method distribution
    const paymentChart: ChartData = {
      type: 'donut',
      title: 'Payment Methods',
      data: this.generatePaymentDistributionData(orders),
      colors: ['#f59e0b', '#ef4444', '#06b6d4', '#10b981'],
    };

    // Average order value over time
    const avgOrderChart: ChartData = {
      type: 'line',
      title: 'Average Order Value Trend',
      yAxisLabel: 'Average Value (₹)',
      data: this.generateTimeSeriesData(orders, from, to, 'avgOrder'),
      colors: ['#f59e0b', '#d97706'],
    };

    // Wait time analysis
    const waitTimeChart: ChartData = {
      type: 'bar',
      title: 'Average Wait Time by Hour',
      yAxisLabel: 'Minutes',
      data: hourlyData.map((h) => ({
        label: `${h.hour}:00`,
        value: h.averageWaitTime,
        metadata: { orderCount: h.orderCount },
      })),
      colors: ['#ec4899', '#db2777'],
    };

    charts.push(revenueChart, ordersChart, peakHoursChart, paymentChart, avgOrderChart, waitTimeChart);
    return charts;
  }

  private calculateTimeAnalytics(
    orders: OrderDocument[],
    hourlyData: { hour: number; orderCount: number; revenue: number; averageWaitTime: number }[],
  ): TimeAnalytics {
    // Calculate peak hours
    const peakHours = hourlyData.sort((a, b) => b.orderCount - a.orderCount);

    // Calculate day of week performance
    const dayStats = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    orders.forEach(order => {
      const dayIndex = order.createdAt.getDay();
      const dayName = dayNames[dayIndex];
      if (!dayStats[dayName]) {
        dayStats[dayName] = { orderCount: 0, revenue: 0, totalAmount: 0 };
      }
      dayStats[dayName].orderCount++;
      if (order.paymentStatus === PaymentStatus.Paid) {
        dayStats[dayName].revenue += order.totalAmount;
        dayStats[dayName].totalAmount += order.totalAmount;
      }
    });

    const dayOfWeekPerformance = Object.entries(dayStats).map(([day, stats]: [string, any]) => ({
      day,
      orderCount: stats.orderCount,
      revenue: stats.revenue,
      averageOrderValue: stats.orderCount ? stats.revenue / stats.orderCount : 0,
    }));

    // Find busiest and slowest days
    const dailyStats = {};
    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { orderCount: 0, revenue: 0 };
      }
      dailyStats[dateKey].orderCount++;
      if (order.paymentStatus === PaymentStatus.Paid) {
        dailyStats[dateKey].revenue += order.totalAmount;
      }
    });

    const dailyEntries = Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
      date,
      orderCount: stats.orderCount,
      revenue: stats.revenue,
    }));

    const busiestDay = dailyEntries.reduce((max, day) =>
      day.orderCount > max.orderCount ? day : max,
      { date: '', orderCount: 0, revenue: 0 }
    );

    const slowestDay = dailyEntries.reduce((min, day) =>
      day.orderCount < min.orderCount ? day : min,
      { date: '', orderCount: Infinity, revenue: 0 }
    );

    return {
      peakHours,
      dayOfWeekPerformance,
      busiestDay,
      slowestDay: slowestDay.orderCount === Infinity ? { date: '', orderCount: 0, revenue: 0 } : slowestDay,
    };
  }

  private calculateCustomerAnalytics(
    currentOrders: OrderDocument[],
    previousOrders: OrderDocument[],
  ): CustomerAnalytics {
    const currentCustomers = new Set(currentOrders.filter(o => o.customerName).map(o => o.customerName));
    const previousCustomers = new Set(previousOrders.filter(o => o.customerName).map(o => o.customerName));

    const newCustomers = new Set([...currentCustomers].filter(c => !previousCustomers.has(c)));
    const returningCustomers = new Set([...currentCustomers].filter(c => previousCustomers.has(c)));

    const currentOrdersPerCustomer = currentCustomers.size ? currentOrders.length / currentCustomers.size : 0;
    const previousOrdersPerCustomer = previousCustomers.size ? previousOrders.length / previousCustomers.size : 0;

    return {
      totalCustomers: this.createMetricValue(currentCustomers.size, previousCustomers.size),
      newCustomers: this.createMetricValue(newCustomers.size, 0),
      returningCustomers: this.createMetricValue(returningCustomers.size, 0),
      retentionRate: this.createMetricValue(
        currentCustomers.size ? (returningCustomers.size / currentCustomers.size) * 100 : 0,
        previousCustomers.size ? (returningCustomers.size / previousCustomers.size) * 100 : 0,
      ),
      averageOrdersPerCustomer: this.createMetricValue(currentOrdersPerCustomer, previousOrdersPerCustomer),
      customerLifetimeValue: this.createMetricValue(
        currentCustomers.size ? currentOrders.reduce((sum, o) => sum + o.totalAmount, 0) / currentCustomers.size : 0,
        previousCustomers.size ? previousOrders.reduce((sum, o) => sum + o.totalAmount, 0) / previousCustomers.size : 0,
      ),
    };
  }

  private calculateProfitabilityMetrics(
    currentOrders: OrderDocument[],
    previousOrders: OrderDocument[],
  ): ProfitabilityMetrics {
    const currentProfit = this.calculateProfitStats(currentOrders);
    const previousProfit = this.calculateProfitStats(previousOrders);

    return {
      grossProfit: this.createMetricValue(currentProfit.gross, previousProfit.gross),
      grossProfitMargin: this.createMetricValue(currentProfit.grossMargin, previousProfit.grossMargin),
      costOfGoodsSold: this.createMetricValue(currentProfit.cogs, previousProfit.cogs),
      operatingExpenses: this.createMetricValue(currentProfit.opex, previousProfit.opex),
      netProfit: this.createMetricValue(currentProfit.net, previousProfit.net),
      netProfitMargin: this.createMetricValue(currentProfit.netMargin, previousProfit.netMargin),
    };
  }

  private calculateStaffPerformance(orders: OrderDocument[]): StaffPerformance[] {
    const staffStats = {};

    orders.forEach(order => {
      const staffId = order.assignedStaff || 'unassigned';
      const staffName = order.staffName || 'Unassigned';

      if (!staffStats[staffId]) {
        staffStats[staffId] = {
          id: staffId,
          name: staffName,
          ordersHandled: 0,
          totalCompletionTime: 0,
          completedOrders: 0,
          revenue: 0,
          ratings: [],
        };
      }

      staffStats[staffId].ordersHandled++;
      if (order.paymentStatus === PaymentStatus.Paid) {
        staffStats[staffId].revenue += order.totalAmount;
      }

      if (order.status === OrderStatus.Completed && order.updatedAt) {
        const completionTime = (order.updatedAt.getTime() - order.createdAt.getTime()) / (1000 * 60);
        staffStats[staffId].totalCompletionTime += completionTime;
        staffStats[staffId].completedOrders++;
      }

      if (order.customerRating) {
        staffStats[staffId].ratings.push(order.customerRating);
      }
    });

    return Object.values(staffStats).map((staff: any) => ({
      id: staff.id,
      name: staff.name,
      ordersHandled: staff.ordersHandled,
      averageCompletionTime: staff.completedOrders ? staff.totalCompletionTime / staff.completedOrders : 0,
      customerSatisfaction: staff.ratings.length ?
        staff.ratings.reduce((sum, rating) => sum + rating, 0) / staff.ratings.length : 0,
      revenueGenerated: staff.revenue,
    }));
  }

  // Helper methods
  private calculateRevenueByType(orders: OrderDocument[]) {
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.Paid);

    const total = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const cash = paidOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const upi = paidOrders
      .filter((o) => o.paymentMethod === 'upi')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const card = paidOrders
      .filter((o) => o.paymentMethod === 'card')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const tax = paidOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
    const discount = paidOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);

    return { total, cash, upi, card, tax, discount };
  }

  private calculateOrderStats(orders: OrderDocument[]) {
    const total = orders.length;
    const completed = orders.filter((o) => o.status === OrderStatus.Completed).length;
    const pending = orders.filter((o) => o.status === OrderStatus.Pending).length;
    const cancelled = orders.filter((o) => o.status === OrderStatus.Cancelled).length;

    const completedOrders = orders.filter((o) => o.status === OrderStatus.Completed && o.updatedAt);
    const averageCompletionTime = completedOrders.length
      ? completedOrders.reduce((sum, o) => {
          const completionTime = o.updatedAt.getTime() - o.createdAt.getTime();
          return sum + (completionTime / (1000 * 60));
        }, 0) / completedOrders.length
      : 0;

    const ordersPerHour = total > 0 ? total / 24 : 0; // Simplified calculation

    return { total, completed, pending, cancelled, averageCompletionTime, ordersPerHour };
  }

  private calculatePaymentStats(orders: OrderDocument[]) {
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.Paid);

    const cash = paidOrders.filter((o) => o.paymentMethod === 'cash').length;
    const upi = paidOrders.filter((o) => o.paymentMethod === 'upi').length;
    const card = paidOrders.filter((o) => o.paymentMethod === 'card').length;

    const averagePaymentTime = paidOrders.length > 0
      ? paidOrders.reduce((sum, order) => {
          const paymentTime = order.paidAt && order.createdAt
            ? (order.paidAt.getTime() - order.createdAt.getTime()) / (1000 * 60)
            : 5; // Default 5 minutes if no paidAt timestamp
          return sum + paymentTime;
        }, 0) / paidOrders.length
      : 0;

    return { cash, upi, card, averagePaymentTime };
  }

  private calculateProfitStats(orders: OrderDocument[]) {
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.Paid);

    const revenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const cogs = paidOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => {
        return itemSum + (item.cost || item.price * 0.4) * item.quantity; // 40% cost assumption if not available
      }, 0);
    }, 0);

    const gross = revenue - cogs;
    const grossMargin = revenue > 0 ? (gross / revenue) * 100 : 0;

    const opex = revenue * 0.2; // 20% operating expense assumption
    const net = gross - opex;
    const netMargin = revenue > 0 ? (net / revenue) * 100 : 0;

    return { gross, grossMargin, cogs, opex, net, netMargin };
  }

  private generateTimeSeriesData(
    orders: OrderDocument[],
    from: Date,
    to: Date,
    type: 'revenue' | 'count' | 'avgOrder',
  ): ChartDataPoint[] {
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return this.generateHourlyTimeSeriesData(orders, type);
    } else if (diffDays <= 31) {
      return this.generateDailyTimeSeriesData(orders, from, to, type);
    } else {
      return this.generateWeeklyTimeSeriesData(orders, from, to, type);
    }
  }

  private generateHourlyTimeSeriesData(
    orders: OrderDocument[],
    type: 'revenue' | 'count' | 'avgOrder',
  ): ChartDataPoint[] {
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.Paid);

    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourOrders = paidOrders.filter((o) => o.createdAt.getHours() === hour);
      const revenue = hourOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const count = hourOrders.length;

      let value = 0;
      if (type === 'revenue') value = revenue;
      else if (type === 'count') value = count;
      else if (type === 'avgOrder') value = count > 0 ? revenue / count : 0;

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
    type: 'revenue' | 'count' | 'avgOrder',
  ): ChartDataPoint[] {
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.Paid);
    const data: ChartDataPoint[] = [];
    const currentDate = new Date(from);

    while (currentDate <= to) {
      const dayOrders = paidOrders.filter((o) => {
        const orderDate = o.createdAt.toDateString();
        return orderDate === currentDate.toDateString();
      });

      const revenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const count = dayOrders.length;

      let value = 0;
      if (type === 'revenue') value = revenue;
      else if (type === 'count') value = count;
      else if (type === 'avgOrder') value = count > 0 ? revenue / count : 0;

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
    type: 'revenue' | 'count' | 'avgOrder',
  ): ChartDataPoint[] {
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.Paid);
    const data: ChartDataPoint[] = [];
    const currentDate = new Date(from);

    currentDate.setDate(currentDate.getDate() - currentDate.getDay());

    while (currentDate <= to) {
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekOrders = paidOrders.filter((o) => {
        return o.createdAt >= currentDate && o.createdAt <= weekEnd;
      });

      const revenue = weekOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const count = weekOrders.length;

      let value = 0;
      if (type === 'revenue') value = revenue;
      else if (type === 'count') value = count;
      else if (type === 'avgOrder') value = count > 0 ? revenue / count : 0;

      data.push({
        label: `${currentDate.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
        value,
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return data;
  }

  private generatePaymentDistributionData(orders: OrderDocument[]): ChartDataPoint[] {
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.Paid);
    const cashCount = paidOrders.filter((o) => o.paymentMethod === 'cash').length;
    const upiCount = paidOrders.filter((o) => o.paymentMethod === 'upi').length;
    const cardCount = paidOrders.filter((o) => o.paymentMethod === 'card').length;

    return [
      { label: 'Cash', value: cashCount },
      { label: 'UPI', value: upiCount },
      { label: 'Card', value: cardCount },
    ].filter(item => item.value > 0);
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

  private getDateRange(query: ReportsQueryDto): { from: Date; to: Date } {
    if (query.from && query.to) {
      return {
        from: new Date(query.from),
        to: new Date(query.to),
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (query.period) {
      case ReportsPeriod.TODAY:
        return {
          from: today,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        };
      case ReportsPeriod.WEEK:
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { from: weekAgo, to: now };
      case ReportsPeriod.MONTH:
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return { from: monthAgo, to: now };
      case ReportsPeriod.QUARTER:
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return { from: quarterAgo, to: now };
      case ReportsPeriod.YEAR:
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

  private getPeriodLabel(query: ReportsQueryDto, from: Date, to: Date): string {
    if (query.from && query.to) {
      return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
    }

    switch (query.period) {
      case ReportsPeriod.TODAY:
        return 'Today';
      case ReportsPeriod.WEEK:
        return 'Last 7 days';
      case ReportsPeriod.MONTH:
        return 'Last 30 days';
      case ReportsPeriod.QUARTER:
        return 'Last 3 months';
      case ReportsPeriod.YEAR:
        return 'Last year';
      default:
        return 'Last 30 days';
    }
  }

  async generateOptimizedPdfReport(
    restaurantId: string,
    query: ReportsQueryDto,
  ): Promise<Buffer> {
    try {
      this.logger.log(`Generating PDF report for restaurant ${restaurantId}`);

      const metrics = await this.getReportsMetrics(restaurantId, query);
      const htmlContent = this.generateEnhancedReportHtml(metrics);

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-extensions',
          '--no-first-run',
        ],
        timeout: 30000,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800 });

      // Set content with optimized loading
      await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      // Generate PDF with optimized settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; margin: 0 auto; color: #666;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
        margin: {
          top: '25mm',
          bottom: '25mm',
          left: '20mm',
          right: '20mm',
        },
        preferCSSPageSize: true,
      });

      await browser.close();

      this.logger.log('PDF report generated successfully');
      return pdfBuffer;
    } catch (error) {
      this.logger.error('Failed to generate PDF report', error);
      throw error;
    }
  }

  private generateEnhancedReportHtml(metrics: ReportsMetricsDto): string {
    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const formatDate = (date: Date) => date.toLocaleDateString('en-IN');
    const formatPercent = (value: number) => `${value.toFixed(1)}%`;
    const getTrendIcon = (trend: string) => {
      switch(trend) {
        case 'up': return '📈';
        case 'down': return '📉';
        default: return '➡️';
      }
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Comprehensive Restaurant Report</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1f2937;
          line-height: 1.6;
          background: #f8fafc;
          padding: 20px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px;
          text-align: center;
        }

        .header h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .period-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          margin-top: 10px;
        }

        .content {
          padding: 40px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .metric-card {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 12px;
          padding: 25px;
          border-left: 5px solid;
          position: relative;
          overflow: hidden;
        }

        .metric-card.revenue { border-left-color: #3b82f6; }
        .metric-card.orders { border-left-color: #10b981; }
        .metric-card.payment { border-left-color: #f59e0b; }
        .metric-card.profit { border-left-color: #8b5cf6; }

        .metric-card h3 {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 8px;
        }

        .metric-change {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .change-positive { color: #059669; }
        .change-negative { color: #dc2626; }
        .change-neutral { color: #6b7280; }

        .section {
          margin-bottom: 40px;
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .section h2 {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
        }

        th, td {
          padding: 15px 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        th {
          background: #f9fafb;
          font-weight: 700;
          color: #374151;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        tr:hover {
          background: #f9fafb;
        }

        .chart-placeholder {
          height: 200px;
          background: linear-gradient(45deg, #f3f4f6, #e5e7eb);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-style: italic;
          margin: 20px 0;
        }

        .performance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
          margin: 20px 0;
        }

        .performance-card {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .performance-card h4 {
          color: #374151;
          margin-bottom: 10px;
          font-size: 16px;
        }

        .performance-value {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .category-list {
          display: grid;
          gap: 15px;
        }

        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #10b981;
        }

        .category-info h4 {
          margin-bottom: 5px;
          color: #111827;
        }

        .category-stats {
          font-size: 12px;
          color: #6b7280;
        }

        .category-revenue {
          font-size: 18px;
          font-weight: 700;
          color: #10b981;
        }

        .footer {
          background: #1f2937;
          color: white;
          padding: 30px;
          text-align: center;
        }

        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .export-info {
          background: rgba(255,255,255,0.1);
          padding: 10px 15px;
          border-radius: 6px;
          font-size: 12px;
        }

        @media print {
          body { background: white; padding: 0; }
          .container { box-shadow: none; }
        }

        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Comprehensive Restaurant Report</h1>
          <div class="period-badge">
            ${metrics.period.label} (${formatDate(metrics.period.from)} - ${formatDate(metrics.period.to)})
          </div>
        </div>

        <div class="content">
          <!-- Revenue Metrics -->
          <div class="metrics-grid">
            <div class="metric-card revenue">
              <h3>Total Revenue</h3>
              <div class="metric-value">${formatCurrency(metrics.revenue.total.current)}</div>
              <div class="metric-change change-${metrics.revenue.total.trend === 'up' ? 'positive' : metrics.revenue.total.trend === 'down' ? 'negative' : 'neutral'}">
                ${getTrendIcon(metrics.revenue.total.trend)} ${formatPercent(Math.abs(metrics.revenue.total.change))}
              </div>
            </div>

            <div class="metric-card orders">
              <h3>Total Orders</h3>
              <div class="metric-value">${metrics.orders.total.current}</div>
              <div class="metric-change change-${metrics.orders.total.trend === 'up' ? 'positive' : metrics.orders.total.trend === 'down' ? 'negative' : 'neutral'}">
                ${getTrendIcon(metrics.orders.total.trend)} ${formatPercent(Math.abs(metrics.orders.total.change))}
              </div>
            </div>

            <div class="metric-card payment">
              <h3>Average Ticket</h3>
              <div class="metric-value">${formatCurrency(metrics.revenue.averageTicket.current)}</div>
              <div class="metric-change change-${metrics.revenue.averageTicket.trend === 'up' ? 'positive' : metrics.revenue.averageTicket.trend === 'down' ? 'negative' : 'neutral'}">
                ${getTrendIcon(metrics.revenue.averageTicket.trend)} ${formatPercent(Math.abs(metrics.revenue.averageTicket.change))}
              </div>
            </div>

            <div class="metric-card profit">
              <h3>Success Rate</h3>
              <div class="metric-value">${formatPercent(metrics.orders.successRate.current)}</div>
              <div class="metric-change change-${metrics.orders.successRate.trend === 'up' ? 'positive' : metrics.orders.successRate.trend === 'down' ? 'negative' : 'neutral'}">
                ${getTrendIcon(metrics.orders.successRate.trend)} ${formatPercent(Math.abs(metrics.orders.successRate.change))}
              </div>
            </div>
          </div>

          <!-- Performance Analysis -->
          <div class="section">
            <h2>💰 Revenue Analysis</h2>
            <div class="performance-grid">
              <div class="performance-card">
                <h4>Cash Revenue</h4>
                <div class="performance-value">${formatCurrency(metrics.revenue.cash.current)}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  ${formatPercent(metrics.payments.cashPercentage)} of payments
                </div>
              </div>
              <div class="performance-card">
                <h4>UPI Revenue</h4>
                <div class="performance-value">${formatCurrency(metrics.revenue.upi.current)}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  ${formatPercent(metrics.payments.upiPercentage)} of payments
                </div>
              </div>
              <div class="performance-card">
                <h4>Card Revenue</h4>
                <div class="performance-value">${formatCurrency(metrics.revenue.card.current)}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  ${formatPercent(metrics.payments.cardPercentage)} of payments
                </div>
              </div>
              <div class="performance-card">
                <h4>Net Revenue</h4>
                <div class="performance-value">${formatCurrency(metrics.revenue.netRevenue.current)}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  After ${formatCurrency(metrics.revenue.discountAmount.current)} discounts
                </div>
              </div>
            </div>
          </div>

          <!-- Top Menu Items -->
          <div class="section">
            <h2>🏆 Top Performing Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.topMenuItems.slice(0, 10).map((item, index) => `
                  <tr>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.category}</td>
                    <td>${item.orderCount}</td>
                    <td>${formatCurrency(item.revenue)}</td>
                    <td>${formatPercent(item.profitMargin)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="page-break"></div>

          <!-- Category Performance -->
          <div class="section">
            <h2>📊 Category Performance</h2>
            <div class="category-list">
              ${metrics.categoryPerformance.slice(0, 8).map(category => `
                <div class="category-item">
                  <div class="category-info">
                    <h4>${category.name}</h4>
                    <div class="category-stats">
                      ${category.orderCount} orders • Average: ${formatCurrency(category.averageItemPrice)} •
                      Top: ${category.topItem.name} (${category.topItem.orderCount} orders)
                    </div>
                  </div>
                  <div class="category-revenue">
                    ${formatCurrency(category.revenue)}
                    <div style="font-size: 12px; color: #6b7280;">
                      ${formatPercent(category.revenuePercentage)}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Time Analysis -->
          <div class="section">
            <h2>⏰ Time Performance Analysis</h2>
            <div class="performance-grid">
              <div class="performance-card">
                <h4>Busiest Day</h4>
                <div class="performance-value">${new Date(metrics.timeAnalytics.busiestDay.date).toLocaleDateString()}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  ${metrics.timeAnalytics.busiestDay.orderCount} orders, ${formatCurrency(metrics.timeAnalytics.busiestDay.revenue)}
                </div>
              </div>
              <div class="performance-card">
                <h4>Peak Hour</h4>
                <div class="performance-value">${metrics.timeAnalytics.peakHours[0]?.hour || 0}:00</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  ${metrics.timeAnalytics.peakHours[0]?.orderCount || 0} orders average
                </div>
              </div>
              <div class="performance-card">
                <h4>Avg Wait Time</h4>
                <div class="performance-value">${(metrics.timeAnalytics.peakHours[0]?.averageWaitTime || 0).toFixed(1)} min</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  During peak hours
                </div>
              </div>
              <div class="performance-card">
                <h4>Orders/Hour</h4>
                <div class="performance-value">${metrics.orders.ordersPerHour.current.toFixed(1)}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  Average throughout day
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="section">
            <h2>📋 Recent Orders</h2>
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Table</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.recentOrders.slice(0, 10).map(order => `
                  <tr>
                    <td><strong>${order.orderNumber}</strong></td>
                    <td>${order.tableNumber}</td>
                    <td><span style="padding: 2px 8px; border-radius: 4px; font-size: 12px;
                         background: ${order.status === 'completed' ? '#dcfce7; color: #166534' :
                                     order.status === 'pending' ? '#fef3c7; color: #92400e' : '#fee2e2; color: #dc2626'}">
                         ${order.status.toUpperCase()}
                        </span></td>
                    <td>${order.paymentMethod}</td>
                    <td>${formatCurrency(order.totalAmount)}</td>
                    <td>${order.timeSinceOrdered} min ago</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Profitability Analysis -->
          <div class="section">
            <h2>💼 Profitability Analysis</h2>
            <div class="performance-grid">
              <div class="performance-card">
                <h4>Gross Profit</h4>
                <div class="performance-value">${formatCurrency(metrics.profitabilityMetrics.grossProfit.current)}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  ${formatPercent(metrics.profitabilityMetrics.grossProfitMargin.current)} margin
                </div>
              </div>
              <div class="performance-card">
                <h4>Cost of Goods</h4>
                <div class="performance-value">${formatCurrency(metrics.profitabilityMetrics.costOfGoodsSold.current)}</div>
              </div>
              <div class="performance-card">
                <h4>Net Profit</h4>
                <div class="performance-value">${formatCurrency(metrics.profitabilityMetrics.netProfit.current)}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                  ${formatPercent(metrics.profitabilityMetrics.netProfitMargin.current)} margin
                </div>
              </div>
              <div class="performance-card">
                <h4>Operating Expenses</h4>
                <div class="performance-value">${formatCurrency(metrics.profitabilityMetrics.operatingExpenses.current)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-content">
            <div>
              <strong>RestoHand Analytics</strong><br>
              Generated on ${new Date().toLocaleString('en-IN')}
            </div>
            <div class="export-info">
              Report ID: RPT-${Date.now()}<br>
              Format: PDF • Version: 2.0
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}