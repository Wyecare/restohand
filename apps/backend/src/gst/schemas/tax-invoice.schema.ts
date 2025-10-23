import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type TaxInvoiceDocument = TaxInvoice & Document;

@Schema({ _id: false })
class TaxLineItem {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  hsnCode?: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: String, default: 'unit' })
  unit!: string; // unit, kg, liter, etc.

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number; // quantity * unitPrice

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  gstRate!: number;

  @Prop({ type: Number, required: true, min: 0 })
  cgstAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  sgstAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  igstAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalTaxAmount!: number; // cgst + sgst + igst

  @Prop({ type: Number, required: true, min: 0 })
  totalWithTax!: number; // totalAmount + totalTaxAmount
}

const TaxLineItemSchema = SchemaFactory.createForClass(TaxLineItem);

@Schema({
  timestamps: true,
  collection: 'tax_invoices',
})
export class TaxInvoice {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', index: true })
  orderId!: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  invoiceNumber!: string; // Auto-generated invoice number

  @Prop({ type: Date, required: true, index: true })
  invoiceDate!: Date;

  @Prop({ type: String, required: true, trim: true })
  customerName!: string;

  @Prop({ type: String, trim: true })
  customerPhone?: string;

  @Prop({ type: String, trim: true })
  customerEmail?: string;

  @Prop({ type: String, trim: true })
  customerGstin?: string; // If customer is a business

  @Prop({ type: String, trim: true })
  tableNumber?: string;

  @Prop({ type: [TaxLineItemSchema], required: true })
  lineItems!: TaxLineItem[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotalAmount!: number; // Total before tax

  @Prop({ type: Number, required: true, min: 0 })
  totalCgstAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalSgstAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalIgstAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalTaxAmount!: number; // Sum of all taxes

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number; // Final amount including tax

  @Prop({ type: Number, min: 0, default: 0 })
  discountAmount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  roundOffAmount!: number; // Rounding adjustment

  @Prop({ type: String, required: true, trim: true })
  restaurantGstin!: string;

  @Prop({ type: String, required: true, trim: true })
  restaurantName!: string;

  @Prop({ type: Object, required: true })
  restaurantAddress!: object; // Restaurant address details

  @Prop({ type: String, enum: ['intra-state', 'inter-state'], required: true })
  taxType!: 'intra-state' | 'inter-state'; // Determines CGST+SGST vs IGST

  @Prop({ type: String, enum: ['draft', 'final', 'cancelled'], default: 'final' })
  status!: 'draft' | 'final' | 'cancelled';

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: String, trim: true })
  cancellationReason?: string;
}

export const TaxInvoiceSchema = SchemaFactory.createForClass(TaxInvoice);

// Indexes for efficient queries
TaxInvoiceSchema.index({ restaurantId: 1, invoiceDate: -1 });
TaxInvoiceSchema.index({ restaurantId: 1, status: 1, invoiceDate: -1 });
TaxInvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });