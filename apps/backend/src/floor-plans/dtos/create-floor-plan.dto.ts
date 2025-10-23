import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFloorPlanTableDto {
  @ApiProperty({ description: 'Unique table identifier' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'X coordinate position' })
  @IsNumber()
  x!: number;

  @ApiProperty({ description: 'Y coordinate position' })
  @IsNumber()
  y!: number;

  @ApiProperty({ description: 'Table width', minimum: 40 })
  @IsNumber()
  @Min(40)
  width!: number;

  @ApiProperty({ description: 'Table height', minimum: 40 })
  @IsNumber()
  @Min(40)
  height!: number;

  @ApiPropertyOptional({ description: 'Rotation angle in degrees', default: 0 })
  @IsOptional()
  @IsNumber()
  rotation?: number;

  @ApiProperty({ description: 'Table shape', enum: ['rectangle', 'circle', 'square'] })
  @IsEnum(['rectangle', 'circle', 'square'])
  shape!: 'rectangle' | 'circle' | 'square';

  @ApiProperty({ description: 'Table label/number' })
  @IsString()
  label!: string;

  @ApiProperty({ description: 'Seating capacity', minimum: 1, maximum: 20 })
  @IsNumber()
  @Min(1)
  @Max(20)
  capacity!: number;

  @ApiPropertyOptional({ description: 'Zone/area name' })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ description: 'Custom color hex code' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Link to restaurant table ID' })
  @IsOptional()
  @IsString()
  restaurantTableId?: string;
}

export class CreateFloorPlanSectionDto {
  @ApiProperty({ description: 'Unique section identifier' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Section name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Section description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'X coordinate position' })
  @IsNumber()
  x!: number;

  @ApiProperty({ description: 'Y coordinate position' })
  @IsNumber()
  y!: number;

  @ApiProperty({ description: 'Section width' })
  @IsNumber()
  width!: number;

  @ApiProperty({ description: 'Section height' })
  @IsNumber()
  height!: number;

