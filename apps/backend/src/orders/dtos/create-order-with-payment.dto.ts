import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CustomerInfoDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'customer@example.com', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;
}

export class CreateOrderWithPaymentDto {
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

  @ApiProperty({
    example: 25000,
    description: 'Total amount in paise (for verification)'
  })
  @IsNumber()
  @Min(1)
  totalAmount: number;
}