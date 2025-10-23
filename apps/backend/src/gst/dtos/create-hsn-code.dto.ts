import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsIn,
  Min,
  Max,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class CreateHsnCodeDto {
  @ApiProperty({ description: 'HSN code (4-8 digits)', example: '1006' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 8)
  code!: string;

  @ApiProperty({ description: 'Description of the HSN code' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'HSN chapter', required: false })
  @IsString()
  @IsOptional()
  chapter?: string;

  @ApiProperty({ description: 'HSN heading', required: false })
  @IsString()
  @IsOptional()
  heading?: string;

  @ApiProperty({ description: 'Default GST rate (0-100)', example: 5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  defaultGstRate!: number;

  @ApiProperty({
    description: 'Search keywords',
    example: ['rice', 'basmati', 'grain'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @ApiProperty({
    description: 'Category type',
    enum: ['food', 'beverage', 'other'],
    default: 'food'
  })
  @IsString()
  @IsIn(['food', 'beverage', 'other'])
  @IsOptional()
  category?: 'food' | 'beverage' | 'other';

  @ApiProperty({ description: 'Whether this HSN code is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Mark as popular HSN code', default: false })
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;
}