  @ApiPropertyOptional({ description: 'Background color', default: '#f1f5f9' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Border color', default: '#64748b' })
  @IsOptional()
  @IsString()
  borderColor?: string;

  @ApiPropertyOptional({ description: 'Border width', default: 2 })
  @IsOptional()
  @IsNumber()
  borderWidth?: number;

  @ApiPropertyOptional({ description: 'Border style', enum: ['solid', 'dashed', 'dotted'], default: 'solid' })
  @IsOptional()
  @IsEnum(['solid', 'dashed', 'dotted'])
  borderStyle?: 'solid' | 'dashed' | 'dotted';

  @ApiPropertyOptional({ description: 'Section opacity', default: 0.3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ApiProperty({ description: 'Section type', enum: ['dining', 'bar', 'private', 'outdoor', 'vip', 'family', 'waiting'] })
  @IsEnum(['dining', 'bar', 'private', 'outdoor', 'vip', 'family', 'waiting'])
  sectionType!: 'dining' | 'bar' | 'private' | 'outdoor' | 'vip' | 'family' | 'waiting';

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Show section label', default: true })
  @IsOptional()
  @IsBoolean()
  showLabel?: boolean;

  @ApiPropertyOptional({ description: 'Label color', default: '#000000' })
  @IsOptional()
  @IsString()
  labelColor?: string;

  @ApiPropertyOptional({ description: 'Label font size', default: 16 })
  @IsOptional()
  @IsNumber()
  labelSize?: number;
}

export class CreateFloorPlanDividerDto {
  @ApiProperty({ description: 'Unique divider identifier' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Divider type', enum: ['wall', 'divider', 'barrier', 'column'] })
  @IsEnum(['wall', 'divider', 'barrier', 'column'])
  type!: 'wall' | 'divider' | 'barrier' | 'column';

  @ApiProperty({ description: 'Start X coordinate' })
  @IsNumber()
  x1!: number;

  @ApiProperty({ description: 'Start Y coordinate' })
  @IsNumber()
  y1!: number;

  @ApiProperty({ description: 'End X coordinate' })
  @IsNumber()
  x2!: number;

  @ApiProperty({ description: 'End Y coordinate' })
  @IsNumber()
  y2!: number;

  @ApiPropertyOptional({ description: 'Divider thickness', default: 3 })
  @IsOptional()
  @IsNumber()
  thickness?: number;

  @ApiPropertyOptional({ description: 'Divider color', default: '#94a3b8' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Divider label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Is this a door opening', default: false })
  @IsOptional()
  @IsBoolean()
  isDoor?: boolean;

  @ApiPropertyOptional({ description: 'Door width if isDoor is true', default: 0 })
  @IsOptional()
  @IsNumber()
  doorWidth?: number;
}

export class CreateFloorPlanDecorationDto {
  @ApiProperty({ description: 'Unique decoration identifier' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Decoration type', enum: ['plant', 'artwork', 'fixture', 'entrance', 'kitchen-door', 'bathroom', 'cashier'] })
  @IsEnum(['plant', 'artwork', 'fixture', 'entrance', 'kitchen-door', 'bathroom', 'cashier'])
  type!: 'plant' | 'artwork' | 'fixture' | 'entrance' | 'kitchen-door' | 'bathroom' | 'cashier';

  @ApiProperty({ description: 'X coordinate position' })
  @IsNumber()
  x!: number;

  @ApiProperty({ description: 'Y coordinate position' })
  @IsNumber()
  y!: number;

  @ApiPropertyOptional({ description: 'Decoration width', default: 30 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Decoration height', default: 30 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Rotation angle in degrees', default: 0 })
  @IsOptional()
  @IsNumber()
  rotation?: number;

  @ApiPropertyOptional({ description: 'Decoration label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Decoration color', default: '#22c55e' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Icon name or emoji' })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class CreateFloorPlanMetadataDto {
  @ApiProperty({ description: 'Canvas width', minimum: 400, maximum: 4000 })
  @IsNumber()
  @Min(400)
  @Max(4000)
  canvasWidth!: number;

  @ApiProperty({ description: 'Canvas height', minimum: 300, maximum: 3000 })
  @IsNumber()
  @Min(300)
  @Max(3000)
  canvasHeight!: number;

  @ApiPropertyOptional({ description: 'Background color', default: '#f8fafc' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Background image URL' })
  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @ApiPropertyOptional({ description: 'Grid size', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(3)
  gridSize?: number;

  @ApiPropertyOptional({ description: 'Show grid lines', default: true })
  @IsOptional()
  @IsBoolean()
  showGrid?: boolean;

  @ApiPropertyOptional({ description: 'Zoom level', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  zoomLevel?: number;
}

export class CreateFloorPlanDto {
  @ApiProperty({ description: 'Floor plan name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Floor plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Tables in the floor plan', type: [CreateFloorPlanTableDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFloorPlanTableDto)
  tables!: CreateFloorPlanTableDto[];

  @ApiPropertyOptional({ description: 'Sections in the floor plan', type: [CreateFloorPlanSectionDto], default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFloorPlanSectionDto)
  sections?: CreateFloorPlanSectionDto[];

  @ApiPropertyOptional({ description: 'Dividers in the floor plan', type: [CreateFloorPlanDividerDto], default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFloorPlanDividerDto)
  dividers?: CreateFloorPlanDividerDto[];

  @ApiPropertyOptional({ description: 'Decorations in the floor plan', type: [CreateFloorPlanDecorationDto], default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFloorPlanDecorationDto)
  decorations?: CreateFloorPlanDecorationDto[];

  @ApiProperty({ description: 'Floor plan metadata', type: CreateFloorPlanMetadataDto })
  @ValidateNested()
  @Type(() => CreateFloorPlanMetadataDto)
  metadata!: CreateFloorPlanMetadataDto;

  @ApiPropertyOptional({ description: 'Set as active floor plan', default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Version identifier' })
  @IsOptional()
  @IsString()
  version?: string;
}