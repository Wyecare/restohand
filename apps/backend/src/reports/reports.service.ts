import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import puppeteer from 'puppeteer';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { OrderStatus } from '../common/enums/order-status.enum';

interface AnalyticsData {
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

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  async getAnalytics(restaurantId: string, startDate: Date, endDate: Date, branchId?: string): Promise<AnalyticsData> {
    // Build query - if branchId is provided, filter by branch; otherwise get all orders
    const baseQuery: any = {
      restaurantId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Add branch filter only if branchId is specified (main branch users see combined data)
    if (branchId) {
      // Include both orders with matching branchId AND orders without branchId (legacy orders)
      const branchObjectId = new Types.ObjectId(branchId);
      baseQuery.$or = [
        { branchId: branchObjectId },
        { branchId: { $exists: false } },
        { branchId: null }
      ];
    }

    console.log('Reports query:', JSON.stringify(baseQuery, null, 2));

    const currentPeriodOrders = await this.orderModel.find(baseQuery).exec();

    console.log(`Found ${currentPeriodOrders.length} orders for period ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log('Sample order branchIds:', currentPeriodOrders.slice(0, 3).map(o => ({ id: o._id, branchId: o.branchId })));

    // Calculate previous period for trends
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = startDate;

    const previousQuery: any = {
      restaurantId,
      createdAt: {
        $gte: previousStartDate,
        $lt: previousEndDate,
      },
    };

    // Apply same branch filter to previous period
    if (branchId) {
      // Include both orders with matching branchId AND orders without branchId (legacy orders)
      const branchObjectId = new Types.ObjectId(branchId);
      previousQuery.$or = [
        { branchId: branchObjectId },
        { branchId: { $exists: false } },
        { branchId: null }
      ];
    }

    const previousPeriodOrders = await this.orderModel.find(previousQuery).exec();

    const currentMetrics = this.calculateMetrics(currentPeriodOrders);
    const previousMetrics = this.calculateMetrics(previousPeriodOrders);

    const trends = this.calculateTrends(currentMetrics, previousMetrics);
    const paymentMethods = this.calculatePaymentMethods(currentPeriodOrders);
    const topItems = await this.calculateTopItems(currentPeriodOrders);
    const dailyPerformance = this.calculateDailyPerformance(currentPeriodOrders, startDate, endDate);

    return {
      summary: currentMetrics,
      trends,
      paymentMethods,
      topItems,
      dailyPerformance,
    };
  }

  private calculateMetrics(orders: OrderDocument[]) {
    const paidOrders = orders.filter(order => order.paymentStatus === PaymentStatus.Paid);
    const completedOrders = orders.filter(order => order.status === OrderStatus.Completed);

    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const successRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;
    const totalTax = paidOrders.reduce((sum, order) => sum + order.taxAmount, 0);
    const totalDiscount = paidOrders.reduce((sum, order) => sum + order.discountAmount, 0);

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      successRate,
      totalTax,
      totalDiscount,
    };
  }

  private calculateTrends(current: any, previous: any) {
    const calculateChange = (currentValue: number, previousValue: number) => {
      if (previousValue === 0) return currentValue > 0 ? 100 : 0;
      return ((currentValue - previousValue) / previousValue) * 100;
    };

    return {
      revenueChange: calculateChange(current.totalRevenue, previous.totalRevenue),
      ordersChange: calculateChange(current.totalOrders, previous.totalOrders),
      avgOrderValueChange: calculateChange(current.avgOrderValue, previous.avgOrderValue),
    };
  }

  private calculatePaymentMethods(orders: OrderDocument[]) {
    const paidOrders = orders.filter(order => order.paymentStatus === PaymentStatus.Paid);
    const methodCounts: Record<string, { count: number; amount: number }> = {};

    paidOrders.forEach(order => {
      const method = order.paymentMethod || 'unknown';
      if (!methodCounts[method]) {
        methodCounts[method] = { count: 0, amount: 0 };
      }
      methodCounts[method].count++;
      methodCounts[method].amount += order.totalAmount;
    });

    const total = paidOrders.length;
    return Object.entries(methodCounts).map(([method, data]) => ({
      method,
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      amount: data.amount,
    }));
  }

  private async calculateTopItems(orders: OrderDocument[]) {
    const itemStats: Record<string, {
      name: string;
      quantity: number;
      revenue: number;
      timesOrdered: number;
    }> = {};

    const paidOrders = orders.filter(order => order.paymentStatus === PaymentStatus.Paid);

    paidOrders.forEach(order => {
      order.items.forEach(item => {
        const itemId = item.menuItemId;
        if (!itemStats[itemId]) {
          itemStats[itemId] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            timesOrdered: 0,
          };
        }
        itemStats[itemId].quantity += item.quantity;
        itemStats[itemId].revenue += item.quantity * item.pricing.unitAmount;
        itemStats[itemId].timesOrdered++;
      });
    });

    return Object.values(itemStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private calculateDailyPerformance(orders: OrderDocument[], startDate: Date, endDate: Date) {
    const dailyStats: Record<string, { revenue: number; orders: number }> = {};
    const paidOrders = orders.filter(order => order.paymentStatus === PaymentStatus.Paid);

    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyStats[dateKey] = { revenue: 0, orders: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate with actual data
    paidOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].revenue += order.totalAmount;
        dailyStats[dateKey].orders++;
      }
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        revenue: stats.revenue,
        orders: stats.orders,
        avgOrder: stats.orders > 0 ? stats.revenue / stats.orders : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async generatePdfReport(restaurantId: string, startDate: Date, endDate: Date, branchId?: string): Promise<Buffer> {
    try {
      const restaurant = await this.restaurantModel.findById(restaurantId).exec();
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const analytics = await this.getAnalytics(restaurantId, startDate, endDate, branchId);

      const htmlContent = this.generateReportHtml(restaurant, analytics, startDate, endDate);

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });

      await browser.close();

      return pdfBuffer;
    } catch (error) {
      this.logger.error('Failed to generate PDF report', error);
      throw error;
    }
  }

  private generateReportHtml(restaurant: RestaurantDocument, analytics: AnalyticsData, startDate: Date, endDate: Date): string {
    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const formatDate = (date: Date) => date.toLocaleDateString('en-IN');
    const formatPercent = (value: number) => `${value.toFixed(1)}%`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Restaurant Report - ${restaurant.name}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2563eb;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #666;
          margin: 5px 0;
        }
        .period {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 30px;
          font-weight: bold;
          color: #374151;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
          border-left: 4px solid #2563eb;
        }
        .metric-card h3 {
          margin: 0 0 10px 0;
          color: #374151;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .metric-card .value {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 5px;
        }
        .metric-card .change {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .change.positive {
          background: #dcfce7;
          color: #166534;
        }
        .change.negative {
          background: #fee2e2;
          color: #dc2626;
        }
        .section {
          margin-bottom: 40px;
          background: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          text-align: left;
          padding: 12px 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        tr:hover {
          background: #f9fafb;
        }
        .payment-method-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .payment-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin: 5px 0;
        }
        .payment-bar-fill {
          height: 100%;
          background: #2563eb;
          transition: width 0.3s ease;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${restaurant.name}</h1>
        <p>${restaurant.address.line1}, ${restaurant.address.city}, ${restaurant.address.state}</p>
        ${restaurant.contactEmail ? `<p>Email: ${restaurant.contactEmail}</p>` : ''}
        ${restaurant.contactPhone ? `<p>Phone: ${restaurant.contactPhone}</p>` : ''}
      </div>

      <div class="period">
        Report Period: ${formatDate(startDate)} - ${formatDate(endDate)}
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Total Revenue</h3>
          <div class="value">${formatCurrency(analytics.summary.totalRevenue)}</div>
          <div class="change ${analytics.trends.revenueChange >= 0 ? 'positive' : 'negative'}">
            ${analytics.trends.revenueChange >= 0 ? '+' : ''}${formatPercent(analytics.trends.revenueChange)}
          </div>
        </div>
        <div class="metric-card">
          <h3>Total Orders</h3>
          <div class="value">${analytics.summary.totalOrders}</div>
          <div class="change ${analytics.trends.ordersChange >= 0 ? 'positive' : 'negative'}">
            ${analytics.trends.ordersChange >= 0 ? '+' : ''}${formatPercent(analytics.trends.ordersChange)}
          </div>
        </div>
        <div class="metric-card">
          <h3>Avg Order Value</h3>
          <div class="value">${formatCurrency(analytics.summary.avgOrderValue)}</div>
          <div class="change ${analytics.trends.avgOrderValueChange >= 0 ? 'positive' : 'negative'}">
            ${analytics.trends.avgOrderValueChange >= 0 ? '+' : ''}${formatPercent(analytics.trends.avgOrderValueChange)}
          </div>
        </div>
        <div class="metric-card">
          <h3>Success Rate</h3>
          <div class="value">${formatPercent(analytics.summary.successRate)}</div>
        </div>
      </div>

      <div class="section">
        <h2>Payment Methods</h2>
        ${analytics.paymentMethods.map(method => `
          <div class="payment-method-item">
            <div>
              <strong>${method.method.toUpperCase()}</strong>
              <div class="payment-bar">
                <div class="payment-bar-fill" style="width: ${method.percentage}%"></div>
              </div>
            </div>
            <div style="text-align: right;">
              <div>${method.count} orders (${formatPercent(method.percentage)})</div>
              <div style="font-size: 14px; color: #666;">${formatCurrency(method.amount)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>Top Performing Items</h2>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Quantity Sold</th>
              <th>Times Ordered</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.topItems.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.timesOrdered}</td>
                <td>${formatCurrency(item.revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Daily Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Revenue</th>
              <th>Orders</th>
              <th>Avg Order Value</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.dailyPerformance.map(day => `
              <tr>
                <td>${new Date(day.date).toLocaleDateString('en-IN')}</td>
                <td>${formatCurrency(day.revenue)}</td>
                <td>${day.orders}</td>
                <td>${formatCurrency(day.avgOrder)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>Generated on ${new Date().toLocaleString('en-IN')} | RestoHand Analytics</p>
      </div>
    </body>
    </html>
    `;
  }
}