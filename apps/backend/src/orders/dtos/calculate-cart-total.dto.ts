import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { CustomerInfoDto } from './create-order-with-payment.dto';

export class CalculateCartTotalDto {
  @ApiProperty({ example: 'T5', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tableNumber?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({
    example: 'Less spicy please',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @ApiProperty({ type: CustomerInfoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo?: CustomerInfoDto;
}