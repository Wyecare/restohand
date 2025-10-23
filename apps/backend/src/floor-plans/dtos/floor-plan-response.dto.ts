import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FloorPlanTableResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiProperty()
  rotation!: number;

  @ApiProperty({ enum: ['rectangle', 'circle', 'square'] })
  shape!: 'rectangle' | 'circle' | 'square';

  @ApiProperty()
  label!: string;

  @ApiProperty()
  capacity!: number;

  @ApiPropertyOptional()
  zone?: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional()
  restaurantTableId?: string;
}

export class FloorPlanMetadataResponseDto {
  @ApiProperty()
  canvasWidth!: number;

  @ApiProperty()
  canvasHeight!: number;

  @ApiProperty()
  backgroundColor!: string;

  @ApiPropertyOptional()
  backgroundImage?: string;

  @ApiProperty()
  gridSize!: number;

  @ApiProperty()
  showGrid!: boolean;

  @ApiProperty()
  zoomLevel!: number;
}

export class FloorPlanResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: [FloorPlanTableResponseDto] })
  tables!: FloorPlanTableResponseDto[];

  @ApiProperty({ type: FloorPlanMetadataResponseDto })
  metadata!: FloorPlanMetadataResponseDto;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  version?: string;

  @ApiPropertyOptional()
  lastUsedAt?: Date;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiPropertyOptional()
  lastModifiedBy?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class FloorPlanListResponseDto {
  @ApiProperty({ type: [FloorPlanResponseDto] })
  data!: FloorPlanResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}