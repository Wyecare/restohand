import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FloorPlan, FloorPlanDocument } from './schemas/floor-plan.schema';
import { TableStatus, TableStatusDocument, TableStatusType } from './schemas/table-status.schema';
import { CreateFloorPlanDto } from './dtos/create-floor-plan.dto';
import { UpdateFloorPlanDto } from './dtos/update-floor-plan.dto';
import { UpdateTableStatusDto, CreateReservationDto, FloorPlanStatusOverviewDto } from './dtos/table-status.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Injectable()
export class FloorPlansService {
  constructor(
    @InjectModel(FloorPlan.name) private floorPlanModel: Model<FloorPlanDocument>,
    @InjectModel(TableStatus.name) private tableStatusModel: Model<TableStatusDocument>,
  ) {}

  async create(restaurantId: string, dto: CreateFloorPlanDto, user: AuthenticatedUser): Promise<FloorPlan> {
    // If setting as active, deactivate all other floor plans
    if (dto.isActive) {
      await this.floorPlanModel.updateMany(
        { restaurantId, isActive: true },
        { isActive: false }
      );
    }

    const floorPlan = new this.floorPlanModel({
      ...dto,
      restaurantId,
      createdBy: user.uid,
      lastModifiedBy: user.uid,
      lastUsedAt: new Date(),
    });

    const saved = await floorPlan.save();

    // Initialize table statuses for all tables
    if (saved.tables.length > 0) {
      await this.initializeTableStatuses(restaurantId, saved.tables);
    }

    return saved;
  }

  async findAllByRestaurant(restaurantId: string, page = 1, limit = 10): Promise<{ data: FloorPlan[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.floorPlanModel
        .find({ restaurantId })
        .sort({ isActive: -1, lastUsedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.floorPlanModel.countDocuments({ restaurantId })
    ]);

    return { data, total };
  }

  async findById(id: string, restaurantId: string): Promise<FloorPlan> {
    const floorPlan = await this.floorPlanModel.findOne({ _id: id, restaurantId }).exec();
    if (!floorPlan) {
      throw new NotFoundException('Floor plan not found');
    }
    return floorPlan;
  }

  async findActiveByRestaurant(restaurantId: string): Promise<FloorPlan | null> {
    return this.floorPlanModel.findOne({ restaurantId, isActive: true }).exec();
  }

  async update(id: string, restaurantId: string, dto: UpdateFloorPlanDto, user: AuthenticatedUser): Promise<FloorPlan> {
    const floorPlan = await this.findById(id, restaurantId);

    // If setting as active, deactivate all other floor plans
    if (dto.isActive && !floorPlan.isActive) {
      await this.floorPlanModel.updateMany(
        { restaurantId, isActive: true },
        { isActive: false }
      );
    }

    const updated = await this.floorPlanModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        lastModifiedBy: user.uid,
        lastUsedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException('Floor plan not found');
    }

    // Update table statuses if tables changed
    if (dto.tables) {
      await this.syncTableStatuses(restaurantId, dto.tables);
    }

    return updated;
  }

  async remove(id: string, restaurantId: string): Promise<void> {
    const floorPlan = await this.findById(id, restaurantId);

    if (floorPlan.isActive) {
      throw new BadRequestException('Cannot delete active floor plan');
    }

    await this.floorPlanModel.findByIdAndDelete(id).exec();

    // Clean up table statuses
    await this.tableStatusModel.deleteMany({
      restaurantId,
      tableId: { $in: floorPlan.tables.map(t => t.id) }
    });
  }

  async setActive(id: string, restaurantId: string): Promise<FloorPlan> {
    // Deactivate all floor plans
    await this.floorPlanModel.updateMany(
      { restaurantId },
      { isActive: false }
    );

    // Activate the selected one
    const floorPlan = await this.floorPlanModel.findOneAndUpdate(
      { _id: id, restaurantId },
      { isActive: true, lastUsedAt: new Date() },
      { new: true }
    ).exec();

    if (!floorPlan) {
      throw new NotFoundException('Floor plan not found');
    }

    return floorPlan;
  }

  // Table Status Management
  async getTableStatuses(restaurantId: string, date?: Date): Promise<TableStatus[]> {
    const queryDate = date || new Date();
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    return this.tableStatusModel
      .find({
        restaurantId,
        date: { $gte: startOfDay, $lte: endOfDay },
        isActive: true
      })
      .sort({ tableLabel: 1 })
      .exec();
  }

