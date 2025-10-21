import { ApiProperty } from '@nestjs/swagger';
import { RestaurantAddressDto } from './address.dto';
import { RestaurantUpiConfigDto } from './upi-config.dto';

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

  @ApiProperty({ type: [String] })
  languages!: string[];

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
