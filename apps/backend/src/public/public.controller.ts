import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { PublicService } from './public.service';
import { CustomerSessionsService } from '../customer-sessions/customer-sessions.service';
import { BillCalculatorService } from '../billing/services/bill-calculator.service';
import { Request, Response } from 'express';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly customerSessionsService: CustomerSessionsService,
    private readonly billCalculatorService: BillCalculatorService
  ) {}

  @Get('restaurants/:slug')
  getRestaurant(@Param('slug') slug: string) {
    return this.publicService.getRestaurantBySlug(slug);
  }

  @Get('restaurants/:slug/menu')
  async getMenu(
    @Param('slug') slug: string,
    @Query('table') table?: string,
    @Query('tableId') tableId?: string,
    @Query('includeUnavailable') includeUnavailable?: string
  ) {
    const restaurant = await this.publicService.getRestaurantBySlug(slug);

    // CRITICAL FIX: Determine branch from table to prevent cross-branch menu contamination
    let branchId: string | undefined;
    if (tableId?.trim()) {
      // NEW APPROACH: Direct table ID lookup (globally unique)
      branchId = await this.publicService.getBranchIdFromTableId(
        tableId.trim()
      );
    } else if (table?.trim()) {
      // LEGACY APPROACH: Table number lookup (needs restaurant scope)
      branchId = await this.publicService.getBranchIdFromTable(
        restaurant.id,
        table.trim()
      );
    }

    // Load menu filtered by branch - this prevents Branch A customers seeing Branch B items
    const menu = await this.publicService.getMenuForRestaurant(
      restaurant.id,
      branchId,
      includeUnavailable === 'true'
    );

    // If table is specified, check for table session data
    let tableSession = null;
    if (tableId?.trim()) {
      // NEW APPROACH: Get complete table session data by tableId (preferred)
      tableSession = await this.publicService.getTableSessionData(
        restaurant.id,
        tableId.trim(),
        restaurant.slug
      );
    } else if (table?.trim()) {
      // LEGACY APPROACH: Look up active order by table number (fallback)
      const activeOrder = await this.publicService.getActiveOrderForTable(
        restaurant.id,
        table.trim(),
        restaurant.slug
      );
      // Convert single order to session-like structure for compatibility
      if (activeOrder) {
        tableSession = {
          tableId: null,
          tableNumber: activeOrder.tableNumber,
          restaurantSlug: restaurant.slug,
          orders: [activeOrder],
          totals: {
            subTotalAmount: activeOrder.subTotalAmount,
            taxAmount: activeOrder.taxAmount,
            cgstAmount: activeOrder.cgstAmount,
            sgstAmount: activeOrder.sgstAmount,
            igstAmount: activeOrder.igstAmount,
            discountAmount: activeOrder.discountAmount,
            roundOffAmount: activeOrder.roundOffAmount,
            totalAmount: activeOrder.totalAmount,
          },
          orderCount: 1,
          hasUnpaidOrders: activeOrder.paymentStatus !== 'paid',
          allOrdersPaid: activeOrder.paymentStatus === 'paid',
        };
      }
    }

    return { restaurant, menu, tableSession };
  }

  @Get('restaurants/:slug/table/:tableId/session')
  async getTableSession(
    @Param('slug') slug: string,
    @Param('tableId') tableId: string
  ) {
    const restaurant = await this.publicService.getRestaurantBySlug(slug);
    const tableSession = await this.publicService.getTableSessionData(
      restaurant.id,
      tableId,
      restaurant.slug
    );

    return { restaurant, tableSession };
  }

  @Get('restaurants/:slug/orders/:orderId')
  getPublicOrder(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string
  ) {
    return this.publicService.getOrderById(slug, orderId);
  }

  @Post('restaurants/:slug/orders/:orderId/cancel')
  cancelPublicOrder(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string
  ) {
    return this.publicService.cancelOrder(slug, orderId);
  }

  @Get('restaurants/:slug/orders/:orderId/bill')
  async getInvoice(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string,
    @Res() res: Response
  ) {
    const invoice = await this.publicService.getInvoice(slug, orderId);
    res
      .header('Content-Type', 'text/html; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="${invoice.filename}"`
      )
      .send(invoice.html);
  }

  @Get('restaurants/:slug/table/:tableId/bill')
  async getCombinedTableBill(
    @Param('slug') slug: string,
    @Param('tableId') tableId: string,
    @Res() res: Response
  ) {
    const invoice = await this.publicService.getCombinedTableInvoice(
      slug,
      tableId
    );
    res
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="${invoice.filename.replace('.html', '.pdf')}"`
      )
      .send(invoice.pdf);
  }

  @Post('restaurants/:slug/orders')
  async createOrder(
    @Param('slug') slug: string,
    @Body()
    orderData: {
      tableId?: string;
      tableNumber?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
      paymentMethod?: 'upi' | 'cash';
      customerSessionId?: string;
      items: Array<{
        menuItemId: string;
        name: string;
        quantity: number;
        pricing: {
          unitAmount: number;
          currency: string;
          taxAmount?: number;
          discountAmount?: number;
        };
        notes?: string;
      }>;
    }
  ) {
    return this.publicService.createOrder(slug, orderData);
  }

  @Post('restaurants/:slug/orders/:orderId/payment-intent')
  async createPaymentIntent(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string
  ) {
    return this.publicService.createPaymentIntent(slug, orderId);
  }

  @Post('restaurants/:slug/orders/:orderId/add-items')
  async addItemsToOrder(
    @Param('slug') slug: string,
    @Param('orderId') orderId: string,
    @Body()
    itemsData: {
      items: Array<{
        menuItemId: string;
        name: string;
        quantity: number;
        pricing: {
          unitAmount: number;
          currency: string;
          taxAmount?: number;
          discountAmount?: number;
        };
        notes?: string;
      }>;
    }
  ) {
    return this.publicService.addItemsToOrder(slug, orderId, itemsData);
  }

  @Post('restaurants/:slug/table/:tableId/session')
  async createCustomerSession(
    @Param('slug') slug: string,
    @Param('tableId') tableId: string,
    @Req() req: Request
  ) {
    // Use new comprehensive session system
    return this.customerSessionsService.createSession({
      restaurantSlug: slug,
      tableId,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @Post('restaurants/:slug/table/:tableId/session/payment-intent')
  async createSessionPaymentIntent(
    @Param('slug') slug: string,
    @Param('tableId') tableId: string,
    @Body() sessionData?: any
  ) {
    // MIGRATED TO CASHFREE: Use Cashfree session payment instead of Razorpay
    return this.publicService.createCashfreeSessionPaymentIntent(
      slug,
      tableId,
      sessionData
    );
  }

  @Get('restaurants/:slug/table/:tableId/consolidated-bill')
  async getConsolidatedBill(
    @Param('slug') slug: string,
    @Param('tableId') tableId: string
  ) {
    return this.publicService.getConsolidatedBill(slug, tableId);
  }

  @Get('restaurants/:slug/table/:tableId/session-bill')
  async getSessionBill(
    @Param('slug') slug: string,
    @Param('tableId') tableId: string
  ) {
    // Find active session for this table
    const session = await this.customerSessionsService.findActiveSessionByTable(
      tableId
    );
    if (!session) {
      throw new Error('No active session found for this table');
    }

    // Use universal billing calculator
    return this.billCalculatorService.calculateSessionBill(session.sessionId);
  }

  @Get('restaurants/:slug/session/:sessionId/bill')
  async getSessionBillBySessionId(
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string
  ) {
    // Verify the restaurant slug matches the session's restaurant
    const restaurant = await this.publicService.getRestaurantBySlug(slug);
    const session = await this.customerSessionsService.findBySessionId(
      sessionId
    );

    if (!session) {
      throw new Error('Session not found');
    }

    console.log(`Session found for sessionId ${sessionId}:`, session);
    console.log(`Verifying session belongs to restaurant ${restaurant.id}`);

    if (session.restaurantId?.toString() !== restaurant.id) {
      throw new Error('Session does not belong to this restaurant');
    }

    // Get the session with complete bill calculation using the same format as table bill
    return this.publicService.getSessionBill(sessionId);
  }

  @Post('account-deletion-request')
  async submitAccountDeletionRequest(
    @Body()
    requestData: {
      email: string;
      reason: string;
      additionalInfo?: string;
    }
  ) {
    // For now, just return a dummy success response
    // In the future, this could save to database and notify admins
    console.log('Account deletion request received:', requestData);

    return {
      success: true,
      message:
        'Your account deletion request has been submitted successfully. You will receive an email confirmation within 5-7 business days.',
      requestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending_admin_approval',
    };
  }
}
