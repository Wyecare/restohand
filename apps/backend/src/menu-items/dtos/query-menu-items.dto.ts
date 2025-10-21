import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class QueryMenuItemsDto {
  @ApiPropertyOptional({ example: '66f0e5ec2ed1f1a1c4f9c7e3' })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsBooleanString()
  isAvailable?: string;

  @ApiPropertyOptional({ example: 'dosa' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;
}
