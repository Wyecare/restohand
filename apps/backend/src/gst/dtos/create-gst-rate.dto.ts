import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class CreateGstRateDto {
  @ApiProperty({ description: 'GST category name' })
  @IsString()
  @IsNotEmpty()
  categoryName!: string;

  @ApiProperty({ description: 'Description of the GST category', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Central GST rate (0-100)', example: 2.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  cgstRate!: number;

  @ApiProperty({ description: 'State GST rate (0-100)', example: 2.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  sgstRate!: number;

  @ApiProperty({ description: 'Integrated GST rate (0-100)', example: 5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  igstRate!: number;

  @ApiProperty({ description: 'Total GST rate (0-100)', example: 5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  totalGstRate!: number;

  @ApiProperty({ description: 'Whether this rate is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Whether this is the default rate', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ description: 'Effective from date' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiProperty({ description: 'Effective to date', required: false })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}