import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TillSession, TillSessionDocument } from './schemas/till-session.schema';

export interface OpenTillDto {
  restaurantId: string;
  branchId: string;
  cashierId?: string;
  cashierName?: string;
  openingFloat: number;
  openingNotes?: string;
}

export interface CloseTillDto {
  closingCash: number;
  closingNotes?: string;
}

export interface RecordTillTransactionDto {
  paymentMethod: 'cash' | 'card' | 'upi';
  amount: number;
  isRefund?: boolean;
}

@Injectable()
export class TillService {
  private readonly logger = new Logger(TillService.name);

  constructor(
    @InjectModel(TillSession.name)
    private readonly tillSessionModel: Model<TillSessionDocument>,
  ) {}

  async openTill(dto: OpenTillDto): Promise<TillSession> {
    // Check if there's already an open till for this branch
    const existing = await this.tillSessionModel.findOne({
      restaurantId: dto.restaurantId,
      branchId: dto.branchId,
      status: 'open',
    });

    if (existing) {
      throw new BadRequestException(
        'A till is already open for this branch. Please close it first.',
      );
    }

    const till = new this.tillSessionModel({
      restaurantId: dto.restaurantId,
      branchId: dto.branchId,
      cashierId: dto.cashierId,
      cashierName: dto.cashierName,
      status: 'open',
      openingFloat: dto.openingFloat,
      openingNotes: dto.openingNotes,
      openedAt: new Date(),
      transactions: {
        cashTotal: 0,
        cardTotal: 0,
        upiTotal: 0,
        totalCollected: 0,
        orderCount: 0,
        refundTotal: 0,
      },
    });

    const saved = await till.save();
    this.logger.log(
      `Till opened for branch ${dto.branchId} by ${dto.cashierName} with float ₹${dto.openingFloat}`,
    );
    return saved;
  }

  async closeTill(tillId: string, dto: CloseTillDto): Promise<TillSession> {
    const till = await this.tillSessionModel.findById(tillId);
    if (!till) {
      throw new NotFoundException(`Till session ${tillId} not found`);
    }

    if (till.status === 'closed') {
      throw new BadRequestException('This till is already closed');
    }

    till.status = 'closed';
    till.closingCash = dto.closingCash;
    till.closingNotes = dto.closingNotes;
    till.closedAt = new Date();

    await till.save();
    this.logger.log(`Till ${tillId} closed with closing cash ₹${dto.closingCash}`);
    return till;
  }

  async getCurrentTill(restaurantId: string, branchId: string): Promise<TillSession | null> {
    return this.tillSessionModel.findOne({
      restaurantId,
      branchId,
      status: 'open',
    }).sort({ openedAt: -1 });
  }

  async getTillHistory(
    restaurantId: string,
    branchId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ sessions: TillSession[]; total: number; page: number; totalPages: number }> {
    const query: any = { restaurantId };
    if (branchId) query.branchId = new Types.ObjectId(branchId);

    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      this.tillSessionModel.find(query).sort({ openedAt: -1 }).skip(skip).limit(limit).lean(),
      this.tillSessionModel.countDocuments(query),
    ]);

    return {
      sessions: sessions as TillSession[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async recordTransaction(
    tillId: string,
    dto: RecordTillTransactionDto,
  ): Promise<TillSession> {
    const till = await this.tillSessionModel.findById(tillId);
    if (!till) throw new NotFoundException(`Till session ${tillId} not found`);
    if (till.status === 'closed') throw new BadRequestException('Cannot record on a closed till');

    if (dto.isRefund) {
      till.transactions.refundTotal += dto.amount;
      till.transactions.totalCollected -= dto.amount;
      if (dto.paymentMethod === 'cash') till.transactions.cashTotal -= dto.amount;
      if (dto.paymentMethod === 'card') till.transactions.cardTotal -= dto.amount;
      if (dto.paymentMethod === 'upi') till.transactions.upiTotal -= dto.amount;
    } else {
      till.transactions.totalCollected += dto.amount;
      till.transactions.orderCount += 1;
      if (dto.paymentMethod === 'cash') till.transactions.cashTotal += dto.amount;
      if (dto.paymentMethod === 'card') till.transactions.cardTotal += dto.amount;
      if (dto.paymentMethod === 'upi') till.transactions.upiTotal += dto.amount;
    }

    await till.save();
    return till;
  }
}
