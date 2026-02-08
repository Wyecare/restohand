import { ApiProperty } from '@nestjs/swagger';
import { MenuPriceTagResponseDto } from './menu-price-tag-response.dto';

export class MenuPriceTagListResponseDto {
  @ApiProperty({ type: [MenuPriceTagResponseDto] })
  data!: MenuPriceTagResponseDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 3 })
  pages!: number;
}