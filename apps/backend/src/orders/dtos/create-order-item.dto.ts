import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemPricingDto } from './order-item-pricing.dto';

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
    example: 'Extra chutney please',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