  async getTableStatus(restaurantId: string, tableId: string): Promise<TableStatus | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.tableStatusModel.findOne({
      restaurantId,
      tableId,
      date: { $gte: today },
      isActive: true
    }).exec();
  }

  async updateTableStatus(
    restaurantId: string,
    tableId: string,
    dto: UpdateTableStatusDto,
    user: AuthenticatedUser
  ): Promise<TableStatus> {
    const existing = await this.getTableStatus(restaurantId, tableId);

    if (!existing) {
      throw new NotFoundException('Table status not found');
    }

    // Special handling for status changes
    const updateData: any = {
      ...dto,
      statusChangedAt: new Date(),
      statusChangedBy: user.uid,
    };

    // Set occupiedSince when table becomes occupied
    if (dto.status === TableStatusType.Occupied && existing.status !== TableStatusType.Occupied) {
      updateData.occupiedSince = new Date();
    }

    // Clear occupiedSince when table becomes available
    if (dto.status === TableStatusType.Available) {
      updateData.occupiedSince = null;
      updateData.currentPartySize = null;
      updateData.estimatedAvailableAt = null;
    }

    const updated = await this.tableStatusModel.findByIdAndUpdate(
      existing._id,
      updateData,
      { new: true }
    ).exec();

    return updated!;
  }

  async createReservation(
    restaurantId: string,
    tableId: string,
    dto: CreateReservationDto,
    user: AuthenticatedUser
  ): Promise<TableStatus> {
    const tableStatus = await this.getTableStatus(restaurantId, tableId);

    if (!tableStatus) {
      throw new NotFoundException('Table not found');
    }

    if (tableStatus.status !== TableStatusType.Available) {
      throw new ConflictException('Table is not available for reservation');
    }

    return this.updateTableStatus(
      restaurantId,
      tableId,
      {
        status: TableStatusType.Reserved,
        currentPartySize: dto.partySize,
        estimatedAvailableAt: dto.reservedTo,
      },
      user
    );
  }

  async getFloorPlanOverview(restaurantId: string): Promise<FloorPlanStatusOverviewDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [floorPlan, tableStatuses] = await Promise.all([
      this.findActiveByRestaurant(restaurantId),
      this.getTableStatuses(restaurantId, today)
    ]);

    if (!floorPlan) {
      throw new NotFoundException('No active floor plan found');
    }

    const statusCounts = tableStatuses.reduce((acc, table) => {
      acc[table.status] = (acc[table.status] || 0) + 1;
      return acc;
    }, {} as Record<TableStatusType, number>);

    const totalSeats = floorPlan.tables.reduce((sum, table) => sum + table.capacity, 0);
    const occupiedSeats = tableStatuses
      .filter(t => t.status === TableStatusType.Occupied)
      .reduce((sum, table) => sum + (table.currentPartySize || 0), 0);

    const todayMetrics = tableStatuses.reduce(
      (acc, table) => {
        acc.revenue += table.dailyMetrics.totalRevenue;
        acc.orders += table.dailyMetrics.totalOrders;
        return acc;
      },
      { revenue: 0, orders: 0 }
    );

    return {
      restaurantId,
      floorPlanId: floorPlan._id.toString(),
      totalTables: floorPlan.tables.length,
      availableTables: statusCounts[TableStatusType.Available] || 0,
      occupiedTables: statusCounts[TableStatusType.Occupied] || 0,
      reservedTables: statusCounts[TableStatusType.Reserved] || 0,
      tablesNeedingAttention: statusCounts[TableStatusType.NeedsAttention] || 0,
      totalSeats,
      occupiedSeats,
      todayRevenue: todayMetrics.revenue,
      todayOrders: todayMetrics.orders,
      averageTurnover: tableStatuses.reduce((sum, t) => sum + t.dailyMetrics.turnoverCount, 0) / floorPlan.tables.length,
      lastUpdated: new Date(),
    };
  }

  // Private helper methods
  private async initializeTableStatuses(restaurantId: string, tables: any[]): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tableStatuses = tables.map(table => ({
      restaurantId,
      tableId: table.id,
      tableLabel: table.label,
      status: TableStatusType.Available,
      statusChangedAt: new Date(),
      date: today,
      dailyMetrics: {},
    }));

    await this.tableStatusModel.insertMany(tableStatuses);
  }

  private async syncTableStatuses(restaurantId: string, tables: any[]): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tableIds = tables.map(t => t.id);
    const existingStatuses = await this.tableStatusModel.find({
      restaurantId,
      date: { $gte: today },
      tableId: { $in: tableIds }
    }).exec();

    const existingTableIds = existingStatuses.map(s => s.tableId);
    const newTables = tables.filter(t => !existingTableIds.includes(t.id));

    if (newTables.length > 0) {
      await this.initializeTableStatuses(restaurantId, newTables);
    }

    // Update table labels
    for (const table of tables) {
      await this.tableStatusModel.updateMany(
        { restaurantId, tableId: table.id },
        { tableLabel: table.label }
      );
    }
  }
}