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
import { RestaurantSettingsDto } from './restaurant-settings.dto';

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

  @ApiProperty({ type: RestaurantSettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => RestaurantSettingsDto)
  settings?: RestaurantSettingsDto;

  @ApiProperty({
    example: '32ABCDE1234F1Z5',
    required: false,
    description: '15-character GSTIN in uppercase',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
  gstin?: string;

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

  @ApiProperty({
    example: false,
    required: false,
    description:
      'When enabled, all menu items will automatically use the default GST rate configured for the restaurant.',
  })
  @IsOptional()
  @IsBoolean()
  applyDefaultGstToMenuItems?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
