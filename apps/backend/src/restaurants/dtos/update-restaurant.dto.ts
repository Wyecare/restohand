import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, ValidateNested, IsEnum, IsNumber, IsBoolean, IsString, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRestaurantDto } from './create-restaurant.dto';

export enum RestaurantType {
  STANDALONE = 'standalone',
  HOTEL_UNDER_7500 = 'hotel_under_7500',
  HOTEL_ABOVE_7500 = 'hotel_above_7500',
  CATERING_STANDALONE = 'catering_standalone',
  CATERING_PREMIUM = 'catering_premium'
}

class GstConfigDto {
  @ApiProperty({
    enum: RestaurantType,
    example: RestaurantType.STANDALONE,
    description: 'Type of restaurant establishment'
  })
  @IsOptional()
  @IsEnum(RestaurantType)
  establishmentType?: RestaurantType;

  @ApiProperty({
    example: 5,
    enum: [5, 18],
    description: 'GST rate (5% or 18%)'
  })
  @IsOptional()
  @IsEnum([5, 18])
  defaultGstRate?: 5 | 18;

  @ApiProperty({
    example: false,
    description: 'Whether the establishment can claim Input Tax Credit'
  })
  @IsOptional()
  @IsBoolean()
  canClaimITC?: boolean;

  @ApiProperty({
    example: 'Kerala',
    description: 'Business state for GST jurisdiction'
  })
  @IsOptional()
  @IsString()
  businessState?: string;

  @ApiProperty({
    example: '32ABCDE1234F1Z5',
    description: '15-digit GST Identification Number (optional)',
    required: false
  })
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/, {
    message: 'Invalid GSTIN format. Must be 15 characters (e.g., 29ABCDE1234F1Z5)'
  })
  gstin?: string;

  @ApiProperty({
    example: 10000,
    description: 'Room tariff per night (required for hotel restaurants)',
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  roomTariff?: number;

  @ApiProperty({
    example: false,
    description: 'Whether the restaurant serves alcoholic beverages'
  })
  @IsOptional()
  @IsBoolean()
  servesAlcohol?: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether to enable service charge on bills'
  })
  @IsOptional()
  @IsBoolean()
  enableServiceCharge?: boolean;

  @ApiProperty({
    example: 10,
    description: 'Service charge rate as percentage (0-50%)',
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  serviceChargeRate?: number;

  @ApiProperty({
    example: false,
    description: 'Whether integrated with food delivery platforms (Zomato/Swiggy)'
  })
  @IsOptional()
  @IsBoolean()
  integratedWithDeliveryPlatforms?: boolean;

  @ApiProperty({
    example: true,
    description: 'Master switch to enable/disable GST calculations'
  })
  @IsOptional()
  @IsBoolean()
  isGstEnabled?: boolean;
}

class BusinessDetailsDto {
  @ApiProperty({
    example: 'ABCDE1234F',
    description: 'PAN number of the business',
    required: false
  })
  @IsOptional()
  @IsString()
  panNumber?: string;

  @ApiProperty({
    example: 'sole_proprietorship',
    enum: ['sole_proprietorship', 'partnership', 'private_limited', 'public_limited'],
    description: 'Type of business entity'
  })
  @IsOptional()
  @IsEnum(['sole_proprietorship', 'partnership', 'private_limited', 'public_limited'])
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
