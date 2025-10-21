import { ApiProperty } from '@nestjs/swagger';
import { RestaurantResponseDto } from './restaurant-response.dto';

export class RestaurantListResponseDto {
  @ApiProperty({ type: [RestaurantResponseDto] })
  data!: RestaurantResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
