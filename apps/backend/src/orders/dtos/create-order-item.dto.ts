import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemPricingDto } from './order-item-pricing.dto';

export class OptionSelectionDto {
  @ApiProperty({ example: '66f0e5ec2ed1f1a1c4f9c7e4' })
  @IsMongoId()
  optionId!: string;

  @ApiProperty({ example: 'Extra Cheese' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  optionName!: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  priceAdjustment!: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class ModifierSelectionDto {
  @ApiProperty({ example: '66f0e5ec2ed1f1a1c4f9c7e3' })
  @IsMongoId()
  modifierId!: string;

  @ApiProperty({ example: 'Toppings' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  modifierName!: string;

  @ApiProperty({ type: [OptionSelectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionSelectionDto)
  selectedOptions!: OptionSelectionDto[];
}

export class CreateOrderItemDto {
  @ApiProperty({ example: '66f0e5ec2ed1f1a1c4f9c7e3' })
  @IsMongoId()
  menuItemId!: string;

  @ApiProperty({ example: 'Masala Dosa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ type: OrderItemPricingDto })
  @ValidateNested()
  @Type(() => OrderItemPricingDto)
  pricing!: OrderItemPricingDto;

  @ApiProperty({
    example: '66f0e5ec2ed1f1a1c4f9c7e5',
    required: false,
    description: 'Active price tag ID for this item'
  })
  @IsOptional()
  @IsMongoId()
  activePriceTagId?: string;

  @ApiProperty({
    type: [ModifierSelectionDto],
    required: false,
    description: 'Selected modifiers with their options'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifierSelectionDto)
  selectedModifiers?: ModifierSelectionDto[];

  @ApiProperty({
    example: 'Extra chutney please',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
