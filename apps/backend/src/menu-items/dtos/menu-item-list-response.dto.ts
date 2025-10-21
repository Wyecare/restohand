import { ApiProperty } from '@nestjs/swagger';
import { MenuItemResponseDto } from './menu-item-response.dto';

export class MenuItemListResponseDto {
  @ApiProperty({ type: [MenuItemResponseDto] })
  data!: MenuItemResponseDto[];
}
