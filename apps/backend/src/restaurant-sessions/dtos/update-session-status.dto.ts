import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TableSessionStatus {
  ACTIVE = 'active',
  READY = 'ready',
  COMPLETED = 'completed',
  PAID = 'paid',
}

export class UpdateSessionStatusDto {
  @ApiProperty({
    description: 'Session status',
    enum: TableSessionStatus,
    example: TableSessionStatus.READY
  })
  @IsNotEmpty()
  @IsEnum(TableSessionStatus)
  status: TableSessionStatus;
}