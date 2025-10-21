import { ApiProperty } from '@nestjs/swagger';
import { MenuItemPricingDto } from './pricing.dto';

export class MenuItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty({ required: false })
  categoryId?: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ type: MenuItemPricingDto })
  pricing!: MenuItemPricingDto;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  displayOrder!: number;

  @ApiProperty({ type: [String] })
  imageUrls!: string[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
