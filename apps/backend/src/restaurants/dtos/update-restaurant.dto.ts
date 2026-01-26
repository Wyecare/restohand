import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRestaurantDto } from './create-restaurant.dto';

class GstConfigDto {
  @ApiProperty({ example: 'standalone' })
  @IsOptional()
  establishmentType?: string;

  @ApiProperty({ example: 5 })
  @IsOptional()
  defaultGstRate?: number;

  @ApiProperty({ example: false })
  @IsOptional()
  canClaimITC?: boolean;

  @ApiProperty({ example: 'Kerala' })
  @IsOptional()
  businessState?: string;

  @ApiProperty({ example: '32ABCDE1234F1Z5' })
  @IsOptional()
  gstin?: string;
}

class BusinessDetailsDto {
  @ApiProperty({ example: 'ABCDE1234F' })
  @IsOptional()
  panNumber?: string;

  @ApiProperty({ example: 'sole_proprietorship' })
  @IsOptional()
  businessType?: string;

  @ApiProperty({ type: GstConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GstConfigDto)
  gst?: GstConfigDto;
}

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {
  @ApiProperty({ type: BusinessDetailsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDetailsDto)
  businessDetails?: BusinessDetailsDto;
}
