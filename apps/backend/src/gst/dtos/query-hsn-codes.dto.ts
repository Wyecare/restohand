import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination.dto';

export class QueryHsnCodesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for HSN code or description',
    example: '0101',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by product category',
    example: 'food',
  })
  @IsOptional()
  @IsString()
  category?: string;
}