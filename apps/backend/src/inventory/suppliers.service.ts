import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';

export interface CreateSupplierDto {
  restaurantId: string;
  name: string;
  supplierCode?: string; // Auto-generated if not provided
  contact?: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    additionalEmails?: string[];
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  gstin?: string;
  panNumber?: string;
  paymentTerms?: {
    creditDays?: number;
    paymentMethod?: 'cash' | 'credit' | 'advance' | 'cod';
    discountPercent?: number;
    discountDays?: number;
    creditLimit?: number;
  };
  categories?: string[];
  suppliedBranches?: string[];
  notes?: string;
  createdBy?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  contact?: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    additionalEmails?: string[];
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  gstin?: string;
  panNumber?: string;
  paymentTerms?: {
    creditDays?: number;
    paymentMethod?: 'cash' | 'credit' | 'advance' | 'cod';
    discountPercent?: number;
    discountDays?: number;
    creditLimit?: number;
  };
  categories?: string[];
  suppliedBranches?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface SupplierQueryDto {
  search?: string;
  category?: string;
  branchId?: string;
  isActive?: boolean;
  hasEmail?: boolean;
  page?: number;
  limit?: number;
}

export interface SupplierPerformanceDto {
  supplierId: string;
  rating?: number;
  onTimeDelivery?: boolean;
  qualityRating?: number;
  orderValue?: number;
  evaluatedBy: string;
}

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
  ) {}

  async createSupplier(dto: CreateSupplierDto): Promise<Supplier> {
    // Auto-generate supplier code if not provided
    if (!dto.supplierCode) {
      dto.supplierCode = await this.generateSupplierCode(dto.restaurantId);
    } else {
      // Check if supplier code is unique for this restaurant
      const existing = await this.supplierModel.findOne({
        restaurantId: dto.restaurantId,
        supplierCode: dto.supplierCode.toUpperCase(),
      });

      if (existing) {
        throw new ConflictException(
          `Supplier code ${dto.supplierCode} already exists`,
        );
      }
    }

    const supplier = new this.supplierModel({
      ...dto,
      supplierCode: dto.supplierCode.toUpperCase(),
      contact: dto.contact || {},
      paymentTerms: dto.paymentTerms || {},
      performance: {
        rating: 3,
        onTimeDeliveryPercent: 0,
        qualityRating: 0,
        totalOrders: 0,
        totalOrderValue: 0,
      },
      categories: dto.categories || [],
      suppliedBranches: dto.suppliedBranches || [],
    });

    const savedSupplier = await supplier.save();

    this.logger.log(
      `Created supplier ${savedSupplier.name} (${savedSupplier.supplierCode}) for restaurant ${dto.restaurantId}`,
    );

    return savedSupplier;
  }

  async updateSupplier(
    supplierId: string,
    dto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const supplier = await this.supplierModel.findById(supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }

    // Update fields
    Object.assign(supplier, dto);

    // Merge nested objects
    if (dto.contact) {
      supplier.contact = { ...supplier.contact, ...dto.contact };
    }
    if (dto.address) {
      supplier.address = { ...supplier.address, ...dto.address };
    }
    if (dto.paymentTerms) {
      supplier.paymentTerms = { ...supplier.paymentTerms, ...dto.paymentTerms };
    }

    await supplier.save();

    this.logger.log(`Updated supplier ${supplier.name} (${supplierId})`);
    return supplier;
  }

  async getSuppliers(
    restaurantId: string,
    filters?: SupplierQueryDto,
  ): Promise<{
    suppliers: Supplier[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: FilterQuery<SupplierDocument> = {
      restaurantId,
    };

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.branchId) {
      query.suppliedBranches = filters.branchId;
    }

    if (filters?.category) {
      query.categories = filters.category;
    }

    if (filters?.hasEmail) {
      query['contact.email'] = { $exists: true, $ne: '' };
    }

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { supplierCode: { $regex: filters.search, $options: 'i' } },
        { 'contact.contactPerson': { $regex: filters.search, $options: 'i' } },
        { 'contact.phone': { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      this.supplierModel
        .find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.supplierModel.countDocuments(query),
    ]);

    return {
      suppliers: suppliers as Supplier[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSupplierById(supplierId: string): Promise<Supplier> {
    const supplier = await this.supplierModel.findById(supplierId).lean();
    if (!supplier) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }
    return supplier as Supplier;
  }

  async deleteSupplier(supplierId: string): Promise<void> {
    const result = await this.supplierModel.findByIdAndDelete(supplierId);
    if (!result) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }

    this.logger.log(`Deleted supplier ${result.name} (${supplierId})`);
  }

  async updateSupplierPerformance(dto: SupplierPerformanceDto): Promise<Supplier> {
    const supplier = await this.supplierModel.findById(dto.supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier ${dto.supplierId} not found`);
    }

    const performance = supplier.performance;

    // Update rating
    if (dto.rating) {
      performance.rating = dto.rating;
    }

    // Update on-time delivery
    if (dto.onTimeDelivery !== undefined) {
      performance.totalOrders += 1;
      if (dto.onTimeDelivery) {
        performance.onTimeDeliveryPercent =
          ((performance.onTimeDeliveryPercent * (performance.totalOrders - 1)) + 100) /
          performance.totalOrders;
      } else {
        performance.onTimeDeliveryPercent =
          (performance.onTimeDeliveryPercent * (performance.totalOrders - 1)) /
          performance.totalOrders;
      }
    }

    // Update quality rating
    if (dto.qualityRating) {
      performance.qualityRating = dto.qualityRating;
    }

    // Update order value
    if (dto.orderValue) {
      performance.totalOrderValue += dto.orderValue;
      performance.lastOrderDate = new Date();
    }

    performance.lastEvaluationDate = new Date();
    await supplier.save();

    this.logger.log(
      `Updated performance for supplier ${supplier.name} (${dto.supplierId})`,
    );

    return supplier;
  }

  async getSuppliersByCategory(
    restaurantId: string,
    category: string,
  ): Promise<Supplier[]> {
    return this.supplierModel
      .find({
        restaurantId,
        categories: category,
        isActive: true,
      })
      .sort({ 'performance.rating': -1, name: 1 })
      .lean() as Promise<Supplier[]>;
  }

  async getSuppliersByBranch(
    restaurantId: string,
    branchId: string,
  ): Promise<Supplier[]> {
    return this.supplierModel
      .find({
        restaurantId,
        suppliedBranches: branchId,
        isActive: true,
      })
      .sort({ name: 1 })
      .lean() as Promise<Supplier[]>;
  }

  async getSupplierAnalytics(restaurantId: string): Promise<{
    totalSuppliers: number;
    activeSuppliers: number;
    suppliersWithEmail: number;
    averageRating: number;
    categoryCounts: Record<string, number>;
    topRatedSuppliers: Supplier[];
  }> {
    const [suppliers, topRated] = await Promise.all([
      this.supplierModel.find({ restaurantId }).lean(),
      this.supplierModel
        .find({ restaurantId, isActive: true })
        .sort({ 'performance.rating': -1 })
        .limit(5)
        .lean(),
    ]);

    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.isActive).length;
    const suppliersWithEmail = suppliers.filter(
      s => s.contact?.email && s.contact.email.trim() !== '',
    ).length;

    const averageRating = suppliers.length > 0
      ? suppliers.reduce((sum, s) => sum + (s.performance?.rating || 0), 0) / suppliers.length
      : 0;

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    suppliers.forEach(supplier => {
      supplier.categories?.forEach(category => {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
    });

    return {
      totalSuppliers,
      activeSuppliers,
      suppliersWithEmail,
      averageRating: Math.round(averageRating * 100) / 100,
      categoryCounts,
      topRatedSuppliers: topRated as Supplier[],
    };
  }

  private async generateSupplierCode(restaurantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    // Find the highest supplier code for this month
    const prefix = `SUP${year}${month}`;
    const existingSuppliers = await this.supplierModel
      .find({
        restaurantId,
        supplierCode: { $regex: `^${prefix}` },
      })
      .sort({ supplierCode: -1 })
      .limit(1)
      .lean();

    let nextNumber = 1;
    if (existingSuppliers.length > 0) {
      const lastCode = existingSuppliers[0].supplierCode;
      const lastNumber = parseInt(lastCode.slice(-3), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }
}