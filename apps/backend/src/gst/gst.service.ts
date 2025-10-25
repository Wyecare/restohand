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
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { CreateGstRateDto } from './dtos/create-gst-rate.dto';
import { QueryGstRatesDto } from './dtos/query-gst-rates.dto';
import { UpdateGstRateDto } from './dtos/update-gst-rate.dto';
import { CreateHsnCodeDto } from './dtos/create-hsn-code.dto';
import { QueryHsnCodesDto } from './dtos/query-hsn-codes.dto';
import { GstRateResponseDto, GstRateListResponseDto } from './dtos/gst-rate-response.dto';
import { HsnCodeResponseDto, HsnCodeListResponseDto } from './dtos/hsn-code-response.dto';
import { PaginationUtil } from '../common/utils/pagination.util';

export interface TaxCalculation {
  grossAmount: number;
  discountAmount: number;
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
  hsnCode?: string;
  gstRateId?: string;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  discountAmount: number;
  taxableAmount: number;
  grossAmount: number;
  totalWithTax: number;
  isTaxInclusive: boolean;
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
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
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

  async findGstRates(
    restaurantId: string,
    query: QueryGstRatesDto = {}
  ): Promise<GstRateListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query);

    // Build filter
    const filter: FilterQuery<GstRateDocument> = { restaurantId };

    if (query.search) {
      filter.category = { $regex: query.search, $options: 'i' };
    }

    // Execute queries in parallel
    const [total, gstRates] = await Promise.all([
      this.gstRateModel.countDocuments(filter),
      this.gstRateModel
        .find(filter)
        .sort({ isDefault: -1, effectiveFrom: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = gstRates.map(rate => this.toGstRateDto(rate));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
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

  async findHsnCodes(query: QueryHsnCodesDto = {}): Promise<HsnCodeListResponseDto> {
    const { skip, limit, page } = PaginationUtil.parsePaginationOptions(query, 50);

    // Build filter
    const filter: FilterQuery<HsnCodeDocument> = { isActive: true };

    if (query.category) {
      filter.category = query.category;
    }

    // Build search query
    let searchFilter = {};
    if (query.search) {
      searchFilter = {
        $or: [
          { description: { $regex: query.search, $options: 'i' } },
          { code: { $regex: query.search, $options: 'i' } },
        ]
      };
    }

    const finalFilter = { ...filter, ...searchFilter };

    // Execute queries in parallel
    const [total, hsnCodes] = await Promise.all([
      this.hsnCodeModel.countDocuments(finalFilter),
      this.hsnCodeModel
        .find(finalFilter)
        .sort({ isPopular: -1, code: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = hsnCodes.map(code => this.toHsnCodeDto(code));

    return PaginationUtil.createPaginatedResponse(data, total, page, limit);
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
      gstRateOverride?: number;
      discountAmount?: number;
      isTaxInclusive?: boolean;
    }>,
    customerState?: string
  ): Promise<{
    items: OrderItemWithTax[];
    summary: TaxCalculation;
  }> {
    const restaurant = await this.getRestaurantState(restaurantId);
    const taxType = this.determineTaxType(restaurant.state, customerState);

    const itemsWithTax: OrderItemWithTax[] = [];
    let totalGross = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalTax = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalWithTax = 0;

    for (const item of orderItems) {
      const gstRate = await this.getApplicableGstRate(
        restaurantId,
        item.gstRateId,
        item.hsnCode,
        item.gstRateOverride
      );

      const grossAmount = this.roundToTwo(item.unitPrice * item.quantity);
      const requestedDiscount = this.roundToTwo(item.discountAmount ?? 0);
      const discountAmount = Math.min(requestedDiscount, grossAmount);
      const amountAfterDiscount = this.roundToTwo(
        Math.max(grossAmount - discountAmount, 0)
      );

      let taxableAmount: number;
      let taxAmount: number;

      if (gstRate.totalGstRate > 0) {
        if (item.isTaxInclusive) {
          const baseAmount = amountAfterDiscount / (1 + gstRate.totalGstRate / 100);
          taxableAmount = this.roundToTwo(baseAmount);
          taxAmount = this.roundToTwo(amountAfterDiscount - taxableAmount);
        } else {
          taxableAmount = amountAfterDiscount;
          taxAmount = this.roundToTwo(
            taxableAmount * (gstRate.totalGstRate / 100)
          );
        }
      } else {
        taxableAmount = amountAfterDiscount;
        taxAmount = 0;
      }

      taxAmount = this.roundToTwo(Math.max(taxAmount, 0));

      taxableAmount = this.roundToTwo(Math.max(taxableAmount, 0));

      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      if (taxType === 'intra-state') {
        cgstAmount = this.roundToTwo(taxableAmount * (gstRate.cgstRate / 100));
        sgstAmount = this.roundToTwo(taxableAmount * (gstRate.sgstRate / 100));
        const combined = this.roundToTwo(cgstAmount + sgstAmount);
        const diff = this.roundToTwo(taxAmount - combined);
        if (Math.abs(diff) >= 0.01) {
          sgstAmount = this.roundToTwo(sgstAmount + diff);
        }
        cgstAmount = this.roundToTwo(Math.max(cgstAmount, 0));
        sgstAmount = this.roundToTwo(Math.max(sgstAmount, 0));
      } else {
        igstAmount = this.roundToTwo(taxableAmount * (gstRate.igstRate / 100));
        const diff = this.roundToTwo(taxAmount - igstAmount);
        if (Math.abs(diff) >= 0.01) {
          igstAmount = this.roundToTwo(igstAmount + diff);
        }
        igstAmount = this.roundToTwo(Math.max(igstAmount, 0));
      }

      const lineTotalWithTax = item.isTaxInclusive
        ? amountAfterDiscount
        : this.roundToTwo(taxableAmount + taxAmount);

      const itemWithTax: OrderItemWithTax = {
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: this.roundToTwo(item.unitPrice),
        hsnCode: item.hsnCode,
        gstRateId: gstRate.gstRateId,
        gstRate: gstRate.totalGstRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTaxAmount: taxAmount,
        discountAmount,
        taxableAmount,
        grossAmount,
        totalWithTax: lineTotalWithTax,
        isTaxInclusive: !!item.isTaxInclusive,
      };

      itemsWithTax.push(itemWithTax);

      totalGross += grossAmount;
      totalDiscount += discountAmount;
      totalTaxable += taxableAmount;
      totalTax += taxAmount;
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;
      totalWithTax += lineTotalWithTax;
    }

    const summary: TaxCalculation = {
      grossAmount: this.roundToTwo(totalGross),
      discountAmount: this.roundToTwo(totalDiscount),
      subtotal: this.roundToTwo(totalTaxable),
      cgstAmount: this.roundToTwo(totalCgst),
      sgstAmount: this.roundToTwo(totalSgst),
      igstAmount: this.roundToTwo(totalIgst),
      totalTaxAmount: this.roundToTwo(totalTax),
      totalAmount: this.roundToTwo(totalWithTax),
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
    const finalAmount = this.roundToTwo(orderData.summary.totalAmount + roundOffAmount);

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
        unitPrice:
          item.quantity > 0
            ? this.roundToTwo(item.taxableAmount / item.quantity)
            : item.unitPrice,
        totalAmount: item.taxableAmount,
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
      discountAmount:
        orderData.discountAmount ?? orderData.summary.discountAmount ?? 0,
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
    hsnCode?: string,
    gstRateOverride?: number
  ): Promise<{
    gstRateId?: string;
    totalGstRate: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
  }> {
    if (gstRateId) {
      const rate = await this.gstRateModel.findOne({
        _id: gstRateId,
        restaurantId,
        isActive: true,
      });
      if (rate) {
        return {
          gstRateId: rate._id.toString(),
          totalGstRate: rate.totalGstRate,
          cgstRate: rate.cgstRate,
          sgstRate: rate.sgstRate,
          igstRate: rate.igstRate,
        };
      }
    }

    if (hsnCode) {
      const hsn = await this.hsnCodeModel.findOne({ code: hsnCode, isActive: true });
      if (hsn) {
        const rate = await this.gstRateModel.findOne({
          restaurantId,
          totalGstRate: hsn.defaultGstRate,
          isActive: true,
        });
        if (rate) {
          return {
            gstRateId: rate._id.toString(),
            totalGstRate: rate.totalGstRate,
            cgstRate: rate.cgstRate,
            sgstRate: rate.sgstRate,
            igstRate: rate.igstRate,
          };
        }
        gstRateOverride = hsn.defaultGstRate;
      }
    }

    const defaultRate = await this.gstRateModel.findOne({
      restaurantId,
      isDefault: true,
      isActive: true,
    });

    if (defaultRate) {
      return {
        gstRateId: defaultRate._id.toString(),
        totalGstRate: defaultRate.totalGstRate,
        cgstRate: defaultRate.cgstRate,
        sgstRate: defaultRate.sgstRate,
        igstRate: defaultRate.igstRate,
      };
    }

    if (typeof gstRateOverride === 'number') {
      return {
        gstRateId: undefined,
        ...this.createRateFromTotal(gstRateOverride),
      };
    }

    throw new BadRequestException('No applicable GST rate found');
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
    return this.roundToTwo(rounded - amount);
  }

  private roundToTwo(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private createRateFromTotal(total: number): {
    totalGstRate: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
  } {
    const normalizedTotal = Math.min(Math.max(total, 0), 100);
    const roundedTotal = this.roundToTwo(normalizedTotal);
    const half = this.roundToTwo(roundedTotal / 2);
    return {
      totalGstRate: roundedTotal,
      cgstRate: half,
      sgstRate: half,
      igstRate: roundedTotal,
    };
  }

  private async getRestaurantState(restaurantId: string): Promise<{ state: string }> {
    const restaurant = await this.restaurantModel
      .findById(restaurantId, { address: 1 })
      .lean();

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    const state = restaurant.address?.state;
    if (!state) {
      throw new BadRequestException('Restaurant state information is missing');
    }

    return { state };
  }

  private async getRestaurantDetails(restaurantId: string): Promise<{
    gstin: string;
    name: string;
    address: Record<string, unknown>;
  }> {
    const restaurant = await this.restaurantModel
      .findById(restaurantId)
      .lean();

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    if (!restaurant.gstin) {
      throw new BadRequestException('Restaurant GSTIN is not configured');
    }

    const { address } = restaurant;
    const { _id, ...addressWithoutId } = (address as Record<string, unknown>) ?? {};

    return {
      gstin: restaurant.gstin,
      name: restaurant.name,
      address: addressWithoutId,
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
