import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination.dto';

export class QueryRestaurantTablesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for table name',
    example: 'table 1',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by occupied status',
    example: 'false',
  })
  @IsOptional()
  @IsString()
  isOccupied?: string;
}