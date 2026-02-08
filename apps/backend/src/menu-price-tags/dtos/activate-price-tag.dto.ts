import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ActivatePriceTagDto {
  @ApiProperty({
    example: true,
    description: 'Whether to activate (true) or deactivate (false) this price tag'
  })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Force activation even if another tag is currently active'
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}