import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class QueryRestaurantsDto {
  @ApiPropertyOptional({ example: 'resto', description: 'Search by name or slug' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ example: 'Kochi' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: '1', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: '20', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
