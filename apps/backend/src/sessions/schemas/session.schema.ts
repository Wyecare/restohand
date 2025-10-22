import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type SessionDocument = Session & Document;

export enum SessionStatus {
  Active = 'active',
  Expired = 'expired',
  Closed = 'closed',
}

@Schema({
  timestamps: true,
  collection: 'sessions',
})
export class Session {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: String, trim: true })
  tableNumber?: string;

  @Prop({ type: String, trim: true })
  qrCodeId?: string;

  @Prop({ type: String, trim: true })
  customerName?: string;

  @Prop({ type: String, trim: true })
  customerPhone?: string;

  @Prop({
    type: String,
    enum: Object.values(SessionStatus),
    default: SessionStatus.Active,
    index: true,
  })
  status!: SessionStatus;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: String, trim: true })
  userAgent?: string;

  @Prop({ type: String, trim: true })
  ipAddress?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ restaurantId: 1, tableNumber: 1, status: 1 });
