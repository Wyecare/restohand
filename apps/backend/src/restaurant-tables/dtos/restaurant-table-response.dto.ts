import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from '../../orders/dtos/order-response.dto';

export class RestaurantTableResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  tableNumber!: string;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty({ required: false })
  zone?: string;

  @ApiProperty({ default: 0 })
  displayOrder!: number;

  @ApiProperty({ default: true })
  isActive!: boolean;

  @ApiProperty({ required: false })
  layoutX?: number;

  @ApiProperty({ required: false })
  layoutY?: number;

  @ApiProperty({ required: false })
  layoutWidth?: number;

  @ApiProperty({ required: false })
  layoutHeight?: number;

  @ApiProperty({ required: false })
  layoutRotation?: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ required: false, type: () => OrderResponseDto })
  activeOrder?: OrderResponseDto;
}
