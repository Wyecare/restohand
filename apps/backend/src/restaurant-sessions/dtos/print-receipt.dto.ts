import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PrintReceiptType {
  CUSTOMER = 'customer',
  KITCHEN = 'kitchen',
  SUMMARY = 'summary',
}

export class PrintReceiptDto {
  @ApiProperty({
    description: 'Receipt type',
    enum: PrintReceiptType,
    example: PrintReceiptType.CUSTOMER
  })
  @IsNotEmpty()
  @IsEnum(PrintReceiptType)
  type: PrintReceiptType;

  @ApiPropertyOptional({
    description: 'Specific order ID for individual order receipts'
  })
  @IsOptional()
  @IsString()
  orderId?: string;
}