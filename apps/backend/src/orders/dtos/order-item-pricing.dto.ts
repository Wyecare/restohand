import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class OrderItemPricingDto {
  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(0)
  unitAmount!: number;

  @ApiProperty({ example: 'INR', default: 'INR' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}
