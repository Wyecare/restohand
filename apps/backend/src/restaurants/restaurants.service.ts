import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import * as QRCode from 'qrcode';
import type { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import type { UpdateRestaurantDto } from './dtos/update-restaurant.dto';
import type { QueryRestaurantsDto } from './dtos/query-restaurants.dto';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { RestaurantResponseDto } from './dtos/restaurant-response.dto';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../common/enums/user-role.enum';

interface PaginatedRestaurants {
  data: RestaurantResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    private readonly usersService: UsersService
  ) {}

  async create(
    dto: CreateRestaurantDto,
    actor?: AuthenticatedUser
  ): Promise<RestaurantResponseDto> {
    if (!actor?.uid) {
      throw new ForbiddenException('Unable to determine authenticated user');
    }

    await this.ensureSlugUnique(dto.slug);
    const created = await this.restaurantModel.create({
      ...dto,
      gstin: dto.gstin?.trim().toUpperCase(),
    });

    await this.usersService.attachRestaurantToUser(
      actor,
      created._id.toString(),
      [UserRole.Manager]
    );

    return this.toDto(created);
  }

  async findAll(query: QueryRestaurantsDto): Promise<PaginatedRestaurants> {
    const filter: FilterQuery<RestaurantDocument> = {};
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { slug: regex }];
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    if (query.city) {
      filter['address.city'] = new RegExp(query.city, 'i');
    }

    const page = Number(query.page ?? '1');
    const limit = Math.min(Number(query.limit ?? '20'), 100);
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.restaurantModel.countDocuments(filter),
      this.restaurantModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<RestaurantResponseDto> {
    const restaurant = await this.restaurantModel.findById(id);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${id} not found`);
    }
    return this.toDto(restaurant);
  }

  async generateQrCode(restaurantId: string, table?: string) {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    // Use customer QR domain for QR code URLs
    const baseUrl = process.env.CUSTOMER_FRONTEND_URL ?? process.env.USER_FRONTENT_URL ?? 'http://localhost:4200';
    const slug = restaurant.slug;
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/c/${slug}`);
    if (table) {
      url.searchParams.set('table', table);
    }

    const dataUrl = await QRCode.toDataURL(url.toString(), {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 6,
    });

    return {
      restaurant: this.toDto(restaurant),
      table: table ?? null,
      url: url.toString(),
      dataUrl,
    };
  }

  async update(
    id: string,
    dto: UpdateRestaurantDto
  ): Promise<RestaurantResponseDto> {
    if (dto.slug) {
      await this.ensureSlugUnique(dto.slug, id);
    }

    const updated = await this.restaurantModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...dto,
          gstin: dto.gstin?.trim().toUpperCase() ?? dto.gstin,
        },
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      throw new NotFoundException(`Restaurant ${id} not found`);
    }
    return this.toDto(updated);
  }

  async remove(id: string): Promise<void> {
    const result = await this.restaurantModel.findByIdAndUpdate(id, {
      $set: { isActive: false },
    });
    if (!result) {
      throw new NotFoundException(`Restaurant ${id} not found`);
    }
  }

  private async ensureSlugUnique(slug: string, ignoreId?: string) {
    const existing = await this.restaurantModel.findOne({ slug });
    if (
      existing &&
      (!ignoreId || existing._id.toString() !== ignoreId.toString())
    ) {
      throw new ConflictException(`Restaurant slug '${slug}' already exists`);
    }
  }

  private toDto(doc: RestaurantDocument): RestaurantResponseDto {
    const json = doc.toJSON<Restaurant>();
    return {
      id: doc._id.toString(),
      name: json.name,
      legalName: json.legalName,
      slug: json.slug,
      contactEmail: json.contactEmail,
      contactPhone: json.contactPhone,
      timezone: json.timezone,
      address: json.address,
      upi: json.upi,
      settings: json.settings,
      languages: json.languages,
      gstin: json.gstin,
      applyDefaultGstToMenuItems: json.applyDefaultGstToMenuItems ?? false,
      isActive: json.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
