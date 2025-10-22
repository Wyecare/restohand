import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RestaurantTable, RestaurantTableDocument } from './schemas/restaurant-table.schema';
import { CreateRestaurantTableDto } from './dtos/create-restaurant-table.dto';
import { UpdateRestaurantTableDto } from './dtos/update-restaurant-table.dto';
import { RestaurantTableResponseDto } from './dtos/restaurant-table-response.dto';

@Injectable()
export class RestaurantTablesService {
  constructor(
    @InjectModel(RestaurantTable.name)
    private readonly tableModel: Model<RestaurantTableDocument>,
    private readonly restaurantsService: RestaurantsService
  ) {}

  async list(
    restaurantId: string,
    includeInactive = false
  ): Promise<RestaurantTableResponseDto[]> {
    const filter: FilterQuery<RestaurantTableDocument> = { restaurantId };
    if (!includeInactive) {
      filter.isActive = true;
    }

    const tables = await this.tableModel
      .find(filter)
      .sort({ displayOrder: 1, tableNumber: 1 })
      .exec();
    return tables.map((table) => this.toDto(table));
  }

  async create(
    restaurantId: string,
    dto: CreateRestaurantTableDto
  ): Promise<RestaurantTableResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    const tableNumber = dto.tableNumber.trim();
    const existing = await this.tableModel.findOne({
      restaurantId,
      tableNumber,
    });
    if (existing) {
      throw new ConflictException(
        `Table ${tableNumber} already exists for this restaurant`
      );
    }

    const created = await this.tableModel.create({
      restaurantId,
      tableNumber,
      displayName: dto.displayName?.trim() || undefined,
      capacity: dto.capacity,
      zone: dto.zone?.trim() || undefined,
      displayOrder: dto.displayOrder ?? 0,
    });
    return this.toDto(created);
  }

  async update(
    restaurantId: string,
    tableId: string,
    dto: UpdateRestaurantTableDto
  ): Promise<RestaurantTableResponseDto> {
    const table = await this.tableModel.findOne({
      _id: tableId,
      restaurantId,
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const nextTableNumber = dto.tableNumber?.trim();

    if (nextTableNumber && nextTableNumber.toLowerCase() !== table.tableNumber.toLowerCase()) {
      const existing = await this.tableModel.findOne({
        restaurantId,
        tableNumber: nextTableNumber,
      });
      if (existing) {
        throw new ConflictException(
          `Table ${nextTableNumber} already exists for this restaurant`
        );
      }
    }

    if (nextTableNumber) {
      table.tableNumber = nextTableNumber;
    }
    if (dto.displayName !== undefined) {
      table.displayName = dto.displayName.trim() || undefined;
    }
    if (dto.zone !== undefined) {
      table.zone = dto.zone.trim() || undefined;
    }
    if (dto.capacity !== undefined) {
      table.capacity = dto.capacity;
    }
    if (dto.displayOrder !== undefined) {
      table.displayOrder = dto.displayOrder;
    }

    await table.save();
    return this.toDto(table);
  }

  async archive(restaurantId: string, tableId: string): Promise<void> {
    const table = await this.tableModel.findOneAndUpdate(
      { _id: tableId, restaurantId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!table) {
      throw new NotFoundException('Table not found');
    }
  }

  async reactivate(restaurantId: string, tableId: string): Promise<RestaurantTableResponseDto> {
    const table = await this.tableModel.findOneAndUpdate(
      { _id: tableId, restaurantId },
      { $set: { isActive: true } },
      { new: true }
    );
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return this.toDto(table);
  }

  async generateQrCode(restaurantId: string, tableId: string) {
    const table = await this.tableModel.findOne({
      _id: tableId,
      restaurantId,
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return this.restaurantsService.generateQrCode(
      restaurantId,
      table.tableNumber
    );
  }

  private async ensureRestaurantExists(restaurantId: string) {
    await this.restaurantsService.findById(restaurantId);
  }

  private toDto(doc: RestaurantTableDocument): RestaurantTableResponseDto {
    return {
      id: doc._id.toString(),
      restaurantId: doc.restaurantId.toString(),
      tableNumber: doc.tableNumber,
      displayName: doc.displayName,
      capacity: doc.capacity,
      zone: doc.zone,
      displayOrder: doc.displayOrder ?? 0,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
