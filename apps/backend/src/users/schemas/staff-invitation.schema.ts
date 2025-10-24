import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

export type StaffInvitationDocument = StaffInvitation & Document;

@Schema({
  timestamps: true,
  collection: 'staff_invitations',
})
export class StaffInvitation {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  invitedBy!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true, index: true })
  phoneNumber!: string;

  @Prop({ type: String, trim: true })
  email?: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole).filter(role => role !== UserRole.Manager),
    required: true,
  })
  role!: UserRole;

  @Prop({ type: String, required: true, unique: true, index: true })
  invitationToken!: string;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Boolean, default: false })
  isUsed!: boolean;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  acceptedBy?: string;
}

export const StaffInvitationSchema = SchemaFactory.createForClass(StaffInvitation);

// Indexes for performance
StaffInvitationSchema.index({ restaurantId: 1, phoneNumber: 1 });
StaffInvitationSchema.index({ invitationToken: 1 });
StaffInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired invitations