import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  data!: OrderResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
