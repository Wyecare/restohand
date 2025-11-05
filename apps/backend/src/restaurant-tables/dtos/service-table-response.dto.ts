import { ApiProperty } from '@nestjs/swagger';
import { RestaurantTableResponseDto } from './restaurant-table-response.dto';

export class ServiceTablesStatsDto {
  @ApiProperty()
  totalTables!: number;

  @ApiProperty()
  occupiedTables!: number;

  @ApiProperty()
  activeOrders!: number;

  @ApiProperty()
  readyOrders!: number;

  @ApiProperty()
  unpaidOrders!: number;

  @ApiProperty()
  todaysRevenue!: number;
}

export class ServiceTablesResponseDto {
  @ApiProperty({ type: [RestaurantTableResponseDto] })
  tables!: RestaurantTableResponseDto[];

  @ApiProperty({ type: ServiceTablesStatsDto })
  stats!: ServiceTablesStatsDto;
}
