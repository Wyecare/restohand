import { ApiProperty } from '@nestjs/swagger';
import { MenuCategoryResponseDto } from './menu-category-response.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../common/dtos/pagination.dto';

export class MenuCategoryListResponseDto extends PaginatedResponseDto<MenuCategoryResponseDto> {
  @ApiProperty({ type: [MenuCategoryResponseDto] })
  override data!: MenuCategoryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
