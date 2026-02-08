import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryMenuPriceTagsDto {
  @ApiProperty({ required: false, example: 'Weekend' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ required: false, example: '66f0e5ec2ed1f1a1c4f9c7e3' })
  @IsOptional()
  @IsMongoId()
  menuItemId?: string;

  @ApiProperty({ required: false, example: 1, description: 'Page number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiProperty({ required: false, example: 10, description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}