import { ApiProperty } from '@nestjs/swagger';
import { OrderItemPricingDto } from './order-item-pricing.dto';

export class OrderItemResponseDto {
  @ApiProperty()
  menuItemId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ type: OrderItemPricingDto })
  pricing!: OrderItemPricingDto;

  @ApiProperty({ required: false })
  notes?: string;
}
