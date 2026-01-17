import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, lowercase: true, index: true, sparse: true })
  email?: string;

  @Prop({ type: String, select: false })
  passwordHash?: string;

  @Prop({ type: String, trim: true, index: true, sparse: true })
  phoneNumber?: string;

  @Prop({ type: String, trim: true, lowercase: true, index: true, sparse: true })
  googleId?: string;

  @Prop({ type: String, trim: true, index: true, unique: true, sparse: true })
  firebaseUid?: string;

  @Prop({
    type: [String],
    enum: Object.values(UserRole),
    default: [UserRole.Waiter],
  })
  roles!: UserRole[];

  @Prop({ type: String, select: false })
  pinHash?: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, default: false })
  isPrimaryOwner!: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ restaurantId: 1, roles: 1 });
UserSchema.index({ restaurantId: 1, isActive: 1 });
