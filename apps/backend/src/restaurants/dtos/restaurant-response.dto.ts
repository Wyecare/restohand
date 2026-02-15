import { ApiProperty } from '@nestjs/swagger';
import { RestaurantAddressDto } from './address.dto';
import { RestaurantUpiConfigDto } from './upi-config.dto';
import { RestaurantSettingsDto } from './restaurant-settings.dto';

class GstConfigResponseDto {
  @ApiProperty({
    enum: ['standalone', 'hotel_under_7500', 'hotel_above_7500', 'catering_standalone', 'catering_premium']
  })
  establishmentType!: string;

  @ApiProperty({ enum: [5, 18] })
  defaultGstRate!: number;

  @ApiProperty()
  canClaimITC!: boolean;

  @ApiProperty()
  businessState!: string;

  @ApiProperty({ required: false })
  gstin?: string;

  @ApiProperty({ required: false })
  roomTariff?: number;

  @ApiProperty()
  servesAlcohol!: boolean;

  @ApiProperty()
  enableServiceCharge!: boolean;

  @ApiProperty({ required: false })
  serviceChargeRate?: number;

  @ApiProperty()
  integratedWithDeliveryPlatforms!: boolean;

  @ApiProperty()
  isGstEnabled!: boolean;

  @ApiProperty()
  configuredAt!: string;

  @ApiProperty({ required: false })
  lastUpdatedAt?: string;
}

class BusinessDetailsResponseDto {
  @ApiProperty({ required: false })
  panNumber?: string;

  @ApiProperty({
    enum: ['sole_proprietorship', 'partnership', 'private_limited', 'public_limited'],
    required: false
  })
  businessType?: string;

  @ApiProperty({ type: GstConfigResponseDto, required: false })
  gst?: GstConfigResponseDto;
}

export class RestaurantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  legalName?: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ required: false })
  contactEmail?: string;

  @ApiProperty({ required: false })
  contactPhone?: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: RestaurantAddressDto })
  address!: RestaurantAddressDto;

  @ApiProperty({ type: RestaurantUpiConfigDto })
  upi!: RestaurantUpiConfigDto;

  @ApiProperty({ type: RestaurantSettingsDto })
  settings!: RestaurantSettingsDto;

  @ApiProperty({ required: false })
  gstin?: string;

  @ApiProperty({ type: [String] })
  languages!: string[];

  @ApiProperty({
    description: 'Force all menu items to use the default GST rate configured in settings',
    default: false,
  })
  applyDefaultGstToMenuItems!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: BusinessDetailsResponseDto, required: false })
  businessDetails?: BusinessDetailsResponseDto;
}
