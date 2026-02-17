import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VatConfigurationDocument = VatConfiguration & Document;

@Schema({ _id: false })
export class AlcoholVatRate {
  @Prop({ required: true, enum: ['beer', 'wine', 'spirits', 'general'] })
  alcoholType: 'beer' | 'wine' | 'spirits' | 'general';

  @Prop({ required: true, min: 0, max: 100 })
  vatRate: number;

  @Prop()
  description?: string;
}

@Schema({ _id: false })
export class StateVatConfiguration {
  @Prop({ required: true })
  stateName: string;

  @Prop({ required: true })
  stateCode: string;

  @Prop({ type: [AlcoholVatRate], default: [] })
  alcoholVatRates: AlcoholVatRate[];

  @Prop({ required: true, min: 0, max: 100 })
  defaultVatRate: number; // Fallback rate for uncategorized alcohol

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  notes?: string;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

@Schema({
  timestamps: true,
  collection: 'vat_configurations'
})
export class VatConfiguration {
  @Prop({ required: true, unique: true })
  configurationName: string;

  @Prop({ type: [StateVatConfiguration], default: [] })
  stateConfigurations: StateVatConfiguration[];

  @Prop({ required: true, min: 0, max: 100, default: 20 })
  globalDefaultVatRate: number; // Ultimate fallback

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  description?: string;

  @Prop()
  createdBy?: string; // Super admin who created this

  @Prop()
  lastModifiedBy?: string; // Super admin who last modified this

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const VatConfigurationSchema = SchemaFactory.createForClass(VatConfiguration);

// Create indexes for better performance
VatConfigurationSchema.index({ configurationName: 1 });
VatConfigurationSchema.index({ isActive: 1 });
VatConfigurationSchema.index({ 'stateConfigurations.stateName': 1 });
VatConfigurationSchema.index({ 'stateConfigurations.stateCode': 1 });