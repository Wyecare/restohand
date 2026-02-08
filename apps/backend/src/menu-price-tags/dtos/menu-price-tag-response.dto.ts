import { ApiProperty } from '@nestjs/swagger';

export class PriceTagRuleResponseDto {
  @ApiProperty({ example: 'date_range', enum: ['always', 'date_range', 'day_of_week', 'time_range'] })
  type!: 'always' | 'date_range' | 'day_of_week' | 'time_range';

  @ApiProperty({ example: '2024-12-24T00:00:00.000Z' })
  startDate?: string;

  @ApiProperty({ example: '2024-12-26T23:59:59.999Z' })
  endDate?: string;

  @ApiProperty({ example: [6, 0] })
  daysOfWeek?: number[];

  @ApiProperty({ example: '17:00' })
  startTime?: string;

  @ApiProperty({ example: '21:00' })
  endTime?: string;
}

export class ItemPriceOverrideResponseDto {
  @ApiProperty({ example: '66f0e5ec2ed1f1a1c4f9c7e3' })
  menuItemId!: string;

  @ApiProperty({ example: 199.99 })
  price!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ example: 'percentage_off', enum: ['fixed', 'percentage_off', 'amount_off'] })
  discountType!: 'fixed' | 'percentage_off' | 'amount_off';

  @ApiProperty({ example: 20 })
  discountValue?: number;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class MenuPriceTagResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  restaurantId!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439013' })
  branchId!: string;

  @ApiProperty({ example: 'Weekend Special' })
  name!: string;

  @ApiProperty({ example: '25% off on all pizzas during weekends' })
  description?: string;

  @ApiProperty({ example: '#FF6B35' })
  color!: string;

  @ApiProperty({ example: false })
  isActive!: boolean;

  @ApiProperty({ example: false })
  isDefault!: boolean;

  @ApiProperty({ example: 10 })
  priority!: number;

  @ApiProperty({ type: PriceTagRuleResponseDto })
  applicabilityRule?: PriceTagRuleResponseDto;

  @ApiProperty({ type: [ItemPriceOverrideResponseDto] })
  itemPrices!: ItemPriceOverrideResponseDto[];

  @ApiProperty({ example: false })
  autoActivate!: boolean;

  @ApiProperty({ example: '2024-01-01T12:00:00.000Z' })
  activatedAt?: string;

  @ApiProperty({ example: '2024-01-02T12:00:00.000Z' })
  deactivatedAt?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439014' })
  activatedBy?: string;

  @ApiProperty({ example: 1 })
  displayOrder!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}