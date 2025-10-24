import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination.dto';

export class QueryMenuCategoriesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for category name',
    example: 'appetizers',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  isActive?: string;
}