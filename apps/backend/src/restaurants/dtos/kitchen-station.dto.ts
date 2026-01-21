import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { StationType } from '../schemas/kitchen-station.schema';

export class CreateKitchenStationDto {
  @ApiProperty({ description: 'Station name' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: StationType, description: 'Station type' })
  @IsEnum(StationType)
  type!: StationType;

  @ApiPropertyOptional({ description: 'Station description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Station capacity', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Display order', minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Average prep time in minutes', default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgPrepTime?: number;
}

export class UpdateKitchenStationDto {
  @ApiPropertyOptional({ description: 'Station name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Station description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Station capacity', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Station active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Average prep time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgPrepTime?: number;
}

export class AssignOrderToStationDto {
  @ApiProperty({ description: 'Station ID to assign order to' })
  @IsString()
  stationId!: string;

  @ApiProperty({ description: 'Menu item IDs for this station', type: [String] })
  @IsString({ each: true })
  menuItemIds!: string[];

  @ApiPropertyOptional({ description: 'Estimated prep time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedPrepTime?: number;

  @ApiPropertyOptional({ description: 'Assignment notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}