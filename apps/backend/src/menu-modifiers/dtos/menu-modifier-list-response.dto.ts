import { ApiProperty } from '@nestjs/swagger';
import { MenuModifierResponseDto } from './menu-modifier-response.dto';

export class MenuModifierListResponseDto {
  @ApiProperty({ type: [MenuModifierResponseDto] })
  data!: MenuModifierResponseDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 3 })
  pages!: number;
}