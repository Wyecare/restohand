import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SimpleFloorPlanTableDto {
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
}

export class SimpleFloorPlanMetadataDto {
  @ApiProperty({ description: 'Canvas width', minimum: 400, maximum: 2000 })
  @IsNumber()
  @Min(400)
  @Max(2000)
  canvasWidth!: number;

  @ApiProperty({ description: 'Canvas height', minimum: 300, maximum: 1500 })
  @IsNumber()
  @Min(300)
  @Max(1500)
  canvasHeight!: number;

  @ApiPropertyOptional({ description: 'Background color', default: '#f8fafc' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

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

export class SimpleCreateFloorPlanDto {
  @ApiProperty({ description: 'Floor plan name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Floor plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Tables in the floor plan', type: [SimpleFloorPlanTableDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimpleFloorPlanTableDto)
  tables!: SimpleFloorPlanTableDto[];

  @ApiProperty({ description: 'Floor plan metadata', type: SimpleFloorPlanMetadataDto })
  @ValidateNested()
  @Type(() => SimpleFloorPlanMetadataDto)
  metadata!: SimpleFloorPlanMetadataDto;

  @ApiPropertyOptional({ description: 'Set as active floor plan', default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}