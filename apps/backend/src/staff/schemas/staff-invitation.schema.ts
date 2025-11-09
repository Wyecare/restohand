import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StaffInvitationDocument = StaffInvitation & Document;

@Schema({
  timestamps: true,
  collection: 'email_staff_invitations',
})
export class StaffInvitation {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true })
  restaurantId: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, enum: ['manager', 'chef', 'waiter', 'cashier'] })
  role: string;

  @Prop({ type: String, required: true, unique: true })
  token: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  isUsed: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  usedBy?: Types.ObjectId;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ type: String, required: true })
  invitedBy: string;

  @Prop({ type: Number, default: 0 })
  emailSentCount: number;

  @Prop({ type: Date })
  lastEmailSentAt?: Date;
}

export const StaffInvitationSchema = SchemaFactory.createForClass(StaffInvitation);

// Indexes
StaffInvitationSchema.index({ token: 1 });
StaffInvitationSchema.index({ email: 1, restaurantId: 1 });
StaffInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });