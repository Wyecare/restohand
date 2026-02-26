import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ _id: false })
class SupplierContact {
  @Prop({ type: String, trim: true })
  contactPerson?: string;

  @Prop({ type: String, trim: true })
  phone?: string;

  @Prop({ type: String, trim: true, lowercase: true })
  email?: string;

  @Prop({ type: [String], default: [] })
  additionalEmails!: string[];
}

const SupplierContactSchema = SchemaFactory.createForClass(SupplierContact);

@Schema({ _id: false })
class SupplierAddress {
  @Prop({ type: String, trim: true })
  line1?: string;

  @Prop({ type: String, trim: true })
  line2?: string;

  @Prop({ type: String, trim: true })
  city?: string;

  @Prop({ type: String, trim: true })
  state?: string;

  @Prop({ type: String, trim: true })
  postalCode?: string;

  @Prop({ type: String, trim: true, default: 'IN' })
  country!: string;
}

const SupplierAddressSchema = SchemaFactory.createForClass(SupplierAddress);

@Schema({ _id: false })
class SupplierPaymentTerms {
  @Prop({ type: Number, default: 30, min: 0 })
  creditDays!: number;

  @Prop({
    type: String,
    enum: ['cash', 'credit', 'advance', 'cod'],
    default: 'credit'
  })
  paymentMethod!: 'cash' | 'credit' | 'advance' | 'cod';

  @Prop({ type: Number, min: 0, max: 100 })
  discountPercent?: number;

  @Prop({ type: Number, min: 0 })
  discountDays?: number;

  @Prop({ type: Number, min: 0 })
  creditLimit?: number; // in paise
}

const SupplierPaymentTermsSchema = SchemaFactory.createForClass(SupplierPaymentTerms);

@Schema({ _id: false })
class SupplierPerformance {
  @Prop({ type: Number, min: 1, max: 5, default: 3 })
  rating!: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  onTimeDeliveryPercent!: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  qualityRating!: number;

  @Prop({ type: Number, default: 0 })
  totalOrders!: number;

  @Prop({ type: Number, default: 0 })
  totalOrderValue!: number; // in paise

  @Prop({ type: Date })
  lastOrderDate?: Date;

  @Prop({ type: Date })
  lastEvaluationDate?: Date;
}

const SupplierPerformanceSchema = SchemaFactory.createForClass(SupplierPerformance);

@Schema({
  timestamps: true,
  collection: 'suppliers',
})
export class Supplier {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', required: true, index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, uppercase: true, trim: true })
  supplierCode!: string; // Unique per restaurant

  @Prop({ type: SupplierContactSchema, default: () => ({}) })
  contact!: SupplierContact;

  @Prop({ type: SupplierAddressSchema })
  address?: SupplierAddress;

  @Prop({ type: String, trim: true, uppercase: true })
  gstin?: string;

  @Prop({ type: String, trim: true, uppercase: true })
  panNumber?: string;

  @Prop({ type: SupplierPaymentTermsSchema, default: () => ({}) })
  paymentTerms!: SupplierPaymentTerms;

  @Prop({ type: [String], default: [] })
  categories!: string[]; // What they supply (vegetables, meat, dairy, etc.)

  @Prop({ type: SupplierPerformanceSchema, default: () => ({}) })
  performance!: SupplierPerformance;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: string;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'Branch', default: [] })
  suppliedBranches!: string[]; // Which branches this supplier serves
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

// Compound unique index for restaurant + supplier code
SupplierSchema.index({ restaurantId: 1, supplierCode: 1 }, { unique: true });

// Performance indexes
SupplierSchema.index({ restaurantId: 1, isActive: 1 });
SupplierSchema.index({ restaurantId: 1, categories: 1 });
SupplierSchema.index({ restaurantId: 1, 'contact.email': 1 });
SupplierSchema.index({ suppliedBranches: 1, isActive: 1 });