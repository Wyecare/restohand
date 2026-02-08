import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MenuItemPricingDto } from './pricing.dto';

export class NutritionalInfoDto {
  @ApiProperty({ example: 350, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiProperty({ example: 25, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @ApiProperty({ example: 40, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbohydrates?: number;

  @ApiProperty({ example: 12, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sugar?: number;

  @ApiProperty({ example: 800, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium?: number;

  @ApiProperty({ example: '1 serving', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  servingSize?: string;
}

export class DietaryInfoDto {
  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isGlutenFree?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isDairyFree?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isNutFree?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isSpicy?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isHalal?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isKosher?: boolean;
}

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Masala Dosa' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'Rice crepe stuffed with spiced potatoes, served with chutney.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: '66f0e5ec2ed1f1a1c4f9c7e3',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiProperty({ type: MenuItemPricingDto })
  @ValidateNested()
  @Type(() => MenuItemPricingDto)
  pricing!: MenuItemPricingDto;

  @ApiProperty({
    type: [String],
    example: ['south-indian', 'vegetarian'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['https://cdn.restohand.in/menu/dosa.png'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUrl(undefined, { each: true })
  imageUrls?: string[];

  // Smart GST Configuration (optional overrides)
  @ApiProperty({
    example: 'cooked_food',
    required: false,
    description: 'Override auto-detected food category',
    enum: [
      'cooked_food',
      'fresh_items',
      'packaged_items',
      'beverages',
      'alcohol',
      'sweets',
      'ice_cream',
    ],
  })
  @IsOptional()
  @IsString()
  foodCategory?:
    | 'cooked_food'
    | 'fresh_items'
    | 'packaged_items'
    | 'beverages'
    | 'alcohol'
    | 'sweets'
    | 'ice_cream';

  @ApiProperty({
    example: 12,
    required: false,
    description: 'Manual GST rate override (only for special cases)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  overrideGstRate?: number;

  // Enhanced POS Features
  @ApiProperty({
    example: {
      calories: 350,
      protein: 25,
      carbohydrates: 40,
      fat: 12,
      fiber: 5,
      sugar: 8,
      sodium: 800,
      servingSize: '1 serving',
    },
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionalInfoDto)
  nutritionalInfo?: NutritionalInfoDto;

  @ApiProperty({
    example: [
      {
        name: 'Chicken breast',
        quantity: '200g',
        allergens: ['none'],
        isOptional: false,
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: true,
        isDairyFree: true,
      },
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredients?: IngredientDto[];

  @ApiProperty({
    example: {
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: true,
      isDairyFree: false,
      isNutFree: true,
      isSpicy: false,
      isHalal: false,
      isKosher: false,
    },
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DietaryInfoDto)
  dietaryInfo?: DietaryInfoDto;

  @ApiProperty({
    example: ['66f0e5ec2ed1f1a1c4f9c7e4'],
    required: false,
    description: 'Modifier IDs that can be applied to this item',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableModifiers?: string[];

  @ApiProperty({
    example: ['66f0e5ec2ed1f1a1c4f9c7e5', '66f0e5ec2ed1f1a1c4f9c7e6'],
    required: false,
    description: 'Price tag IDs this item can use',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  priceTagIds?: string[];

  @ApiProperty({
    example: '66f0e5ec2ed1f1a1c4f9c7e5',
    required: false,
    description: 'Currently selected price tag for ordering',
  })
  @IsOptional()
  @IsMongoId()
  activePriceTagId?: string;

  @ApiProperty({ example: '15 minutes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  preparationTime?: string;

  @ApiProperty({ example: 'Cook on medium heat', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  preparationInstructions?: string;

  @ApiProperty({
    example: 'medium',
    enum: ['easy', 'medium', 'hard'],
    required: false,
  })
  @IsOptional()
  @IsString()
  preparationDifficulty?: 'easy' | 'medium' | 'hard';

  @ApiProperty({
    example: ['grill', 'salad_station'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kitchenStations?: string[];
}

export class IngredientDto {
  @ApiProperty({ example: 'Chicken breast' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '200g', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantity?: string;

  @ApiProperty({ example: ['none'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isOrganic?: boolean;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @ApiProperty({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isGlutenFree?: boolean;

  @ApiProperty({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isDairyFree?: boolean;
}
