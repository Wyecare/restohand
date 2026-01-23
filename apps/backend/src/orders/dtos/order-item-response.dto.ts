import { ApiProperty } from '@nestjs/swagger';
import { OrderItemPricingDto } from './order-item-pricing.dto';
import { OrderItemGstDto } from './order-item-gst.dto';

export class OrderItemResponseDto {
  @ApiProperty()
  menuItemId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ type: OrderItemPricingDto })
  pricing!: OrderItemPricingDto;

  @ApiProperty({ type: OrderItemGstDto, required: false })
  gst?: OrderItemGstDto;

  @ApiProperty({ required: false })
  notes?: string;
  lineTotal: any;
  taxAmount: any;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}
