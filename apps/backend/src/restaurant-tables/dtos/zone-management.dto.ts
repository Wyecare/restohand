import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsArray } from 'class-validator';

export class CreateZoneDto {
  @ApiProperty({
    example: 'Main Hall',
    description: 'Name of the zone'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}

export class UpdateZoneDto {
  @ApiProperty({
    example: 'VIP Section',
    description: 'New name of the zone'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}

export class ZoneResponseDto {
  @ApiProperty({
    example: 'main-hall',
    description: 'Zone identifier'
  })
  id: string;

  @ApiProperty({
    example: 'Main Hall',
    description: 'Zone name'
  })
  name: string;

  @ApiProperty({
    example: 12,
    description: 'Number of tables in this zone'
  })
  tableCount: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Zone creation date'
  })
  createdAt: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Zone last update date'
  })
  updatedAt: string;
}

export class ZonesListResponseDto {
  @ApiProperty({
    type: [ZoneResponseDto],
    description: 'List of zones'
  })
  zones: ZoneResponseDto[];
}

export class BulkUpdateZonesDto {
  @ApiProperty({
    type: [String],
    example: ['Main Hall', 'Terrace', 'VIP Section'],
    description: 'List of zone names'
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  zones: string[];
}