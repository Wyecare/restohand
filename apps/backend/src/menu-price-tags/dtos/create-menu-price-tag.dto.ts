import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PriceTagRuleDto {
  @ApiProperty({
    example: 'date_range',
    enum: ['always', 'date_range', 'day_of_week', 'time_range'],
    description: 'When this price tag should be applied'
  })
  @IsEnum(['always', 'date_range', 'day_of_week', 'time_range'])
  type!: 'always' | 'date_range' | 'day_of_week' | 'time_range';

  @ApiProperty({ example: '2024-12-24T00:00:00.000Z', required: false })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiProperty({ example: '2024-12-26T23:59:59.999Z', required: false })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiProperty({
    example: [6, 0],
    required: false,
    description: 'Days of week (0=Sunday, 1=Monday, etc.)'
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiProperty({ example: '17:00', required: false })
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format'
  })
  startTime?: string;

  @ApiProperty({ example: '21:00', required: false })
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:MM format'
  })
  endTime?: string;
}

export class ItemPriceOverrideDto {
  @ApiProperty({ example: '66f0e5ec2ed1f1a1c4f9c7e3' })
  @IsMongoId()
  menuItemId!: string;

  @ApiProperty({ example: 199.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'INR', default: 'INR' })
  @IsString()
  currency!: string;

  @ApiProperty({
    example: 'percentage_off',
    enum: ['fixed', 'percentage_off', 'amount_off'],
    default: 'fixed'
  })
  @IsOptional()
  @IsEnum(['fixed', 'percentage_off', 'amount_off'])
  discountType?: 'fixed' | 'percentage_off' | 'amount_off';

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100) // Max 100% discount
  discountValue?: number;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateMenuPriceTagDto {
  @ApiProperty({ example: 'Weekend Special' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: '25% off on all pizzas during weekends', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ example: '#FF6B35', description: 'Hex color for UI identification' })
  @IsHexColor()
  color!: string;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ example: 10, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiProperty({ type: PriceTagRuleDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceTagRuleDto)
  applicabilityRule?: PriceTagRuleDto;

  @ApiProperty({ type: [ItemPriceOverrideDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500) // Reasonable limit for performance
  @ValidateNested({ each: true })
  @Type(() => ItemPriceOverrideDto)
  itemPrices!: ItemPriceOverrideDto[];

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  autoActivate?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}