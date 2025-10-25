import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
  IsNumber,
} from 'class-validator';

export class CreateMenuCategoryDto {
  @ApiProperty({ example: 'Beverages' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    example: 'Fresh juices, smoothies, and hot beverages',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // GST Configuration for Category Default
  @ApiProperty({
    example: 'food-5',
    description: 'Predefined GST rate identifier for this category',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  defaultGstRateId?: string;

  @ApiProperty({
    example: 5,
    description: 'Cached default GST rate percentage for quick calculation',
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultGstRate?: number;

  @ApiProperty({
    example: 'Food',
    description: 'GST category type (e.g., Food, Beverages, Alcoholic Beverages)',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gstCategoryType?: string;
}
