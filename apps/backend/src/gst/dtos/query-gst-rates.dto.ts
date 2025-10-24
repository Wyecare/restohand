import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination.dto';

export class QueryGstRatesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for GST category name',
    example: 'food',
  })
  @IsOptional()
  @IsString()
  search?: string;
}