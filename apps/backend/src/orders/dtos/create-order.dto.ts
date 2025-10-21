import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({
    example: '66f0e5ec2ed1f1a1c4f9c7e3',
    required: false,
    description: 'Anonymous session ID from QR flow',
  })
  @IsOptional()
  @IsMongoId()
  sessionId?: string;

  @ApiProperty({ example: 'T5', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tableNumber?: string;

  @ApiProperty({ example: 'Rahul', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  customerName?: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

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
}
