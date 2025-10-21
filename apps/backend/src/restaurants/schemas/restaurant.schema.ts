import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantDocument = Restaurant & Document;

@Schema({ _id: false })
class RestaurantAddress {
  @Prop({ required: true, trim: true })
  line1!: string;

  @Prop({ trim: true })
  line2?: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ required: true, trim: true })
  postalCode!: string;

  @Prop({ required: true, trim: true, default: 'IN' })
  country!: string;
}

const RestaurantAddressSchema = SchemaFactory.createForClass(RestaurantAddress);

@Schema({ _id: false })
class RestaurantUpiConfig {
  @Prop({ required: true, trim: true })
  vpa!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({
    type: String,
    enum: ['static', 'dynamic'],
    default: 'static',
  })
  mode!: 'static' | 'dynamic';
}

const RestaurantUpiConfigSchema =
  SchemaFactory.createForClass(RestaurantUpiConfig);

@Schema({ _id: false })
class RestaurantSettings {
  @Prop({ default: 'ORD' })
  orderNumberPrefix!: string;

  @Prop({ default: 'INR' })
  currency!: string;

  @Prop({ default: 'en-IN' })
  locale!: string;

  @Prop({ default: true })
  enableTax!: boolean;
}

const RestaurantSettingsSchema =
  SchemaFactory.createForClass(RestaurantSettings);

@Schema({
  timestamps: true,
  collection: 'restaurants',
})
export class Restaurant {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  legalName?: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true })
  slug!: string;

  @Prop({ trim: true, lowercase: true })
  contactEmail?: string;

  @Prop({ trim: true })
  contactPhone?: string;

  @Prop({ default: 'Asia/Kolkata' })
  timezone!: string;

  @Prop({ type: RestaurantAddressSchema, required: true })
  address!: RestaurantAddress;

  @Prop({ type: RestaurantUpiConfigSchema, required: true })
  upi!: RestaurantUpiConfig;

  @Prop({ type: RestaurantSettingsSchema, default: () => ({}) })
  settings!: RestaurantSettings;

  @Prop({ type: [String], default: ['en', 'ml'] })
  languages!: string[];

  @Prop({ default: true })
  isActive!: boolean;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ slug: 1 }, { unique: true });
RestaurantSchema.index({ 'address.city': 1 });
