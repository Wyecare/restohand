import { ApiProperty } from '@nestjs/swagger';

export class MenuCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  displayOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
