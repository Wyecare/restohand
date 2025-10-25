import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantDocument = Restaurant & Document;

@Schema({ _id: false })
class RestaurantAddress {
  @Prop({ type: String, required: true, trim: true })
  line1!: string;

  @Prop({ type: String, trim: true })
  line2?: string;

  @Prop({ type: String, required: true, trim: true })
  city!: string;

  @Prop({ type: String, required: true, trim: true })
  state!: string;

  @Prop({ type: String, required: true, trim: true })
  postalCode!: string;

  @Prop({ type: String, required: true, trim: true, default: 'IN' })
  country!: string;
}

const RestaurantAddressSchema = SchemaFactory.createForClass(RestaurantAddress);

@Schema({ _id: false })
class RestaurantUpiConfig {
  @Prop({ type: String, required: true, trim: true })
  vpa!: string;

  @Prop({ type: String, required: true, trim: true })
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
  @Prop({ type: String, default: 'ORD' })
  orderNumberPrefix!: string;

  @Prop({ type: String, default: 'INR' })
  currency!: string;

  @Prop({ type: String, default: 'en-IN' })
  locale!: string;

  @Prop({ type: Boolean, default: true })
  enableTax!: boolean;
}

const RestaurantSettingsSchema =
  SchemaFactory.createForClass(RestaurantSettings);

@Schema({
  timestamps: true,
  collection: 'restaurants',
})
export class Restaurant {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  legalName?: string;

  @Prop({ type: String, required: true, unique: true, index: true, lowercase: true })
  slug!: string;

  @Prop({ type: String, trim: true, lowercase: true })
  contactEmail?: string;

  @Prop({ type: String, trim: true })
  contactPhone?: string;

  @Prop({ type: String, default: 'Asia/Kolkata' })
  timezone!: string;

  @Prop({ type: RestaurantAddressSchema, required: true })
  address!: RestaurantAddress;

  @Prop({ type: RestaurantUpiConfigSchema, required: true })
  upi!: RestaurantUpiConfig;

  @Prop({ type: RestaurantSettingsSchema, default: () => ({}) })
  settings!: RestaurantSettings;

  @Prop({ type: [String], default: ['en', 'ml'] })
  languages!: string[];

  @Prop({
    type: String,
    trim: true,
    uppercase: true,
    match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  })
  gstin?: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ slug: 1 }, { unique: true });
RestaurantSchema.index({ 'address.city': 1 });
