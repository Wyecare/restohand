import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsMongoId,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';

class NutritionalInfoDto {
  @ApiPropertyOptional({ description: 'Calories' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  calories?: number;

  @ApiPropertyOptional({ description: 'Protein (g)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  protein?: number;

  @ApiPropertyOptional({ description: 'Carbs (g)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  carbs?: number;

  @ApiPropertyOptional({ description: 'Fat (g)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fat?: number;
}

class MenuItemPricingDto {
  @ApiProperty({ description: 'Base price of the item', example: 12.99 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Original price (for discount display)', example: 15.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  originalPrice?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Is tax inclusive pricing', default: false })
  @IsBoolean()
  @IsOptional()
  isTaxInclusive?: boolean;
}

export class EnhancedCreateItemDto {
  @ApiProperty({ description: 'Category ID' })
  @IsMongoId()
  categoryId: string;

  @ApiProperty({ description: 'Item name in English', example: 'Margherita Pizza' })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({ description: 'Item name in Arabic' })
  @IsString()
  @IsOptional()
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Item description in English' })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Item description in Arabic' })
  @IsString()
  @IsOptional()
  descriptionAr?: string;

  @ApiProperty({ description: 'Item pricing information' })
  @ValidateNested()
  @Type(() => MenuItemPricingDto)
  pricing: MenuItemPricingDto;

  @ApiPropertyOptional({ description: 'Primary item image URL (can be base64 or URL)' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional image URLs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalImages?: string[];

  @ApiPropertyOptional({ description: 'Display order for sorting', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Is item available for ordering', default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Item status', enum: ['Active', 'Inactive'], default: 'Active' })
  @IsEnum(['Active', 'Inactive'])
  @IsOptional()
  status?: string;

  // Dietary & Lifestyle Information
  @ApiPropertyOptional({ description: 'Is vegetarian item', default: false })
  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @ApiPropertyOptional({ description: 'Is vegan item', default: false })
  @IsBoolean()
  @IsOptional()
  isVegan?: boolean;

  @ApiPropertyOptional({ description: 'Is gluten-free item', default: false })
  @IsBoolean()
  @IsOptional()
  isGlutenFree?: boolean;

  @ApiPropertyOptional({ description: 'Contains allergens', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergens?: string[];

  @ApiPropertyOptional({
    description: 'Spice level',
    enum: ['None', 'Mild', 'Medium', 'Hot', 'Extra Hot'],
    default: 'None'
  })
  @IsEnum(['None', 'Mild', 'Medium', 'Hot', 'Extra Hot'])
  @IsOptional()
  spiceLevel?: string;

  @ApiPropertyOptional({ description: 'Preparation time in minutes', example: 15 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Nutritional information' })
  @ValidateNested()
  @Type(() => NutritionalInfoDto)
  @IsOptional()
  nutritionalInfo?: NutritionalInfoDto;

  @ApiPropertyOptional({ description: 'Item tags for filtering and search', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  // GST Configuration
  @ApiPropertyOptional({ description: 'HSN code for GST calculation' })
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiPropertyOptional({ description: 'GST rate ID' })
  @IsString()
  @IsOptional()
  gstRateId?: string;

  @ApiPropertyOptional({ description: 'GST rate percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  gstRate?: number;

  // Add-ons
  @ApiPropertyOptional({ description: 'Associated addon IDs', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  addonIds?: string[];

  // Legacy support for backward compatibility
  @ApiPropertyOptional({ description: 'Legacy: Item name (maps to nameEn)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Legacy: Item description (maps to descriptionEn)' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Legacy: Item price (maps to pricing.amount)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Legacy: Category (maps to categoryId)' })
  @IsMongoId()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Legacy: Is item blocked (opposite of isAvailable)' })
  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;

  @ApiPropertyOptional({ description: 'Legacy: Image URL (maps to imageUrl)' })
  @IsString()
  @IsOptional()
  image?: string;
}