import { PaginationMetaDto } from '../dtos/pagination.dto';

export interface PaginationOptions {
  page?: string;
  limit?: string;
  maxLimit?: number;
}

export interface PaginationParams {
  skip: number;
  limit: number;
  page: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMetaDto;
}

export class PaginationUtil {
  /**
   * Parse pagination options and return skip, limit, and page values
   */
  static parsePaginationOptions(
    options: PaginationOptions = {},
    maxLimit: number = 100,
  ): PaginationParams {
    const page = Math.max(1, Number(options.page ?? '1'));
    const limit = Math.min(
      Math.max(1, Number(options.limit ?? '20')),
      maxLimit,
    );
    const skip = (page - 1) * limit;

    return { skip, limit, page };
  }

  /**
   * Create pagination metadata
   */
  static createMeta(
    total: number,
    page: number,
    limit: number,
  ): PaginationMetaDto {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * Create a paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    return {
      data,
      meta: this.createMeta(total, page, limit),
    };
  }
}