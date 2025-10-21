import { ApiProperty } from '@nestjs/swagger';
import { MenuCategoryResponseDto } from './menu-category-response.dto';

export class MenuCategoryListResponseDto {
  @ApiProperty({ type: [MenuCategoryResponseDto] })
  data!: MenuCategoryResponseDto[];
}
