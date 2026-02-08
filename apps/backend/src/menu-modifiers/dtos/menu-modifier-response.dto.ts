import { ApiProperty } from '@nestjs/swagger';

export class ModifierOptionResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: 'Chicken' })
  name!: string;

  @ApiProperty({ example: 'Grilled chicken pieces' })
  description?: string;

  @ApiProperty({ example: 50 })
  priceAdjustment!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty({ example: 1 })
  displayOrder!: number;

  @ApiProperty({ example: 'https://example.com/chicken.jpg' })
  imageUrl?: string;

  @ApiProperty({ example: 150 })
  calories?: number;

  @ApiProperty({ example: ['dairy', 'nuts'] })
  allergens!: string[];
}

export class MenuModifierResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  restaurantId!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439013' })
  branchId!: string;

  @ApiProperty({ example: 'Pizza Toppings' })
  name!: string;

  @ApiProperty({ example: 'Choose your favorite pizza toppings' })
  description?: string;

  @ApiProperty({ example: 'multiple', enum: ['single', 'multiple'] })
  selectionType!: 'single' | 'multiple';

  @ApiProperty({ example: 0 })
  minSelections!: number;

  @ApiProperty({ example: 3 })
  maxSelections!: number;

  @ApiProperty({ example: false })
  isRequired!: boolean;

  @ApiProperty({ type: [ModifierOptionResponseDto] })
  options!: ModifierOptionResponseDto[];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 1 })
  displayOrder!: number;

  @ApiProperty({ example: ['66f0e5ec2ed1f1a1c4f9c7e3'] })
  applicableMenuItems!: string[];

  @ApiProperty({ example: ['Pizza', 'Pasta'] })
  applicableCategories!: string[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}