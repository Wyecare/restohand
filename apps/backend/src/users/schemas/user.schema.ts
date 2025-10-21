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

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true, lowercase: true, index: true, sparse: true })
  email?: string;

  @Prop({ trim: true, index: true, sparse: true })
  phoneNumber?: string;

  @Prop({ trim: true, lowercase: true, index: true, sparse: true })
  googleId?: string;

  @Prop({ trim: true, index: true, unique: true, sparse: true })
  firebaseUid?: string;

  @Prop({
    type: [String],
    enum: Object.values(UserRole),
    default: [UserRole.Waiter],
  })
  roles!: UserRole[];

  @Prop({ select: false })
  pinHash?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isPrimaryOwner!: boolean;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ restaurantId: 1, roles: 1 });
UserSchema.index({ restaurantId: 1, isActive: 1 });
