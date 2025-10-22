import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
