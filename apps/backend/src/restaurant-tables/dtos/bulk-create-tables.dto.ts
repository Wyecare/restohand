import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum BulkTableLayout {
  LAYOUT_4 = '4',
  LAYOUT_6 = '6',
  LAYOUT_8 = '8',
  LAYOUT_16 = '16',
}

export class BulkCreateTablesDto {
  @ApiProperty({
    example: BulkTableLayout.LAYOUT_4,
    description: 'Layout pattern for bulk table creation',
    enum: BulkTableLayout,
  })
  @IsEnum(BulkTableLayout)
  layout!: BulkTableLayout;

  @ApiProperty({
    example: 'T',
    required: false,
    description: 'Prefix for auto-generated table numbers',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  tablePrefix?: string;

  @ApiProperty({
    example: 4,
    required: false,
    description: 'Default capacity for all tables',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  capacity?: number;

  @ApiProperty({
    example: 'Main Hall',
    required: false,
    description: 'Zone for all tables',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  zone?: string;
}