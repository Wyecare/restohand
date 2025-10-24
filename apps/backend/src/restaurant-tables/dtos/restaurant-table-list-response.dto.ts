import { ApiProperty } from '@nestjs/swagger';
import { RestaurantTableResponseDto } from './restaurant-table-response.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../common/dtos/pagination.dto';

export class RestaurantTableListResponseDto extends PaginatedResponseDto<RestaurantTableResponseDto> {
  @ApiProperty({ type: [RestaurantTableResponseDto] })
  override data!: RestaurantTableResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}