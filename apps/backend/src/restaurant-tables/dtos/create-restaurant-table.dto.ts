import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRestaurantTableDto {
  @ApiProperty({
    example: 'T5',
    description: 'Visible table code shared with staff and customers',
  })
  @IsString()
  @MaxLength(20)
  tableNumber!: string;

  @ApiProperty({
    example: 'Window Corner',
    required: false,
    description: 'Friendly label displayed in dashboards',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @ApiProperty({
    example: 4,
    required: false,
    description: 'Seats available on the table',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  capacity?: number;

  @ApiProperty({
    example: 'Patio',
    required: false,
    description: 'Section or zone to help staff group tables',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  zone?: string;

  @ApiProperty({
    example: 10,
    required: false,
    description: 'Custom ordering of tables within the list',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  displayOrder?: number;
}
