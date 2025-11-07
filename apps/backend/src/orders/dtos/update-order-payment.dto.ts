import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export class UpdateOrderPaymentDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ example: 'upi-transaction-123' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  transactionId?: string;

  @ApiPropertyOptional({ example: 'PhonePe' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  provider?: string;

  @ApiPropertyOptional({
    example: 'upi',
    description: 'Payment method used (upi, cash, card, etc.)'
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  paymentMethod?: string;
}
