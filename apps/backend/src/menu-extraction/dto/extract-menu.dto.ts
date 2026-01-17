import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExtractMenuFromBase64Dto {
  @ApiProperty({
    description: 'Base64-encoded PDF data',
    example: 'JVBERi0xLjQ...',
  })
  @IsString()
  @IsNotEmpty()
  base64Data: string;

  @ApiProperty({
    description: 'Media type of the PDF',
    example: 'application/pdf',
    default: 'application/pdf',
  })
  @IsString()
  @IsOptional()
  mediaType?: string = 'application/pdf';
}

export class ExtractedMenuItemDto {
  @ApiProperty({
    description: 'Item name',
    example: 'Chicken Biryani',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Item description',
    example: 'Aromatic basmati rice with tender chicken pieces',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Item price',
    example: 250.00,
  })
  @IsNumber()
  price: number;
}

export class ExtractedCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Main Course',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Items in this category',
    type: [ExtractedMenuItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedMenuItemDto)
  items: ExtractedMenuItemDto[];
}

export class BulkImportMenuDto {
  @ApiProperty({
    description: 'Categories and their items to import',
    type: [ExtractedCategoryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedCategoryDto)
  categories: ExtractedCategoryDto[];

  @ApiProperty({
    description: 'Currency',
    example: 'INR',
    default: 'INR',
  })
  @IsString()
  @IsOptional()
  currency?: string = 'INR';
}