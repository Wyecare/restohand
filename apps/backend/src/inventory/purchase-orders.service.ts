import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import * as puppeteer from 'puppeteer';
import { PurchaseOrder, PurchaseOrderDocument } from './schemas/purchase-order.schema';
import { InventoryService } from './inventory.service';
import { SuppliersService } from './suppliers.service';
import { PoEmailService } from './po-email.service';

export interface CreatePurchaseOrderDto {
  restaurantId: string;
  branchId: string;
  supplierId: string;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>;
  delivery?: {
    expectedDate?: Date;
    expectedTime?: string;
    deliveryInstructions?: string;
  };
  notes?: string;
  terms?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdBy: string;
}

export interface UpdatePurchaseOrderDto {
  items?: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>;
  delivery?: {
    expectedDate?: Date;
    expectedTime?: string;
    deliveryInstructions?: string;
  };
  notes?: string;
  terms?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface PurchaseOrderQueryDto {
  status?: string;
  supplierId?: string;
  branchId?: string;
  priority?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReceivePurchaseOrderDto {
  poId: string;
  items: Array<{
    inventoryItemId: string;
    receivedQuantity: number;
    actualUnitCost?: number;
    notes?: string;
  }>;
  receivedBy: string;
  actualDeliveryDate?: Date;
  actualDeliveryTime?: string;
  notes?: string;
}

export interface RecordInvoiceDto {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  notes?: string;
}

export interface RecordPaymentDto {
  paidAmount: number;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'credit';
  reference?: string;
  notes?: string;
}

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
    private readonly inventoryService: InventoryService,
    private readonly suppliersService: SuppliersService,
    private readonly poEmailService: PoEmailService,
  ) {}

  async createPurchaseOrder(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    // Validate supplier exists and is active
    const supplier = await this.suppliersService.getSupplierById(dto.supplierId);
    if (!supplier.isActive) {
      throw new BadRequestException('Supplier is not active');
    }

    // Generate PO number
    const poNumber = await this.generatePONumber(dto.restaurantId);

    // Calculate totals
    const { subtotal, totalAmount, items } = this.calculatePOTotals(dto.items);

    const purchaseOrder = new this.purchaseOrderModel({
      restaurantId: dto.restaurantId,
      branchId: dto.branchId,
      supplierId: dto.supplierId,
      poNumber,
      status: 'draft',
      items,
      subtotal,
      taxAmount: 0, // TODO: Calculate based on GST settings
      totalAmount,
      delivery: dto.delivery,
      notes: dto.notes,
      terms: dto.terms,
      priority: dto.priority || 'normal',
      createdBy: dto.createdBy,
      tracking: {},
    });

    const savedPO = await purchaseOrder.save();

    this.logger.log(
      `Created purchase order ${poNumber} for supplier ${supplier.name}`,
    );

    return savedPO;
  }

  async updatePurchaseOrder(
    poId: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    // Only allow updates for draft orders
    if (po.status !== 'draft') {
      throw new BadRequestException('Can only update draft purchase orders');
    }

    // Update items and recalculate totals if items changed
    if (dto.items) {
      const { subtotal, totalAmount, items } = this.calculatePOTotals(dto.items);
      po.items = items;
      po.subtotal = subtotal;
      po.totalAmount = totalAmount;
    }

    // Update other fields
    if (dto.delivery) {
      po.delivery = { ...po.delivery, ...dto.delivery };
    }
    if (dto.notes) po.notes = dto.notes;
    if (dto.terms) po.terms = dto.terms;
    if (dto.priority) po.priority = dto.priority;

    await po.save();

    this.logger.log(`Updated purchase order ${po.poNumber}`);
    return po;
  }

  async approvePurchaseOrder(
    poId: string,
    approvedBy: string,
  ): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    if (po.status !== 'draft') {
      throw new BadRequestException('Can only approve draft purchase orders');
    }

    po.status = 'pending';
    po.approvedBy = approvedBy;
    po.approvedAt = new Date();

    await po.save();

