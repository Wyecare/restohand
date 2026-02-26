import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type TillSessionDocument = TillSession & Document;

@Schema({ _id: false })
class TillTransactions {
  @Prop({ type: Number, default: 0 })
  cashTotal!: number;

  @Prop({ type: Number, default: 0 })
  cardTotal!: number;

  @Prop({ type: Number, default: 0 })
  upiTotal!: number;

  @Prop({ type: Number, default: 0 })
  totalCollected!: number;

  @Prop({ type: Number, default: 0 })
  orderCount!: number;

  @Prop({ type: Number, default: 0 })
  refundTotal!: number;
}

const TillTransactionsSchema = SchemaFactory.createForClass(TillTransactions);

@Schema({ timestamps: true, collection: 'till_sessions' })
export class TillSession {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: string;

  @Prop({ type: String })
  cashierId?: string;

  @Prop({ type: String })
  cashierName?: string;

  @Prop({ type: String, enum: ['open', 'closed'], default: 'open', index: true })
  status!: 'open' | 'closed';

  @Prop({ type: Number, default: 0 })
  openingFloat!: number;

  @Prop({ type: Number })
  closingCash?: number;

  @Prop({ type: TillTransactionsSchema, default: () => ({}) })
  transactions!: TillTransactions;

  @Prop({ type: Date, default: Date.now })
  openedAt!: Date;

  @Prop({ type: Date })
  closedAt?: Date;

  @Prop({ type: String })
  openingNotes?: string;

  @Prop({ type: String })
  closingNotes?: string;
}

export const TillSessionSchema = SchemaFactory.createForClass(TillSession);
