import { ApiProperty } from '@nestjs/swagger';

export class MenuCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty({ required: false })
  branchId?: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  displayOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  // GST Configuration fields
  @ApiProperty({ required: false })
  defaultGstRateId?: string;

  @ApiProperty({ required: false })
  defaultGstRate?: number;

  @ApiProperty({ required: false })
  gstCategoryType?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
