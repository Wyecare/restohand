import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { GstRate, GstRateDocument } from './schemas/gst-rate.schema';
import { HsnCode, HsnCodeDocument } from './schemas/hsn-code.schema';
import { TaxInvoice, TaxInvoiceDocument } from './schemas/tax-invoice.schema';
import { CreateGstRateDto } from './dtos/create-gst-rate.dto';
import { UpdateGstRateDto } from './dtos/update-gst-rate.dto';
import { CreateHsnCodeDto } from './dtos/create-hsn-code.dto';
import { GstRateResponseDto, GstRateListResponseDto } from './dtos/gst-rate-response.dto';
import { HsnCodeResponseDto, HsnCodeListResponseDto } from './dtos/hsn-code-response.dto';

export interface TaxCalculation {
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  taxType: 'intra-state' | 'inter-state';
}

export interface OrderItemWithTax {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  hsnCode?: string;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalWithTax: number;
}

@Injectable()
export class GstService {
  constructor(
    @InjectModel(GstRate.name)
    private readonly gstRateModel: Model<GstRateDocument>,
    @InjectModel(HsnCode.name)
    private readonly hsnCodeModel: Model<HsnCodeDocument>,
    @InjectModel(TaxInvoice.name)
    private readonly taxInvoiceModel: Model<TaxInvoiceDocument>,
  ) {}

