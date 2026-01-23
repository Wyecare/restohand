import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KitchenStation, KitchenStationDocument, StationType } from './schemas/kitchen-station.schema';
import { OrderStationAssignment, OrderStationAssignmentDocument, AssignmentStatus } from '../orders/schemas/order-station-assignment.schema';
import { CreateKitchenStationDto, UpdateKitchenStationDto, AssignOrderToStationDto } from './dtos/kitchen-station.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class KitchenStationService {
  constructor(
    @InjectModel(KitchenStation.name) private stationModel: Model<KitchenStationDocument>,
    @InjectModel(OrderStationAssignment.name) private assignmentModel: Model<OrderStationAssignmentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async createStation(restaurantId: string, dto: CreateKitchenStationDto): Promise<KitchenStation> {
    const station = new this.stationModel({
      restaurantId,
      ...dto,
    });

    return await station.save();
  }

  async getStations(restaurantId: string, includeInactive = false): Promise<KitchenStation[]> {
    const filter: any = { restaurantId };
    if (!includeInactive) {
      filter.isActive = true;
    }

    return await this.stationModel
      .find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .lean();
  }

  async getStation(restaurantId: string, stationId: string): Promise<KitchenStation> {
    const station = await this.stationModel.findOne({
      _id: stationId,
      restaurantId,
    }).lean();

    if (!station) {
      throw new NotFoundException('Kitchen station not found');
    }

    return station;
  }

  async updateStation(
    restaurantId: string,
    stationId: string,
    dto: UpdateKitchenStationDto
  ): Promise<KitchenStation> {
    const station = await this.stationModel.findOneAndUpdate(
      { _id: stationId, restaurantId },
      { $set: dto },
      { new: true, lean: true }
    );

    if (!station) {
      throw new NotFoundException('Kitchen station not found');
    }

    return station;
  }

  async deleteStation(restaurantId: string, stationId: string): Promise<void> {
    // Check if station has active assignments
    const activeAssignments = await this.assignmentModel.countDocuments({
      stationId,
      status: { $in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS] },
    });

    if (activeAssignments > 0) {
      throw new BadRequestException(
        'Cannot delete station with active assignments. Complete or reassign orders first.'
      );
    }

    const result = await this.stationModel.deleteOne({
      _id: stationId,
      restaurantId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Kitchen station not found');
    }
  }

  async assignOrderToStation(
    restaurantId: string,
    orderId: string,
    dto: AssignOrderToStationDto
  ): Promise<OrderStationAssignment> {
    // Verify order exists
    const order = await this.orderModel.findOne({
      _id: orderId,
      restaurantId,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify station exists and is active
    const station = await this.stationModel.findOne({
      _id: dto.stationId,
      restaurantId,
      isActive: true,
    });

    if (!station) {
      throw new NotFoundException('Kitchen station not found or inactive');
    }

    // Check station capacity
    const currentLoad = await this.assignmentModel.countDocuments({
      stationId: dto.stationId,
      status: { $in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS] },
    });

    if (currentLoad >= station.capacity) {
      throw new BadRequestException(
        `Station "${station.name}" is at full capacity (${station.capacity} orders)`
      );
    }

    // Create assignment
    const assignment = new this.assignmentModel({
      orderId,
      restaurantId,
      orderNumber: order.orderNumber,
      stationId: dto.stationId,
      stationName: station.name,
      estimatedPrepTime: dto.estimatedPrepTime || station.avgPrepTime,
      menuItemIds: dto.menuItemIds,
      notes: dto.notes,
    });

    const saved = await assignment.save();

    // Update station current load
    await this.stationModel.updateOne(
      { _id: dto.stationId },
      {
        $inc: { currentLoad: 1 },
        $set: { lastOrderAt: new Date() },
      }
    );

    return saved;
  }

  async getStationAssignments(
    restaurantId: string,
    stationId?: string,
    status?: AssignmentStatus
  ): Promise<OrderStationAssignment[]> {
    const filter: any = { restaurantId };

    if (stationId) {
      filter.stationId = stationId;
    }

    if (status) {
      filter.status = status;
    }

    return await this.assignmentModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('orderId', 'orderNumber tableNumber items totalAmount createdAt')
      .lean();
  }

  async updateAssignmentStatus(
    restaurantId: string,
    assignmentId: string,
    status: AssignmentStatus
  ): Promise<OrderStationAssignment> {
    const assignment = await this.assignmentModel.findOne({
      _id: assignmentId,
      restaurantId,
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const updates: any = { status };

    if (status === AssignmentStatus.IN_PROGRESS && !assignment.startedAt) {
      updates.startedAt = new Date();
    }

    if (status === AssignmentStatus.COMPLETED && !assignment.completedAt) {
      updates.completedAt = new Date();

      // Calculate actual prep time if we have start time
      if (assignment.startedAt) {
        updates.actualPrepTime = Math.round(
          (new Date().getTime() - assignment.startedAt.getTime()) / (1000 * 60)
        );
      }
    }

    const updated = await this.assignmentModel.findByIdAndUpdate(
      assignmentId,
      { $set: updates },
      { new: true, lean: true }
    );

    // Update station load if completing
    if (status === AssignmentStatus.COMPLETED || status === AssignmentStatus.SKIPPED) {
      await this.stationModel.updateOne(
        { _id: assignment.stationId },
        { $inc: { currentLoad: -1 } }
      );

      // Update today's metrics if completed
      if (status === AssignmentStatus.COMPLETED && updates.actualPrepTime) {
        await this.updateStationMetrics(assignment.stationId, updates.actualPrepTime);
      }
    }

    return updated!;
  }

  private async updateStationMetrics(stationId: string, actualPrepTime: number): Promise<void> {
    const station = await this.stationModel.findById(stationId);
    if (!station) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Simple moving average update
    const newCount = station.todayOrdersCount + 1;
    const newAvg = Math.round(
      (station.todayAvgPrepTime * station.todayOrdersCount + actualPrepTime) / newCount
    );

    await this.stationModel.updateOne(
      { _id: stationId },
      {
        $set: {
          todayOrdersCount: newCount,
          todayAvgPrepTime: newAvg,
        },
      }
    );
  }

  async getStationMetrics(restaurantId: string) {
    const stations = await this.stationModel.find({ restaurantId, isActive: true }).lean();

    const metrics = await Promise.all(
      stations.map(async (station) => {
        const activeAssignments = await this.assignmentModel.countDocuments({
          stationId: station._id,
          status: { $in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS] },
        });

        const completedToday = await this.assignmentModel.countDocuments({
          stationId: station._id,
          status: AssignmentStatus.COMPLETED,
          completedAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        });

        return {
          ...station,
          currentLoad: activeAssignments,
          completedToday,
          utilizationRate: station.capacity > 0 ? Math.round((activeAssignments / station.capacity) * 100) : 0,
        };
      })
    );

    return metrics;
  }

  async resetDailyMetrics(restaurantId: string): Promise<void> {
    await this.stationModel.updateMany(
      { restaurantId },
      {
        $set: {
          todayOrdersCount: 0,
          todayAvgPrepTime: 0,
        },
      }
    );
  }
}