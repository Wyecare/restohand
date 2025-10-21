import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RestaurantAddressDto } from './address.dto';
import { RestaurantUpiConfigDto } from './upi-config.dto';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Restohand Café' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'Restohand Private Limited', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  legalName?: string;

  @ApiProperty({ example: 'restohand-cafe' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MinLength(3)
  @MaxLength(60)
  slug!: string;

  @ApiProperty({ example: 'hello@restohand.in', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactEmail?: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiProperty({ example: 'Asia/Kolkata', default: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiProperty({ type: RestaurantAddressDto })
  @ValidateNested()
  @Type(() => RestaurantAddressDto)
  address!: RestaurantAddressDto;

  @ApiProperty({ type: RestaurantUpiConfigDto })
  @ValidateNested()
  @Type(() => RestaurantUpiConfigDto)
  upi!: RestaurantUpiConfigDto;

  @ApiProperty({
    example: ['en', 'ml'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  languages?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
