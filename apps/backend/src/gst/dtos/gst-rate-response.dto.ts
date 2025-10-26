import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto, PaginationMetaDto } from '../../common/dtos/pagination.dto';

export class GstRateResponseDto {
  @ApiProperty({ description: 'GST rate ID' })
  id!: string;

  @ApiProperty({ description: 'Restaurant ID' })
  restaurantId!: string;

  @ApiProperty({ description: 'Friendly label for this GST rate' })
  categoryName!: string;

  @ApiProperty({ description: 'Description of the GST category' })
  description?: string;

  @ApiProperty({ description: 'Central GST rate' })
  cgstRate!: number;

  @ApiProperty({ description: 'State GST rate' })
  sgstRate!: number;

  @ApiProperty({ description: 'Integrated GST rate' })
  igstRate!: number;

  @ApiProperty({ description: 'Total GST rate' })
  totalGstRate!: number;

  @ApiProperty({ description: 'Whether this rate is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Whether this is the default rate' })
  isDefault!: boolean;

  @ApiProperty({ description: 'Effective from date' })
  effectiveFrom!: string;

  @ApiProperty({ description: 'Effective to date' })
  effectiveTo?: string;

  @ApiProperty({ description: 'Additional notes' })
  notes?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: string;
}

export class GstRateListResponseDto extends PaginatedResponseDto<GstRateResponseDto> {
  @ApiProperty({ type: [GstRateResponseDto] })
  override data!: GstRateResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
