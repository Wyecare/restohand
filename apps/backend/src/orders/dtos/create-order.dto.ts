import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PAYMENT_METHODS = ['upi', 'cash', 'pending'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
    description: 'Branch ID — used by staff POS for walk-in orders where no table is selected',
  })
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiProperty({
    example: '66f0e5ec2ed1f1a1c4f9c7e3',
    required: false,
    description: 'Anonymous session ID from QR flow',
  })
  @IsOptional()
  @IsMongoId()
  sessionId?: string;

  @ApiProperty({
    example: 'b5bc55d9-132c-4984-8a96-a1077a96af57',
    required: false,
    description: 'Customer session ID from session management (UUID format)',
  })
  @IsOptional()
  @IsString()
  customerSessionId?: string;

  @ApiProperty({ example: 'T5', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tableNumber?: string;

  @ApiProperty({
    example: '6973687bf222179855e651bf',
    required: false,
    description: 'Globally unique table ID (preferred over tableNumber for branch isolation)'
  })
  @IsOptional()
  @IsMongoId()
  tableId?: string;

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

  @ApiProperty({ example: 'guest@example.com', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  customerEmail?: string;

  @ApiProperty({
    example: '32ABCDE1234F1Z5',
    required: false,
    description: 'Customer GSTIN when billing a registered business',
  })
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
  customerGstin?: string;

  @ApiProperty({
    example: 'Kerala',
    required: false,
    description: 'Customer state used to determine inter vs intra-state GST',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  customerState?: string;

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

  @ApiPropertyOptional({ enum: ['upi', 'cash', 'pending'], default: 'pending' })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: PaymentMethod;
}
