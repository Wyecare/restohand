import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class EnhancedCreateCategoryDto {
  @ApiProperty({ description: 'Category name in English', example: 'Appetizers' })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({ description: 'Category name in Arabic' })
  @IsString()
  @IsOptional()
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Category description in English' })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Category description in Arabic' })
  @IsString()
  @IsOptional()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Category image URL (can be base64 or URL)' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Display order for sorting', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Is category available for ordering', default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Category status', enum: ['Active', 'Inactive'], default: 'Active' })
  @IsEnum(['Active', 'Inactive'])
  @IsOptional()
  status?: string;

  // GST Configuration
  @ApiPropertyOptional({ description: 'Default GST rate ID for items in this category' })
  @IsString()
  @IsOptional()
  defaultGstRateId?: string;

  @ApiPropertyOptional({ description: 'Default GST rate percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultGstRate?: number;

  @ApiPropertyOptional({ description: 'GST category type (e.g., "Food", "Beverages")' })
  @IsString()
  @IsOptional()
  gstCategoryType?: string;

  // Legacy support for backward compatibility
  @ApiPropertyOptional({ description: 'Legacy: Category name (maps to nameEn)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Legacy: Category description (maps to descriptionEn)' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Legacy: Is category blocked (opposite of isAvailable)' })
  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;
}