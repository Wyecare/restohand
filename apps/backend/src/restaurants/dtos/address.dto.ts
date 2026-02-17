import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsIn,
  IsEnum,
} from 'class-validator';
import { IndianState } from '../../common/enums/indian-states.enum';

export class RestaurantAddressDto {
  @ApiProperty({ example: '123 MG Road', minLength: 3, maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  line1!: string;

  @ApiProperty({ example: 'Opposite Metro Station', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  line2?: string;

  @ApiProperty({ example: 'Kochi' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  city!: string;

  @ApiProperty({
    description: 'State',
    enum: IndianState,
    enumName: 'IndianState',
    example: IndianState.KERALA
  })
  @IsEnum(IndianState, { message: 'State must be a valid Indian state' })
  state!: IndianState;

  @ApiProperty({ example: '682001' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ example: 'IN', default: 'IN' })
  @IsString()
  @IsIn(['IN'])
  country!: string;
}
