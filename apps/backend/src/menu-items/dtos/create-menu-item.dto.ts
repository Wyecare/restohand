import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MenuItemPricingDto } from './pricing.dto';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Masala Dosa' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'Rice crepe stuffed with spiced potatoes, served with chutney.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: '66f0e5ec2ed1f1a1c4f9c7e3',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiProperty({ type: MenuItemPricingDto })
  @ValidateNested()
  @Type(() => MenuItemPricingDto)
  pricing!: MenuItemPricingDto;

  @ApiProperty({ type: [String], example: ['south-indian', 'vegetarian'], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['https://cdn.restohand.in/menu/dosa.png'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUrl(undefined, { each: true })
  imageUrls?: string[];

  @ApiProperty({
    example: '996331',
    required: false,
    description: '4-8 digit HSN code used for GST classification',
  })
  @IsOptional()
  @Matches(/^\d{4,8}$/)
  hsnCode?: string;

  @ApiProperty({
    example: '66f0e5ec2ed1f1a1c4f9c7e3',
    required: false,
    description: 'GST rate identifier defined via GST settings',
  })
  @IsOptional()
  @IsMongoId()
  gstRateId?: string;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'Total GST percentage for quick lookups (falls back to linked GST rate).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  gstRate?: number;
}
