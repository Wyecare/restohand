import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RestaurantUpiConfigDto {
  @ApiProperty({ example: 'restohand@upi' })
  @IsString()
  @MinLength(5)
  @MaxLength(60)
  vpa!: string;

  @ApiProperty({ example: 'Restohand Café' })
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  displayName!: string;

  @ApiProperty({ enum: ['static', 'dynamic'], default: 'static' })
  @IsString()
  @IsIn(['static', 'dynamic'])
  mode!: 'static' | 'dynamic';
}
