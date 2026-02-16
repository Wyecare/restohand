import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength, IsMongoId } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination.dto';

export class MenuSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Search term for menu categories and items',
    example: 'pizza',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: 'Search query cannot be empty' })
  @MaxLength(100, { message: 'Search query is too long' })
  query: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiPropertyOptional({
    description: 'Table ID for branch-specific search',
    example: '60f0e5ec2ed1f1a1c4f9c7e3',
  })
  @IsOptional()
  @IsMongoId()
  tableId?: string;

  @ApiPropertyOptional({
    description: 'Table number for context',
    example: 'T1',
  })
  @IsOptional()
  @IsString()
  table?: string;
}

export class MenuSearchResultItem {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  type: 'category' | 'item';

  @ApiProperty({ required: false })
  categoryId?: string;

  @ApiProperty({ required: false })
  categoryName?: string;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty({ required: false })
  pricing?: {
    amount: number;
    currency: string;
  };

  @ApiProperty({ required: false })
  isAvailable?: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  tags?: string[];

  @ApiProperty()
  relevanceScore: number;
}

export class MenuSearchResponseDto {
  @ApiProperty({ type: [MenuSearchResultItem] })
  results: MenuSearchResultItem[];

  @ApiProperty()
  totalResults: number;

  @ApiProperty()
  categoriesFound: number;

  @ApiProperty()
  itemsFound: number;

  @ApiProperty()
  query: string;

  @ApiProperty()
  searchTime: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}