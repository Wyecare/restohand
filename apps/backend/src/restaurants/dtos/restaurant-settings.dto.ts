import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class RestaurantSettingsDto {
  @ApiProperty({ example: 'ORD', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  orderNumberPrefix?: string;

  @ApiProperty({ example: 'INR', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ example: 'en-IN', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enableTax?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Enable customer self-ordering via QR codes'
  })
  @IsOptional()
  @IsBoolean()
  selfOrderingEnabled?: boolean;
}