import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class FloorPlanDivider {
  @Prop({ type: String, required: true, trim: true })
  id!: string;

  @Prop({ type: String, enum: ['wall', 'divider', 'barrier', 'column'], default: 'divider' })
  type!: 'wall' | 'divider' | 'barrier' | 'column';

  @Prop({ type: Number, required: true })
  x1!: number;

  @Prop({ type: Number, required: true })
  y1!: number;

  @Prop({ type: Number, required: true })
  x2!: number;

  @Prop({ type: Number, required: true })
  y2!: number;

  @Prop({ type: Number, default: 3 })
  thickness!: number;

  @Prop({ type: String, default: '#94a3b8' })
  color!: string;

  @Prop({ type: String, trim: true })
  label?: string;

  @Prop({ type: Boolean, default: false })
  isDoor!: boolean; // If true, shows as a door opening

  @Prop({ type: Number, default: 0 })
  doorWidth?: number; // Width of door opening (if isDoor is true)
}

@Schema({ _id: false })
export class FloorPlanSection {
  @Prop({ type: String, required: true, trim: true })
  id!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Number, required: true })
  x!: number;

  @Prop({ type: Number, required: true })
  y!: number;

  @Prop({ type: Number, required: true })
  width!: number;

  @Prop({ type: Number, required: true })
  height!: number;

  @Prop({ type: String, default: '#f1f5f9' })
  backgroundColor!: string;

  @Prop({ type: String, default: '#64748b' })
  borderColor!: string;

  @Prop({ type: Number, default: 2 })
  borderWidth!: number;

  @Prop({ type: String, enum: ['solid', 'dashed', 'dotted'], default: 'solid' })
  borderStyle!: 'solid' | 'dashed' | 'dotted';

  @Prop({ type: Number, default: 0.3 })
  opacity!: number;

  @Prop({ type: String, enum: ['dining', 'bar', 'private', 'outdoor', 'vip', 'family', 'waiting'], default: 'dining' })
  sectionType!: 'dining' | 'bar' | 'private' | 'outdoor' | 'vip' | 'family' | 'waiting';

  @Prop({ type: Number, default: 0 })
  displayOrder!: number;

  @Prop({ type: Boolean, default: true })
  showLabel!: boolean;

  @Prop({ type: String, default: '#000000' })
  labelColor!: string;

  @Prop({ type: Number, default: 16 })
  labelSize!: number;
}

@Schema({ _id: false })
export class FloorPlanDecoration {
  @Prop({ type: String, required: true, trim: true })
  id!: string;

  @Prop({ type: String, enum: ['plant', 'artwork', 'fixture', 'entrance', 'kitchen-door', 'bathroom', 'cashier'], required: true })
  type!: 'plant' | 'artwork' | 'fixture' | 'entrance' | 'kitchen-door' | 'bathroom' | 'cashier';

  @Prop({ type: Number, required: true })
  x!: number;

  @Prop({ type: Number, required: true })
  y!: number;

  @Prop({ type: Number, default: 30 })
  width!: number;

  @Prop({ type: Number, default: 30 })
  height!: number;

  @Prop({ type: Number, default: 0 })
  rotation!: number;

  @Prop({ type: String, trim: true })
  label?: string;

  @Prop({ type: String, default: '#22c55e' })
  color!: string;

  @Prop({ type: String, trim: true })
  icon?: string; // Icon name or emoji
}

export const FloorPlanDividerSchema = SchemaFactory.createForClass(FloorPlanDivider);
export const FloorPlanSectionSchema = SchemaFactory.createForClass(FloorPlanSection);
export const FloorPlanDecorationSchema = SchemaFactory.createForClass(FloorPlanDecoration);