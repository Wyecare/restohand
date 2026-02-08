import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ModifierOptionDto {
  @ApiProperty({ example: 'Chicken' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiProperty({ example: 'Grilled chicken pieces', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ example: 50, description: 'Additional cost for this option' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceAdjustment!: number;

  @ApiProperty({ example: 'INR', default: 'INR' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({ example: 'https://example.com/chicken.jpg', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ example: 150, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiProperty({ example: ['dairy', 'nuts'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}

export class CreateMenuModifierDto {
  @ApiProperty({ example: 'Pizza Toppings' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'Choose your favorite pizza toppings', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({
    example: 'multiple',
    enum: ['single', 'multiple'],
    description: 'Whether customer can select one or multiple options'
  })
  @IsEnum(['single', 'multiple'])
  selectionType!: 'single' | 'multiple';

  @ApiProperty({
    example: 0,
    description: 'Minimum number of options customer must select (0 = optional)'
  })
  @IsInt()
  @Min(0)
  minSelections!: number;

  @ApiProperty({
    example: 3,
    description: 'Maximum number of options customer can select'
  })
  @IsInt()
  @Min(1)
  @Max(20)
  maxSelections!: number;

  @ApiProperty({
    example: false,
    description: 'Whether this modifier selection is mandatory'
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({
    type: [ModifierOptionDto],
    description: 'Available options for this modifier'
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ModifierOptionDto)
  options!: ModifierOptionDto[];

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({
    example: ['66f0e5ec2ed1f1a1c4f9c7e3'],
    required: false,
    description: 'Menu item IDs this modifier applies to'
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableMenuItems?: string[];

  @ApiProperty({
    example: ['Pizza', 'Pasta'],
    required: false,
    description: 'Category names this modifier applies to'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];
}