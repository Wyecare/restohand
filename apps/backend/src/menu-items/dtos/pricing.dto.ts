import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MenuItemPricingDto {
  @ApiProperty({ example: 99 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 'INR', default: 'INR' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isTaxInclusive?: boolean;
}
