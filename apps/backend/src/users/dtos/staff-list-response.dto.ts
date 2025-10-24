import { ApiProperty } from '@nestjs/swagger';
import { StaffResponseDto } from './staff-response.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../common/dtos/pagination.dto';

export class StaffListResponseDto extends PaginatedResponseDto<StaffResponseDto> {
  @ApiProperty({ type: [StaffResponseDto] })
  override data!: StaffResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}