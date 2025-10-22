import { ApiProperty } from '@nestjs/swagger';

export class OrderEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ required: false, type: Object })
  payload?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;
}
