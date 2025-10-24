import { ApiProperty } from '@nestjs/swagger';
import { MenuItemResponseDto } from './menu-item-response.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../common/dtos/pagination.dto';

export class MenuItemListResponseDto extends PaginatedResponseDto<MenuItemResponseDto> {
  @ApiProperty({ type: [MenuItemResponseDto] })
  override data!: MenuItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