  // GST Rate Management
  async createGstRate(
    restaurantId: string,
    dto: CreateGstRateDto
  ): Promise<GstRateResponseDto> {
    // Validate GST rate calculations
    this.validateGstRates(dto.cgstRate, dto.sgstRate, dto.igstRate, dto.totalGstRate);

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.gstRateModel.updateMany(
        { restaurantId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const gstRate = await this.gstRateModel.create({
      ...dto,
      restaurantId,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    });

    return this.toGstRateDto(gstRate);
  }

  async findGstRates(restaurantId: string): Promise<GstRateListResponseDto> {
    const gstRates = await this.gstRateModel
      .find({ restaurantId })
      .sort({ isDefault: -1, effectiveFrom: -1 });

    return {
      data: gstRates.map(rate => this.toGstRateDto(rate)),
      total: gstRates.length,
    };
  }

  async findGstRateById(id: string): Promise<GstRateResponseDto> {
    const gstRate = await this.gstRateModel.findById(id);
    if (!gstRate) {
      throw new NotFoundException(`GST rate ${id} not found`);
    }
    return this.toGstRateDto(gstRate);
  }

  async updateGstRate(
    id: string,
    dto: UpdateGstRateDto
  ): Promise<GstRateResponseDto> {
    if (dto.cgstRate !== undefined || dto.sgstRate !== undefined ||
        dto.igstRate !== undefined || dto.totalGstRate !== undefined) {
      const existing = await this.gstRateModel.findById(id);
      if (!existing) {
        throw new NotFoundException(`GST rate ${id} not found`);
      }

      const cgstRate = dto.cgstRate ?? existing.cgstRate;
      const sgstRate = dto.sgstRate ?? existing.sgstRate;
      const igstRate = dto.igstRate ?? existing.igstRate;
      const totalGstRate = dto.totalGstRate ?? existing.totalGstRate;

      this.validateGstRates(cgstRate, sgstRate, igstRate, totalGstRate);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      const existing = await this.gstRateModel.findById(id);
      if (existing) {
        await this.gstRateModel.updateMany(
          { restaurantId: existing.restaurantId, isDefault: true, _id: { $ne: id } },
          { $set: { isDefault: false } }
        );
      }
    }

    const updateData: any = { ...dto };
    if (dto.effectiveFrom) {
      updateData.effectiveFrom = new Date(dto.effectiveFrom);
    }
    if (dto.effectiveTo) {
      updateData.effectiveTo = new Date(dto.effectiveTo);
    }

    const updated = await this.gstRateModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new NotFoundException(`GST rate ${id} not found`);
    }

    return this.toGstRateDto(updated);
  }

  async deleteGstRate(id: string): Promise<void> {
    const result = await this.gstRateModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`GST rate ${id} not found`);
    }
  }

  async getDefaultGstRate(restaurantId: string): Promise<GstRateResponseDto | null> {
    const defaultRate = await this.gstRateModel.findOne({
      restaurantId,
      isDefault: true,
      isActive: true,
    });

    return defaultRate ? this.toGstRateDto(defaultRate) : null;
  }

  // HSN Code Management
  async createHsnCode(dto: CreateHsnCodeDto): Promise<HsnCodeResponseDto> {
    // Check if HSN code already exists
    const existing = await this.hsnCodeModel.findOne({ code: dto.code });
    if (existing) {
      throw new ConflictException(`HSN code ${dto.code} already exists`);
    }

    const hsnCode = await this.hsnCodeModel.create(dto);
    return this.toHsnCodeDto(hsnCode);
  }

  async findHsnCodes(query?: {
    search?: string;
    category?: string;
    isPopular?: boolean;
  }): Promise<HsnCodeListResponseDto> {
    const filter: FilterQuery<HsnCodeDocument> = { isActive: true };

    if (query?.category) {
      filter.category = query.category;
    }

    if (query?.isPopular !== undefined) {
      filter.isPopular = query.isPopular;
    }

    let mongoQuery = this.hsnCodeModel.find(filter);

    if (query?.search) {
      // Use text search if available, otherwise regex search
      mongoQuery = mongoQuery.find({
        $or: [
          { $text: { $search: query.search } },
          { description: { $regex: query.search, $options: 'i' } },
          { code: { $regex: query.search, $options: 'i' } },
        ]
      });
    }

    const hsnCodes = await mongoQuery
      .sort({ isPopular: -1, code: 1 })
      .limit(100); // Limit results for performance

    return {
      data: hsnCodes.map(code => this.toHsnCodeDto(code)),
      total: hsnCodes.length,
    };
  }

  async findHsnCodeById(id: string): Promise<HsnCodeResponseDto> {
    const hsnCode = await this.hsnCodeModel.findById(id);
    if (!hsnCode) {
      throw new NotFoundException(`HSN code ${id} not found`);
    }
    return this.toHsnCodeDto(hsnCode);
  }

  async findHsnCodeByCode(code: string): Promise<HsnCodeResponseDto | null> {
    const hsnCode = await this.hsnCodeModel.findOne({ code, isActive: true });
    return hsnCode ? this.toHsnCodeDto(hsnCode) : null;
  }

  // Tax Calculation Methods
  async calculateOrderTax(
    restaurantId: string,
    orderItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      hsnCode?: string;
      gstRateId?: string;
    }>,
    customerState?: string // For determining intra-state vs inter-state
  ): Promise<{
    items: OrderItemWithTax[];
    summary: TaxCalculation;
  }> {
    const restaurant = await this.getRestaurantState(restaurantId);
    const taxType = this.determineTaxType(restaurant.state, customerState);

    const itemsWithTax: OrderItemWithTax[] = [];
    let totalSubtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const item of orderItems) {
      const gstRate = await this.getApplicableGstRate(
        restaurantId,
        item.gstRateId,
        item.hsnCode
      );

      const totalAmount = item.quantity * item.unitPrice;
      const taxCalculation = this.calculateItemTax(totalAmount, gstRate, taxType);

      const itemWithTax: OrderItemWithTax = {
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount,
        hsnCode: item.hsnCode,
        gstRate: gstRate.totalGstRate,
        cgstAmount: taxCalculation.cgstAmount,
        sgstAmount: taxCalculation.sgstAmount,
        igstAmount: taxCalculation.igstAmount,
        totalTaxAmount: taxCalculation.totalTaxAmount,
        totalWithTax: totalAmount + taxCalculation.totalTaxAmount,
      };

      itemsWithTax.push(itemWithTax);
      totalSubtotal += totalAmount;
      totalCgst += taxCalculation.cgstAmount;
      totalSgst += taxCalculation.sgstAmount;
      totalIgst += taxCalculation.igstAmount;
    }

    const summary: TaxCalculation = {
      subtotal: totalSubtotal,
      cgstAmount: totalCgst,
      sgstAmount: totalSgst,
      igstAmount: totalIgst,
      totalTaxAmount: totalCgst + totalSgst + totalIgst,
      totalAmount: totalSubtotal + totalCgst + totalSgst + totalIgst,
      taxType,
    };

    return { items: itemsWithTax, summary };
  }

  // Tax Invoice Generation
  async generateTaxInvoice(
    restaurantId: string,
    orderId: string,
    orderData: {
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      customerGstin?: string;
      tableNumber?: string;
      items: OrderItemWithTax[];
      summary: TaxCalculation;
      discountAmount?: number;
    }
  ): Promise<string> {
    const invoiceNumber = await this.generateInvoiceNumber(restaurantId);
    const restaurant = await this.getRestaurantDetails(restaurantId);

    const roundOffAmount = this.calculateRoundOff(orderData.summary.totalAmount);
    const finalAmount = orderData.summary.totalAmount + roundOffAmount;

    await this.taxInvoiceModel.create({
      restaurantId,
      orderId,
      invoiceNumber,
      invoiceDate: new Date(),
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerEmail: orderData.customerEmail,
      customerGstin: orderData.customerGstin,
      tableNumber: orderData.tableNumber,
      lineItems: orderData.items.map(item => ({
        name: item.name,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unit: 'unit',
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalTaxAmount: item.totalTaxAmount,
        totalWithTax: item.totalWithTax,
      })),
      subtotalAmount: orderData.summary.subtotal,
      totalCgstAmount: orderData.summary.cgstAmount,
      totalSgstAmount: orderData.summary.sgstAmount,
      totalIgstAmount: orderData.summary.igstAmount,
      totalTaxAmount: orderData.summary.totalTaxAmount,
      totalAmount: finalAmount,
      discountAmount: orderData.discountAmount || 0,
      roundOffAmount,
      restaurantGstin: restaurant.gstin,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      taxType: orderData.summary.taxType,
      status: 'final',
    });

    return invoiceNumber;
  }

  // Private helper methods
  private validateGstRates(
    cgstRate: number,
    sgstRate: number,
    igstRate: number,
    totalGstRate: number
  ): void {
    // For intra-state: CGST + SGST should equal total GST
    // For inter-state: IGST should equal total GST
    const intraTotalRate = cgstRate + sgstRate;

    if (Math.abs(intraTotalRate - totalGstRate) > 0.01 &&
        Math.abs(igstRate - totalGstRate) > 0.01) {
      throw new BadRequestException(
        'GST rates validation failed. Total GST should equal CGST+SGST or IGST'
      );
    }
  }

  private async getApplicableGstRate(
    restaurantId: string,
    gstRateId?: string,
    hsnCode?: string
  ): Promise<GstRateDocument> {
    if (gstRateId) {
      const rate = await this.gstRateModel.findById(gstRateId);
      if (rate) return rate;
    }

    if (hsnCode) {
      const hsn = await this.hsnCodeModel.findOne({ code: hsnCode });
      if (hsn) {
        const rate = await this.gstRateModel.findOne({
          restaurantId,
          totalGstRate: hsn.defaultGstRate,
          isActive: true,
        });
        if (rate) return rate;
      }
    }

    // Fall back to default rate
    const defaultRate = await this.gstRateModel.findOne({
      restaurantId,
      isDefault: true,
      isActive: true,
    });

    if (!defaultRate) {
      throw new BadRequestException('No applicable GST rate found');
    }

    return defaultRate;
  }

  private calculateItemTax(
    amount: number,
    gstRate: GstRateDocument,
    taxType: 'intra-state' | 'inter-state'
  ): {
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTaxAmount: number;
  } {
    if (taxType === 'intra-state') {
      const cgstAmount = (amount * gstRate.cgstRate) / 100;
      const sgstAmount = (amount * gstRate.sgstRate) / 100;
      return {
        cgstAmount: Math.round(cgstAmount * 100) / 100,
        sgstAmount: Math.round(sgstAmount * 100) / 100,
        igstAmount: 0,
        totalTaxAmount: Math.round((cgstAmount + sgstAmount) * 100) / 100,
      };
    } else {
      const igstAmount = (amount * gstRate.igstRate) / 100;
      return {
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: Math.round(igstAmount * 100) / 100,
        totalTaxAmount: Math.round(igstAmount * 100) / 100,
      };
    }
  }

  private determineTaxType(
    restaurantState: string,
    customerState?: string
  ): 'intra-state' | 'inter-state' {
    if (!customerState || customerState === restaurantState) {
      return 'intra-state';
    }
    return 'inter-state';
  }

  private async generateInvoiceNumber(restaurantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Count invoices for this month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0);

    const count = await this.taxInvoiceModel.countDocuments({
      restaurantId,
      invoiceDate: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  private calculateRoundOff(amount: number): number {
    const rounded = Math.round(amount);
    return rounded - amount;
  }

  private async getRestaurantState(restaurantId: string): Promise<{ state: string }> {
    // TODO: Integrate with restaurant service to get actual state
    // For now, assume Kerala as default for testing
    return { state: 'Kerala' };
  }

  private async getRestaurantDetails(restaurantId: string): Promise<{
    gstin: string;
    name: string;
    address: object;
  }> {
    // TODO: Integrate with restaurant service to get actual details
    // For now, return placeholder data for testing
    return {
      gstin: `32AAAAA0000A1Z${Math.floor(Math.random() * 10)}`, // Sample GSTIN format
      name: 'Test Restaurant',
      address: {
        line1: 'Test Address Line 1',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682001',
        country: 'IN'
      },
    };
  }

  private toGstRateDto(doc: GstRateDocument): GstRateResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId,
      categoryName: doc.categoryName,
      description: doc.description,
      cgstRate: doc.cgstRate,
      sgstRate: doc.sgstRate,
      igstRate: doc.igstRate,
      totalGstRate: doc.totalGstRate,
      isActive: doc.isActive,
      isDefault: doc.isDefault,
      effectiveFrom: doc.effectiveFrom.toISOString(),
      effectiveTo: doc.effectiveTo?.toISOString(),
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private toHsnCodeDto(doc: HsnCodeDocument): HsnCodeResponseDto {
    return {
      id: doc._id.toString(),
      code: doc.code,
      description: doc.description,
      chapter: doc.chapter,
      heading: doc.heading,
      defaultGstRate: doc.defaultGstRate,
      keywords: doc.keywords,
      category: doc.category,
      isActive: doc.isActive,
      isPopular: doc.isPopular,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}