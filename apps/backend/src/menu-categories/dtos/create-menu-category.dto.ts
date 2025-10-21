import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsInt,
  Min,
} from 'class-validator';

export class CreateMenuCategoryDto {
  @ApiProperty({ example: 'Beverages' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    example: 'Fresh juices, smoothies, and hot beverages',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
