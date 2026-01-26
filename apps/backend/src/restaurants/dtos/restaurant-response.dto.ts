import { ApiProperty } from '@nestjs/swagger';
import { RestaurantAddressDto } from './address.dto';
import { RestaurantUpiConfigDto } from './upi-config.dto';
import { RestaurantSettingsDto } from './restaurant-settings.dto';

class GstConfigResponseDto {
  @ApiProperty()
  establishmentType!: string;

  @ApiProperty()
  defaultGstRate!: number;

  @ApiProperty()
  canClaimITC!: boolean;

  @ApiProperty()
  businessState!: string;

  @ApiProperty({ required: false })
  gstin?: string;
}

class BusinessDetailsResponseDto {
  @ApiProperty({ required: false })
  panNumber?: string;

  @ApiProperty({ required: false })
  businessType?: string;

  @ApiProperty({ type: GstConfigResponseDto })
  gst!: GstConfigResponseDto;
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