    this.logger.log(`Approved purchase order ${po.poNumber} by user ${approvedBy}`);
    return po;
  }

  async sendPurchaseOrder(poId: string, sentBy: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel
      .findById(poId)
      .populate('supplierId')
      .populate('branchId', 'name')
      .populate('items.inventoryItemId', 'name unit category')
      .populate('restaurantId', 'name');
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    if (po.status !== 'pending') {
      throw new BadRequestException('Can only send approved (pending) purchase orders');
    }

    const supplier = po.supplierId as any;
    if (!supplier.contact?.email) {
      throw new BadRequestException('Supplier does not have an email address configured');
    }

    // Update status first so the PDF reflects "sent"
    po.status = 'sent';
    po.tracking.sentAt = new Date();
    po.tracking.sentBy = sentBy;
    await po.save();

    // Generate PDF (now captures "sent" status)
    const pdfBuffer = await this.generatePurchaseOrderPdf(poId);

    const branch = po.branchId as any;
    const restaurant = po.restaurantId as any;
    const expectedDelivery = po.delivery?.expectedDate
      ? new Date(po.delivery.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : undefined;

    // Send email
    await this.poEmailService.sendPurchaseOrderToSupplier({
      supplierEmail: supplier.contact.email,
      supplierName: supplier.name,
      supplierContact: supplier.contact?.contactPerson,
      poNumber: po.poNumber,
      restaurantName: restaurant?.name || 'Restaurant',
      branchName: branch?.name || 'Branch',
      totalAmount: po.totalAmount,
      itemCount: po.items.length,
      expectedDeliveryDate: expectedDelivery,
      notes: po.notes,
      pdfBuffer,
    });

    this.logger.log(`Purchase order ${po.poNumber} sent to ${supplier.contact.email}`);
    return po;
  }

  async acknowledgePurchaseOrder(
    poId: string,
    acknowledgmentMethod?: string,
  ): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    po.status = 'acknowledged';
    po.tracking.acknowledgedAt = new Date();
    po.tracking.acknowledgmentMethod = acknowledgmentMethod;

    await po.save();

    this.logger.log(`Purchase order ${po.poNumber} acknowledged`);
    return po;
  }

  async receivePurchaseOrder(dto: ReceivePurchaseOrderDto): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(dto.poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${dto.poId} not found`);
    }

    if (!['sent', 'acknowledged', 'partial'].includes(po.status)) {
      throw new BadRequestException(
        'Purchase order must be sent/acknowledged to receive items',
      );
    }

    let allItemsReceived = true;

    // Process received items
    for (const receivedItem of dto.items) {
      const poItem = po.items.find(
        item => item.inventoryItemId.toString() === receivedItem.inventoryItemId,
      );

      if (!poItem) {
        throw new BadRequestException(
          `Item ${receivedItem.inventoryItemId} not found in purchase order`,
        );
      }

      // Update received quantity
      poItem.receivedQuantity += receivedItem.receivedQuantity;

      // Update status based on received vs ordered quantity
      if (poItem.receivedQuantity >= poItem.quantity) {
        poItem.status = 'received';
      } else if (poItem.receivedQuantity > 0) {
        poItem.status = 'partial';
        allItemsReceived = false;
      } else {
        allItemsReceived = false;
      }

      // Update inventory stock
      await this.inventoryService.updateStock(receivedItem.inventoryItemId, {
        quantity: receivedItem.receivedQuantity,
        type: 'purchase',
        unitCost: receivedItem.actualUnitCost || poItem.unitCost,
        reason: `Purchase order ${po.poNumber}`,
        supplier: po.supplierId.toString(),
        invoiceNumber: po.poNumber,
        createdBy: dto.receivedBy,
      });
    }

    // Update PO status
    if (allItemsReceived) {
      po.status = 'delivered';
      po.tracking.deliveredAt = new Date();
    } else {
      po.status = 'partial';
    }

    po.tracking.receivedBy = dto.receivedBy;

    if (dto.actualDeliveryDate) {
      po.delivery = po.delivery || {};
      po.delivery.actualDate = dto.actualDeliveryDate;
      po.delivery.actualTime = dto.actualDeliveryTime;
    }

    await po.save();

    // Update supplier performance
    const isOnTime = this.isDeliveryOnTime(po);
    await this.suppliersService.updateSupplierPerformance({
      supplierId: po.supplierId.toString(),
      onTimeDelivery: isOnTime,
      orderValue: po.totalAmount,
      evaluatedBy: dto.receivedBy,
    });

    this.logger.log(
      `Received items for purchase order ${po.poNumber} by ${dto.receivedBy}`,
    );

    return po;
  }

  async cancelPurchaseOrder(
    poId: string,
    reason: string,
    cancelledBy: string,
  ): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    if (['delivered', 'cancelled'].includes(po.status)) {
      throw new BadRequestException(
        'Cannot cancel delivered or already cancelled purchase order',
      );
    }

    po.status = 'cancelled';
    po.tracking.cancellationReason = reason;
    po.tracking.cancelledAt = new Date();
    po.tracking.cancelledBy = cancelledBy;

    await po.save();

    this.logger.log(
      `Cancelled purchase order ${po.poNumber} by ${cancelledBy}: ${reason}`,
    );

    return po;
  }

  async recordInvoice(poId: string, dto: RecordInvoiceDto): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) throw new NotFoundException(`Purchase order ${poId} not found`);

    if (!['delivered', 'partial', 'closed'].includes(po.status)) {
      throw new BadRequestException('Can only record invoice for delivered or partial orders');
    }

    po.invoice = {
      invoiceNumber: dto.invoiceNumber || po.poNumber,
      invoiceDate: new Date(dto.invoiceDate),
      invoiceAmount: dto.invoiceAmount,
      notes: dto.notes,
      receivedAt: new Date(),
    } as any;

    await po.save();
    this.logger.log(`Invoice ${dto.invoiceNumber} recorded for PO ${po.poNumber}`);
    return po;
  }

  async recordPayment(poId: string, dto: RecordPaymentDto): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) throw new NotFoundException(`Purchase order ${poId} not found`);

    if (!['delivered', 'partial', 'closed'].includes(po.status)) {
      throw new BadRequestException('Can only record payment for delivered or partial orders');
    }

    const previousPaid = po.payment?.paidAmount || 0;
    const newPaidTotal = previousPaid + dto.paidAmount;
    const invoiceAmount = po.invoice?.invoiceAmount ?? po.totalAmount;

    po.payment = {
      paidAmount: newPaidTotal,
      method: dto.method,
      reference: dto.reference,
      notes: dto.notes,
      paidAt: new Date(),
      status: newPaidTotal >= invoiceAmount ? 'paid' : 'partial',
    } as any;

    // Auto-close when fully paid
    if (po.payment.status === 'paid') {
      po.status = 'closed';
    }

    await po.save();
    this.logger.log(`Payment of ${dto.paidAmount} recorded for PO ${po.poNumber}`);
    return po;
  }

  async closePurchaseOrder(poId: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel.findById(poId);
    if (!po) throw new NotFoundException(`Purchase order ${poId} not found`);

    if (!['delivered', 'partial'].includes(po.status)) {
      throw new BadRequestException('Can only close delivered or partial orders');
    }

    po.status = 'closed';
    await po.save();
    this.logger.log(`Purchase order ${po.poNumber} manually closed`);
    return po;
  }

  async getPurchaseOrders(
    restaurantId: string,
    filters?: PurchaseOrderQueryDto,
  ): Promise<{
    purchaseOrders: PurchaseOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: FilterQuery<PurchaseOrderDocument> = {
      restaurantId,
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.supplierId) {
      query.supplierId = new Types.ObjectId(filters.supplierId);
    }

    if (filters?.branchId) {
      query.branchId = new Types.ObjectId(filters.branchId);
    }

    if (filters?.priority) {
      query.priority = filters.priority;
    }

    if (filters?.fromDate || filters?.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }

    if (filters?.search) {
      query.$or = [
        { poNumber: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await Promise.all([
      this.purchaseOrderModel
        .find(query)
        .populate('supplierId', 'name supplierCode contact')
        .populate('branchId', 'name')
        .populate('items.inventoryItemId', 'name unit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.purchaseOrderModel.countDocuments(query),
    ]);

    return {
      purchaseOrders: purchaseOrders as PurchaseOrder[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPurchaseOrderById(poId: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderModel
      .findById(poId)
      .populate('supplierId')
      .populate('branchId', 'name')
      .populate('items.inventoryItemId', 'name unit category')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .lean();

    if (!po) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    return po as PurchaseOrder;
  }

  async generatePurchaseOrderPdf(poId: string): Promise<Buffer> {
    const po = await this.getPurchaseOrderById(poId);
    const html = this.buildPurchaseOrderHtml(po);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      timeout: 30000,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private buildPurchaseOrderHtml(po: any): string {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n ?? 0);
    const fmtDate = (d: any) =>
      d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const supplier = po.supplierId as any;
    const branch = po.branchId as any;

    const statusColors: Record<string, string> = {
      draft: '#6b7280',
      pending: '#d97706',
      sent: '#2563eb',
      acknowledged: '#7c3aed',
      partial: '#ea580c',
      delivered: '#16a34a',
      cancelled: '#dc2626',
      closed: '#374151',
    };
    const statusColor = statusColors[po.status] ?? '#374151';

    const priorityColors: Record<string, string> = {
      low: '#6b7280',
      normal: '#2563eb',
      high: '#d97706',
      urgent: '#dc2626',
    };
    const priorityColor = priorityColors[po.priority] ?? '#2563eb';

    const itemRows = (po.items as any[])
      .map((item, i) => {
        const name = item.inventoryItemId?.name ?? 'Unknown Item';
        const unit = item.inventoryItemId?.unit ?? '';
        const category = item.inventoryItemId?.category ?? '';
        return `
        <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
            <div style="font-weight:600;color:#111827">${name}</div>
            ${category ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${category}</div>` : ''}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity} ${unit}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.unitCost)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(item.totalCost)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="font-size:11px;padding:2px 8px;border-radius:9999px;background:${item.status === 'received' ? '#dcfce7' : '#fef3c7'};color:${item.status === 'received' ? '#15803d' : '#92400e'}">${item.status}</span>
          </td>
        </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Purchase Order ${po.poNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 13px; line-height: 1.5; background: #fff; }
    .page { padding: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #111827; margin-bottom: 24px; }
    .company-name { font-size: 22px; font-weight: 700; color: #111827; }
    .po-title { font-size: 28px; font-weight: 800; color: #111827; text-align: right; }
    .po-number { font-size: 14px; color: #6b7280; text-align: right; margin-top: 2px; }
    .badges { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .info-box-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
    .info-line { margin-bottom: 3px; }
    .info-label { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    thead tr { background: #111827; color: #fff; }
    thead th { padding: 10px 12px; font-size: 12px; font-weight: 600; text-align: left; letter-spacing: 0.04em; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5) { text-align: center; }
    thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-top: 0; }
    .totals-box { width: 280px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid #e5e7eb; }
    .totals-row:last-child { border-bottom: none; background: #111827; color: #fff; font-weight: 700; font-size: 14px; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
    .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 12px; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">${branch?.name ?? 'Branch'}</div>
      <div style="color:#6b7280;margin-top:4px;font-size:12px">Purchase Order</div>
    </div>
    <div>
      <div class="po-title">${po.poNumber}</div>
      <div class="po-number">Created: ${fmtDate(po.createdAt)}</div>
      <div class="badges">
        <span class="badge" style="background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40">${po.status}</span>
        <span class="badge" style="background:${priorityColor}20;color:${priorityColor};border:1px solid ${priorityColor}40">${po.priority} priority</span>
      </div>
    </div>
  </div>

  <!-- Supplier + Delivery Info -->
  <div class="section">
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">Supplier</div>
        <div class="info-line" style="font-weight:700;font-size:14px">${supplier?.name ?? '—'}</div>
        ${supplier?.supplierCode ? `<div class="info-line" style="color:#6b7280;font-size:12px">Code: ${supplier.supplierCode}</div>` : ''}
        ${supplier?.contact?.contactPerson ? `<div class="info-line info-label" style="margin-top:6px">Contact: <strong>${supplier.contact.contactPerson}</strong></div>` : ''}
        ${supplier?.contact?.phone ? `<div class="info-line info-label">Phone: ${supplier.contact.phone}</div>` : ''}
        ${supplier?.contact?.email ? `<div class="info-line info-label">Email: ${supplier.contact.email}</div>` : ''}
        ${supplier?.taxInfo?.gstin ? `<div class="info-line info-label" style="margin-top:6px">GSTIN: ${supplier.taxInfo.gstin}</div>` : ''}
      </div>
      <div class="info-box">
        <div class="info-box-title">Order Details</div>
        <div class="info-line"><span class="info-label">Deliver To: </span><strong>${branch?.name ?? '—'}</strong></div>
        <div class="info-line"><span class="info-label">Expected Delivery: </span><strong>${fmtDate(po.delivery?.expectedDate)}</strong></div>
        ${po.delivery?.expectedTime ? `<div class="info-line"><span class="info-label">Time: </span>${po.delivery.expectedTime}</div>` : ''}
        ${po.approvedBy ? `<div class="info-line" style="margin-top:6px"><span class="info-label">Approved By: </span>${(po.approvedBy as any)?.name ?? '—'}</div>` : ''}
        ${po.approvedAt ? `<div class="info-line"><span class="info-label">Approved At: </span>${fmtDate(po.approvedAt)}</div>` : ''}
        <div class="info-line" style="margin-top:6px"><span class="info-label">Revision: </span>#${po.revision ?? 0}</div>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <div class="section">
    <div class="section-title">Order Items</div>
    <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Item</th>
            <th style="text-align:center;width:110px">Qty</th>
            <th style="text-align:right;width:120px">Unit Cost</th>
            <th style="text-align:right;width:120px">Total</th>
            <th style="text-align:center;width:100px">Status</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row"><span>Subtotal</span><span>${fmt(po.subtotal)}</span></div>
        ${po.taxAmount ? `<div class="totals-row"><span>Tax (GST)</span><span>${fmt(po.taxAmount)}</span></div>` : ''}
        ${po.shippingCost ? `<div class="totals-row"><span>Shipping</span><span>${fmt(po.shippingCost)}</span></div>` : ''}
        ${po.discountAmount ? `<div class="totals-row"><span>Discount</span><span>- ${fmt(po.discountAmount)}</span></div>` : ''}
        <div class="totals-row"><span>Total Amount</span><span>${fmt(po.totalAmount)}</span></div>
      </div>
    </div>
  </div>

  ${po.notes ? `
  <div class="notes-box">
    <div style="font-weight:700;margin-bottom:4px;color:#92400e">Notes</div>
    <div>${po.notes}</div>
  </div>` : ''}

  ${po.terms ? `
  <div class="notes-box" style="background:#f0f9ff;border-color:#bae6fd;margin-top:10px">
    <div style="font-weight:700;margin-bottom:4px;color:#0369a1">Terms &amp; Conditions</div>
    <div>${po.terms}</div>
  </div>` : ''}

  ${po.delivery?.deliveryInstructions ? `
  <div class="notes-box" style="background:#f0fdf4;border-color:#bbf7d0;margin-top:10px">
    <div style="font-weight:700;margin-bottom:4px;color:#15803d">Delivery Instructions</div>
    <div>${po.delivery.deliveryInstructions}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <span>Generated: ${new Date().toLocaleString('en-IN')}</span>
    <span>${po.poNumber} · ${po.items.length} item${po.items.length !== 1 ? 's' : ''} · ${fmt(po.totalAmount)}</span>
  </div>

</div>
</body>
</html>`;
  }

  async generateInvoiceReceiptPdf(poId: string): Promise<Buffer> {
    const po = await this.getPurchaseOrderById(poId);
    if (!po.invoice?.invoiceNumber) {
      throw new BadRequestException('No invoice recorded for this purchase order');
    }
    const html = this.buildInvoiceReceiptHtml(po);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      timeout: 30000,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private buildInvoiceReceiptHtml(po: any): string {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n ?? 0);
    const fmtDate = (d: any) =>
      d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const supplier = po.supplierId as any;
    const branch = po.branchId as any;
    const invoice = po.invoice as any;
    const payment = po.payment as any;

    const paymentStatusColors: Record<string, string> = {
      unpaid: '#dc2626',
      partial: '#d97706',
      paid: '#16a34a',
    };
    const payStatusColor = paymentStatusColors[payment?.status ?? 'unpaid'] ?? '#6b7280';

    const receivedItemRows = (po.items as any[])
      .map((item, i) => {
        const name = item.inventoryItemId?.name ?? 'Unknown Item';
        const unit = item.inventoryItemId?.unit ?? '';
        const received = item.receivedQuantity ?? 0;
        return `
        <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827">${name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity} ${unit}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:${received === item.quantity ? '#15803d' : '#d97706'};font-weight:600">${received} ${unit}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.unitCost)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(item.totalCost)}</td>
        </tr>`;
      })
      .join('');

    const outstanding = Math.max(0, (invoice?.invoiceAmount ?? po.totalAmount) - (payment?.paidAmount ?? 0));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice Receipt — ${po.poNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 13px; line-height: 1.5; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #16a34a; margin-bottom: 24px; }
    .company-name { font-size: 22px; font-weight: 700; color: #111827; }
    .doc-title { font-size: 26px; font-weight: 800; color: #16a34a; text-align: right; }
    .doc-sub { font-size: 13px; color: #6b7280; text-align: right; margin-top: 3px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .info-box-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
    .info-line { margin-bottom: 3px; }
    .info-label { color: #6b7280; }
    .invoice-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #111827; color: #fff; }
    thead th { padding: 10px 12px; font-size: 12px; font-weight: 600; text-align: left; letter-spacing: 0.04em; }
    .totals { display: flex; justify-content: flex-end; margin-top: 0; }
    .totals-box { width: 300px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .totals-row:last-child { border-bottom: none; background: #111827; color: #fff; font-weight: 700; font-size: 14px; }
    .payment-box { border-radius: 8px; padding: 14px 20px; margin-top: 16px; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
    .stamp { display: inline-block; border: 3px solid ${payStatusColor}; color: ${payStatusColor}; font-size: 20px; font-weight: 900; padding: 4px 16px; border-radius: 4px; transform: rotate(-8deg); text-transform: uppercase; letter-spacing: 0.1em; }
  </style>
</head>
<body>
<div style="padding:0">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">${branch?.name ?? 'Branch'}</div>
      <div style="color:#6b7280;margin-top:4px;font-size:12px">Invoice Receipt / Goods Received Note</div>
    </div>
    <div>
      <div class="doc-title">INVOICE RECEIPT</div>
      <div class="doc-sub">Ref: ${po.poNumber}</div>
      <div class="doc-sub">Date: ${fmtDate(invoice?.receivedAt ?? new Date())}</div>
    </div>
  </div>

  <!-- Invoice details highlight -->
  <div class="invoice-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="section-title" style="margin-bottom:4px">Invoice Details</div>
        <div style="font-size:18px;font-weight:700;color:#15803d">${invoice?.invoiceNumber ?? '—'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">Invoice Date: ${fmtDate(invoice?.invoiceDate)}</div>
        <div style="font-size:12px;color:#6b7280">Received On: ${fmtDate(invoice?.receivedAt)}</div>
      </div>
      <div style="text-align:right">
        <div class="section-title" style="margin-bottom:4px">Invoice Amount</div>
        <div style="font-size:24px;font-weight:800;color:#111827">${fmt(invoice?.invoiceAmount ?? po.totalAmount)}</div>
        <div style="margin-top:8px"><span class="stamp">${payment?.status ?? 'unpaid'}</span></div>
      </div>
    </div>
  </div>

  <!-- Supplier + PO info -->
  <div class="section">
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">Supplier</div>
        <div style="font-weight:700;font-size:14px">${supplier?.name ?? '—'}</div>
        ${supplier?.supplierCode ? `<div style="color:#6b7280;font-size:12px">Code: ${supplier.supplierCode}</div>` : ''}
        ${supplier?.contact?.contactPerson ? `<div class="info-line info-label" style="margin-top:6px">Contact: <strong>${supplier.contact.contactPerson}</strong></div>` : ''}
        ${supplier?.contact?.phone ? `<div class="info-line info-label">Phone: ${supplier.contact.phone}</div>` : ''}
        ${supplier?.contact?.email ? `<div class="info-line info-label">Email: ${supplier.contact.email}</div>` : ''}
      </div>
      <div class="info-box">
        <div class="info-box-title">Purchase Order</div>
        <div class="info-line"><span class="info-label">PO Number: </span><strong>${po.poNumber}</strong></div>
        <div class="info-line"><span class="info-label">PO Status: </span><strong>${po.status}</strong></div>
        <div class="info-line"><span class="info-label">Deliver To: </span><strong>${branch?.name ?? '—'}</strong></div>
        <div class="info-line"><span class="info-label">PO Date: </span>${fmtDate(po.createdAt)}</div>
        ${po.tracking?.deliveredAt ? `<div class="info-line"><span class="info-label">Delivered: </span>${fmtDate(po.tracking.deliveredAt)}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <div class="section">
    <div class="section-title">Items Received</div>
    <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Item</th>
            <th style="text-align:center;width:110px">Ordered</th>
            <th style="text-align:center;width:110px">Received</th>
            <th style="text-align:right;width:120px">Unit Cost</th>
            <th style="text-align:right;width:130px">Total</th>
          </tr>
        </thead>
        <tbody>${receivedItemRows}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row"><span>PO Total</span><span>${fmt(po.totalAmount)}</span></div>
        <div class="totals-row"><span>Invoice Amount</span><span>${fmt(invoice?.invoiceAmount ?? po.totalAmount)}</span></div>
        ${(payment?.paidAmount ?? 0) > 0 ? `<div class="totals-row" style="background:#f0fdf4;color:#15803d"><span>Amount Paid</span><span>${fmt(payment.paidAmount)}</span></div>` : ''}
        ${outstanding > 0 ? `<div class="totals-row" style="background:#fef2f2;color:#dc2626"><span>Outstanding</span><span>${fmt(outstanding)}</span></div>` : ''}
        <div class="totals-row"><span>Payment Status</span><span>${payment?.status?.toUpperCase() ?? 'UNPAID'}</span></div>
      </div>
    </div>
  </div>

  ${payment?.method ? `
  <div class="payment-box" style="background:#f0fdf4;border:1px solid #86efac">
    <div class="section-title" style="color:#15803d;margin-bottom:8px">Payment Details</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
      <div><span class="info-label">Method: </span><strong>${payment.method.replace('_', ' ').toUpperCase()}</strong></div>
      ${payment.reference ? `<div><span class="info-label">Reference: </span><strong>${payment.reference}</strong></div>` : ''}
      ${payment.paidAt ? `<div><span class="info-label">Paid On: </span>${fmtDate(payment.paidAt)}</div>` : ''}
    </div>
  </div>` : ''}

  ${invoice?.notes ? `
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-top:16px;font-size:12px">
    <div style="font-weight:700;margin-bottom:4px;color:#92400e">Invoice Notes</div>
    <div>${invoice.notes}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <span>Generated: ${new Date().toLocaleString('en-IN')}</span>
    <span>${po.poNumber} · Invoice ${invoice?.invoiceNumber ?? '—'} · ${fmt(invoice?.invoiceAmount ?? po.totalAmount)}</span>
  </div>

</div>
</body>
</html>`;
  }

  async getPurchaseOrderAnalytics(
    restaurantId: string,
    branchId?: string,
  ): Promise<{
    totalPOs: number;
    totalValue: number;
    statusBreakdown: Record<string, number>;
    supplierBreakdown: Array<{ name: string; count: number; value: number }>;
    avgDeliveryTime: number;
    onTimeDeliveryPercent: number;
  }> {
    const matchFilter: any = { restaurantId: new Types.ObjectId(restaurantId) };
    if (branchId) {
      matchFilter.branchId = new Types.ObjectId(branchId);
    }

    const [statusStats, supplierStats, deliveryStats] = await Promise.all([
      // Status breakdown
      this.purchaseOrderModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totalAmount' } } },
      ]),

      // Supplier breakdown
      this.purchaseOrderModel.aggregate([
        { $match: matchFilter },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'supplierId',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        { $unwind: '$supplier' },
        {
          $group: {
            _id: '$supplierId',
            name: { $first: '$supplier.name' },
            count: { $sum: 1 },
            value: { $sum: '$totalAmount' },
          },
        },
        { $sort: { value: -1 } },
        { $limit: 10 },
      ]),

      // Delivery performance
      this.purchaseOrderModel.aggregate([
        {
          $match: {
            ...matchFilter,
            status: { $in: ['delivered', 'partial'] },
            'tracking.deliveredAt': { $exists: true }
          }
        },
        {
          $project: {
            deliveryTime: {
              $subtract: ['$tracking.deliveredAt', '$createdAt']
            },
            isOnTime: {
              $cond: {
                if: { $and: ['$delivery.expectedDate', '$tracking.deliveredAt'] },
                then: { $lte: ['$tracking.deliveredAt', '$delivery.expectedDate'] },
                else: true
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDeliveryTime: { $avg: '$deliveryTime' },
            onTimeCount: { $sum: { $cond: ['$isOnTime', 1, 0] } },
            totalDelivered: { $sum: 1 }
          }
        }
      ])
    ]);

    const statusBreakdown: Record<string, number> = {};
    let totalPOs = 0;
    let totalValue = 0;

    statusStats.forEach(stat => {
      statusBreakdown[stat._id] = stat.count;
      totalPOs += stat.count;
      totalValue += stat.value;
    });

    const supplierBreakdown = supplierStats.map(stat => ({
      name: stat.name,
      count: stat.count,
      value: stat.value,
    }));

    const avgDeliveryTime = deliveryStats[0]?.avgDeliveryTime
      ? Math.round(deliveryStats[0].avgDeliveryTime / (1000 * 60 * 60 * 24)) // Convert to days
      : 0;

    const onTimeDeliveryPercent = deliveryStats[0]?.totalDelivered > 0
      ? Math.round((deliveryStats[0].onTimeCount / deliveryStats[0].totalDelivered) * 100)
      : 0;

    return {
      totalPOs,
      totalValue,
      statusBreakdown,
      supplierBreakdown,
      avgDeliveryTime,
      onTimeDeliveryPercent,
    };
  }

  private calculatePOTotals(items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>) {
    const processedItems = items.map(item => ({
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.quantity * item.unitCost,
      notes: item.notes,
      receivedQuantity: 0,
      status: 'pending' as const,
    }));

    const subtotal = processedItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalAmount = subtotal; // TODO: Add tax calculation

    return {
      items: processedItems,
      subtotal,
      totalAmount,
    };
  }

  private async generatePONumber(restaurantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the highest PO number for today
    const regex = new RegExp(`^PO-${datePrefix}-`);
    const existingPOs = await this.purchaseOrderModel
      .find({
        restaurantId,
        poNumber: { $regex: regex },
      })
      .sort({ poNumber: -1 })
      .limit(1)
      .lean();

    let nextNumber = 1;
    if (existingPOs.length > 0) {
      const lastPONumber = existingPOs[0].poNumber;
      const lastNumber = parseInt(lastPONumber.slice(-3), 10);
      nextNumber = lastNumber + 1;
    }

    return `PO-${datePrefix}-${nextNumber.toString().padStart(3, '0')}`;
  }

  private isDeliveryOnTime(po: PurchaseOrder): boolean {
    if (!po.delivery?.expectedDate || !po.tracking?.deliveredAt) {
      return true; // No expected date, consider on time
    }

    const expectedDate = new Date(po.delivery.expectedDate);
    const deliveredDate = new Date(po.tracking.deliveredAt);

    return deliveredDate <= expectedDate;
  }
}