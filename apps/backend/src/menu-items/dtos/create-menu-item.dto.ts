import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  IsMongoId,
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
}
