import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Response,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  PurchaseOrdersService,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
  RecordInvoiceDto,
  RecordPaymentDto,
} from './purchase-orders.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('purchase-orders')
@Controller('restaurants/:restaurantId/purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new purchase order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 201, description: 'Purchase order created successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async createPurchaseOrder(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: Omit<CreatePurchaseOrderDto, 'restaurantId' | 'createdBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.createPurchaseOrder({
      ...dto,
      restaurantId,
      createdBy: user.uid,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all purchase orders' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Purchase orders retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getPurchaseOrders(
    @Param('restaurantId') restaurantId: string,
    @Query() filters: PurchaseOrderQueryDto,
  ) {
    return this.purchaseOrdersService.getPurchaseOrders(restaurantId, filters);
  }

  @Get(':poId')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getPurchaseOrderById(@Param('poId') poId: string) {
    return this.purchaseOrdersService.getPurchaseOrderById(poId);
  }

  @Put(':poId')
  @ApiOperation({ summary: 'Update purchase order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order updated successfully' })
  @Roles(UserRole.Manager)
  async updatePurchaseOrder(
    @Param('poId') poId: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.updatePurchaseOrder(poId, dto);
  }

  @Put(':poId/approve')
  @ApiOperation({ summary: 'Approve purchase order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order approved successfully' })
  @Roles(UserRole.Manager)
  async approvePurchaseOrder(
    @Param('poId') poId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.approvePurchaseOrder(poId, user.uid);
  }

  @Put(':poId/send')
  @ApiOperation({ summary: 'Send purchase order to supplier' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order sent successfully' })
  @Roles(UserRole.Manager)
  async sendPurchaseOrder(
    @Param('poId') poId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.sendPurchaseOrder(poId, user.uid);
  }

  @Put(':poId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge purchase order (supplier confirmation)' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order acknowledged successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async acknowledgePurchaseOrder(
    @Param('poId') poId: string,
    @Body('acknowledgmentMethod') acknowledgmentMethod?: string,
  ) {
    return this.purchaseOrdersService.acknowledgePurchaseOrder(
      poId,
      acknowledgmentMethod,
    );
  }

  @Put(':poId/receive')
  @ApiOperation({ summary: 'Receive purchase order items' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order items received successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async receivePurchaseOrder(
    @Param('poId') poId: string,
    @Body() dto: Omit<ReceivePurchaseOrderDto, 'poId' | 'receivedBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.receivePurchaseOrder({
      ...dto,
      poId,
      receivedBy: user.uid,
    });
  }

  @Put(':poId/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled successfully' })
  @Roles(UserRole.Manager)
  async cancelPurchaseOrder(
    @Param('poId') poId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.cancelPurchaseOrder(
      poId,
      reason,
      user.uid,
    );
  }

  @Get(':poId/pdf')
  @ApiOperation({ summary: 'Generate purchase order PDF' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order PDF generated successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async generatePurchaseOrderPdf(
    @Param('poId') poId: string,
    @Response() res: ExpressResponse,
  ) {
    const pdfBuffer = await this.purchaseOrdersService.generatePurchaseOrderPdf(poId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="PO-${poId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Put(':poId/invoice')
  @ApiOperation({ summary: 'Record supplier invoice for a purchase order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Invoice recorded successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async recordInvoice(
    @Param('poId') poId: string,
    @Body() dto: RecordInvoiceDto,
  ) {
    return this.purchaseOrdersService.recordInvoice(poId, dto);
  }

  @Put(':poId/payment')
  @ApiOperation({ summary: 'Record payment for a purchase order' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Payment recorded successfully' })
  @Roles(UserRole.Manager)
  async recordPayment(
    @Param('poId') poId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.purchaseOrdersService.recordPayment(poId, dto);
  }

  @Put(':poId/close')
  @ApiOperation({ summary: 'Close a purchase order manually' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Purchase order closed successfully' })
  @Roles(UserRole.Manager)
  async closePurchaseOrder(@Param('poId') poId: string) {
    return this.purchaseOrdersService.closePurchaseOrder(poId);
  }

  @Get(':poId/invoice/pdf')
  @ApiOperation({ summary: 'Download invoice receipt PDF' })
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'poId' })
  @ApiResponse({ status: 200, description: 'Invoice receipt PDF generated' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async generateInvoiceReceiptPdf(
    @Param('poId') poId: string,
    @Response() res: ExpressResponse,
  ) {
    const pdfBuffer = await this.purchaseOrdersService.generateInvoiceReceiptPdf(poId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-Receipt-${poId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get purchase orders analytics' })
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, description: 'Purchase orders analytics retrieved successfully' })
  @Roles(UserRole.Manager)
  async getPurchaseOrderAnalytics(
    @Param('restaurantId') restaurantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.purchaseOrdersService.getPurchaseOrderAnalytics(
      restaurantId,
      branchId,
    );
  }

  @Get('statuses/all')
  @ApiOperation({ summary: 'Get all available purchase order statuses' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Purchase order statuses retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getPurchaseOrderStatuses() {
    return {
      statuses: [
        'draft',
        'pending',
        'sent',
        'acknowledged',
        'partial',
        'delivered',
        'cancelled',
        'closed',
      ],
    };
  }

  @Get('priorities/all')
  @ApiOperation({ summary: 'Get all available purchase order priorities' })
  @ApiParam({ name: 'restaurantId' })
  @ApiResponse({ status: 200, description: 'Purchase order priorities retrieved successfully' })
  @Roles(UserRole.Manager, UserRole.Chef)
  async getPurchaseOrderPriorities() {
    return {
      priorities: ['low', 'normal', 'high', 'urgent'],
    };
  }
}