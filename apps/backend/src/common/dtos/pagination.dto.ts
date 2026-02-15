import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    example: '1',
    default: '1',
    description: 'Page number (1-based)',
  })
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @ApiPropertyOptional({
    example: '20',
    default: '20',
    description: 'Number of items per page (max 100)',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string = '1000';
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext!: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev!: boolean;
}

export abstract class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  abstract data: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
