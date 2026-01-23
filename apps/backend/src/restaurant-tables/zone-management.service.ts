import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RestaurantTable, RestaurantTableDocument } from './schemas/restaurant-table.schema';
import { Zone, ZoneDocument } from './schemas/zone.schema';
import { RestaurantsService } from '../restaurants/restaurants.service';
import {
  CreateZoneDto,
  UpdateZoneDto,
  ZoneResponseDto,
  ZonesListResponseDto,
  BulkUpdateZonesDto
} from './dtos/zone-management.dto';

@Injectable()
export class ZoneManagementService {
  constructor(
    @InjectModel(RestaurantTable.name)
    private readonly tableModel: Model<RestaurantTableDocument>,
    @InjectModel(Zone.name)
    private readonly zoneModel: Model<ZoneDocument>,
    private readonly restaurantsService: RestaurantsService
  ) {}

  /**
   * Get all zones for a restaurant
   */
  async getZones(restaurantId: string): Promise<ZonesListResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    // Get all zones from the zones collection
    const zones = await this.zoneModel
      .find({ restaurantId, isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .exec();

    // Get table counts for each zone
    const tableCounts = await this.tableModel.aggregate([
      {
        $match: {
          restaurantId,
          isActive: true,
          zone: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$zone',
          tableCount: { $sum: 1 }
        }
      }
    ]).exec();

    const tableCountMap = new Map(
      tableCounts.map(tc => [tc._id, tc.tableCount])
    );

    return {
      zones: zones.map(zone => ({
        id: zone._id.toString(),
        name: zone.name,
        tableCount: tableCountMap.get(zone.name) || 0,
        createdAt: zone.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: zone.updatedAt?.toISOString() || new Date().toISOString()
      }))
    };
  }

  /**
   * Get zones for a specific branch
   */
  async getZonesByBranch(restaurantId: string, branchId: string): Promise<ZonesListResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    // Get zones for the specific branch
    const zones = await this.zoneModel
      .find({ restaurantId, branchId, isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .exec();

    // Get table counts for each zone in this branch
    const tableCounts = await this.tableModel.aggregate([
      {
        $match: {
          restaurantId,
          branchId,
          isActive: true,
          zone: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$zone',
          tableCount: { $sum: 1 }
        }
      }
    ]).exec();

    const tableCountMap = new Map(
      tableCounts.map(tc => [tc._id, tc.tableCount])
    );

    return {
      zones: zones.map(zone => ({
        id: zone._id.toString(),
        name: zone.name,
        tableCount: tableCountMap.get(zone.name) || 0,
        createdAt: zone.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: zone.updatedAt?.toISOString() || new Date().toISOString()
      }))
    };
  }

  /**
   * Create a new zone
   */
  async createZone(restaurantId: string, dto: CreateZoneDto): Promise<ZoneResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    const zoneName = dto.name.trim();

    // Check if zone already exists
    const existingZone = await this.zoneModel.findOne({
      restaurantId,
      name: zoneName,
      isActive: true
    }).exec();

    if (existingZone) {
      throw new ConflictException(`Zone '${zoneName}' already exists`);
    }

    // Create the zone
    const zone = await this.zoneModel.create({
      restaurantId,
      name: zoneName,
    });

    return {
      id: zone._id.toString(),
      name: zone.name,
      tableCount: 0,
      createdAt: zone.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: zone.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  /**
   * Create a new zone for a specific branch
   */
  async createZoneForBranch(restaurantId: string, branchId: string, dto: CreateZoneDto): Promise<ZoneResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    const zoneName = dto.name.trim();

    // Check if zone already exists in this branch
    const existingZone = await this.zoneModel.findOne({
      restaurantId,
      branchId,
      name: zoneName,
      isActive: true
    }).exec();

    if (existingZone) {
      throw new ConflictException(`Zone '${zoneName}' already exists in this branch`);
    }

    // Create the zone for this branch
    const zone = await this.zoneModel.create({
      restaurantId,
      branchId,
      name: zoneName,
    });

    return {
      id: zone._id.toString(),
      name: zone.name,
      tableCount: 0,
      createdAt: zone.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: zone.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  /**
   * Update/rename a zone
   */
  async updateZone(restaurantId: string, zoneId: string, dto: UpdateZoneDto): Promise<ZoneResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    const newZoneName = dto.name.trim();

    // Find the zone to update
    const zone = await this.zoneModel.findOne({
      _id: zoneId,
      restaurantId,
      isActive: true
    }).exec();

    if (!zone) {
      throw new NotFoundException(`Zone not found`);
    }

    const oldZoneName = zone.name;

    // Check if new name conflicts with existing zone
    if (oldZoneName !== newZoneName) {
      const existingZone = await this.zoneModel.findOne({
        restaurantId,
        name: newZoneName,
        isActive: true,
        _id: { $ne: zoneId }
      }).exec();

      if (existingZone) {
        throw new ConflictException(`Zone '${newZoneName}' already exists`);
      }
    }

    // Update the zone name
    zone.name = newZoneName;
    await zone.save();

    // Update all tables with the old zone name to use the new zone name
    await this.tableModel.updateMany(
      {
        restaurantId,
        zone: oldZoneName,
        isActive: true
      },
      {
        $set: { zone: newZoneName }
      }
    ).exec();

    // Get table count
    const tableCount = await this.tableModel.countDocuments({
      restaurantId,
      zone: newZoneName,
      isActive: true
    }).exec();

    return {
      id: zone._id.toString(),
      name: zone.name,
      tableCount,
      createdAt: zone.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: zone.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  /**
   * Delete a zone (only if no tables are assigned to it)
   */
  async deleteZone(restaurantId: string, zoneId: string): Promise<void> {
    await this.ensureRestaurantExists(restaurantId);

    // Find the zone to delete
    const zone = await this.zoneModel.findOne({
      _id: zoneId,
      restaurantId,
      isActive: true
    }).exec();

    if (!zone) {
      throw new NotFoundException(`Zone not found`);
    }

    // Check if zone has any tables
    const tablesInZone = await this.tableModel.countDocuments({
      restaurantId,
      zone: zone.name,
      isActive: true
    }).exec();

    if (tablesInZone > 0) {
      throw new BadRequestException(
        `Cannot delete zone '${zone.name}' because it has ${tablesInZone} table(s) assigned. Please reassign tables before deleting.`
      );
    }

    // Delete the zone
    await this.zoneModel.deleteOne({ _id: zoneId, restaurantId }).exec();
  }

  /**
   * Bulk update zones - this allows reordering and managing the complete zone list
   */
  async bulkUpdateZones(restaurantId: string, dto: BulkUpdateZonesDto): Promise<ZonesListResponseDto> {
    await this.ensureRestaurantExists(restaurantId);

    // This endpoint is primarily for frontend state management
    // The actual zone changes happen when tables are updated with new zone assignments
    return this.getZones(restaurantId);
  }

  /**
   * Get tables count for a specific zone
   */
  async getZoneTableCount(restaurantId: string, zoneName: string): Promise<number> {
    return this.tableModel.countDocuments({
      restaurantId,
      zone: zoneName,
      isActive: true
    }).exec();
  }

  private async ensureRestaurantExists(restaurantId: string): Promise<void> {
    await this.restaurantsService.findById(restaurantId);
  }

}