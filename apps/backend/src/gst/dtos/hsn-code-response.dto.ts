import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto, PaginationMetaDto } from '../../common/dtos/pagination.dto';

export class HsnCodeResponseDto {
  @ApiProperty({ description: 'HSN code ID' })
  id!: string;

  @ApiProperty({ description: 'HSN code' })
  code!: string;

  @ApiProperty({ description: 'Description of the HSN code' })
  description!: string;

  @ApiProperty({ description: 'HSN chapter' })
  chapter?: string;

  @ApiProperty({ description: 'HSN heading' })
  heading?: string;

  @ApiProperty({ description: 'Default GST rate' })
  defaultGstRate!: number;

  @ApiProperty({ description: 'Search keywords' })
  keywords!: string[];

  @ApiProperty({ description: 'Category type' })
  category!: 'food' | 'beverage' | 'other';

  @ApiProperty({ description: 'Whether this HSN code is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Whether this is a popular HSN code' })
  isPopular!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: string;
}

export class HsnCodeListResponseDto extends PaginatedResponseDto<HsnCodeResponseDto> {
  @ApiProperty({ type: [HsnCodeResponseDto] })
  override data!: HsnCodeResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}