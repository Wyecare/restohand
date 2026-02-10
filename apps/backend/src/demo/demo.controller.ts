import { Controller, Get, Query, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TableStatusService } from '../restaurant-tables/table-status.service';

@ApiTags('demo')
@Controller('demo')
export class DemoController {
  private readonly logger = new Logger(DemoController.name);
  private readonly DEMO_SECRET = 'demo1234';

  constructor(
    @InjectModel('RestaurantTable') private tableModel: Model<any>,
    private readonly tableStatusService: TableStatusService
  ) {}

  @Get('table-heatmap-simulation')
  @ApiOperation({
    summary: 'Simulate table status changes for demo purposes',
    description: 'Runs a table status simulation sequence to demonstrate the real-time heatmap functionality'
  })
  @ApiQuery({ name: 'secret', description: 'Demo secret code', example: 'demo1234' })
  @ApiQuery({ name: 'restaurantId', description: 'Restaurant ID for simulation' })
  @ApiQuery({ name: 'branchId', description: 'Branch ID for simulation' })
  @ApiResponse({ status: 200, description: 'Simulation completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid secret or parameters' })
  async simulateTableHeatmap(
    @Query('secret') secret: string,
    @Query('restaurantId') restaurantId: string,
    @Query('branchId') branchId: string,
  ): Promise<{ message: string; simulatedTables: number; duration: string }> {
    const simulationId = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('🎭 DEMO SIMULATION STARTED:', {
      simulationId,
      restaurantId,
      branchId,
      timestamp: new Date().toISOString()
    });

    // Validate secret
    if (secret !== this.DEMO_SECRET) {
      this.logger.warn('Invalid demo secret provided');
      throw new BadRequestException('Invalid demo secret');
    }

    // Validate required parameters
    if (!restaurantId || !branchId) {
      throw new BadRequestException('restaurantId and branchId are required');
    }

    const startTime = Date.now();

    try {
      // Get all tables for the restaurant/branch
      const tables = await this.tableModel.find({
        restaurantId,
        branchId,
        isActive: true
      }).lean();

      if (tables.length === 0) {
        throw new BadRequestException('No tables found for the specified restaurant/branch');
      }

      this.logger.log(`🎪 Found ${tables.length} tables for simulation`);

      // Store original statuses
      const originalStatuses: Record<string, string> = {};
      for (const table of tables) {
        const currentStatus = await this.tableStatusService.getTableStatus(restaurantId, table._id.toString());
        originalStatuses[table._id.toString()] = currentStatus?.status || 'available';
      }

      // Define simulation sequence with valid statuses only
      const statusSequence = [
        { status: 'occupied', duration: 3000, description: '🔴 Setting tables to occupied' },
        { status: 'cleaning', duration: 3000, description: '🔵 Tables being cleaned' },
        { status: 'reserved', duration: 3000, description: '🟦 Tables reserved for next guests' },
        { status: 'available', duration: 2000, description: '⚪ Tables back to available' }
      ];

      // Run simulation sequence
      for (const step of statusSequence) {
        this.logger.log(`${step.description} (${step.duration}ms)`);

        // Update all tables to current status with realistic data
        const updatePromises = tables.map((table, index) => {
          const options: any = {
            createdByName: 'Demo Simulation',
            notes: `Demo simulation - ${step.description}`
          };

          // Add party size and server for occupied status
          if (step.status === 'occupied') {
            options.currentPartySize = Math.floor(Math.random() * 4) + 1; // 1-4 people
            options.assignedServerName = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma'][index % 5];
          }

          // Add customer name for reserved status
          if (step.status === 'reserved') {
            const customers = ['Mr. Smith', 'Ms. Johnson', 'Dr. Brown', 'Mrs. Wilson', 'Mr. Davis'];
            options.reservationCustomerName = customers[index % customers.length];
            options.currentPartySize = Math.floor(Math.random() * 6) + 2; // 2-7 people for reservations
          }

          this.logger.log(`🎪 Updating table ${table.tableNumber} to status: ${step.status}`, {
            tableId: table._id.toString(),
            status: step.status,
            options
          });

          return this.tableStatusService.updateTableStatus(
            restaurantId,
            table._id.toString(),
            { status: step.status as any, ...options },
            {
              uid: 'demo-system',
              displayName: 'Demo Simulation',
              email: 'demo@system.com'
            }
          );
        });

        await Promise.allSettled(updatePromises);

        // Wait for specified duration
        await this.delay(step.duration);
      }

      // Restore original statuses
      this.logger.log('🔄 Restoring original table statuses...');
      const restorePromises = tables.map(table =>
        this.tableStatusService.updateTableStatus(
          restaurantId,
          table._id.toString(),
          {
            status: originalStatuses[table._id.toString()] as any,
            notes: 'Demo simulation - restored to original status'
          },
          {
            uid: 'demo-system',
            displayName: 'Demo Simulation',
            email: 'demo@system.com'
          }
        )
      );

      await Promise.allSettled(restorePromises);

      const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

      this.logger.log('✅ DEMO SIMULATION COMPLETED:', {
        simulationId,
        duration,
        tablesSimulated: tables.length,
        timestamp: new Date().toISOString()
      });

      return {
        message: 'Table heatmap simulation completed successfully! 🎉',
        simulatedTables: tables.length,
        duration
      };

    } catch (error) {
      this.logger.error('❌ DEMO SIMULATION FAILED:', {
        simulationId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  @Get('quick-table-updates')
  @ApiOperation({
    summary: 'Quick random table status updates for demo',
    description: 'Randomly updates a few tables with different statuses for quick demo'
  })
  @ApiQuery({ name: 'secret', description: 'Demo secret code', example: 'demo1234' })
  @ApiQuery({ name: 'restaurantId', description: 'Restaurant ID for simulation' })
  @ApiQuery({ name: 'branchId', description: 'Branch ID for simulation' })
  @ApiQuery({ name: 'count', description: 'Number of tables to update', example: '5', required: false })
  async quickTableUpdates(
    @Query('secret') secret: string,
    @Query('restaurantId') restaurantId: string,
    @Query('branchId') branchId: string,
    @Query('count') count?: string,
  ): Promise<{ message: string; updatedTables: string[] }> {
    // Validate secret
    if (secret !== this.DEMO_SECRET) {
      throw new BadRequestException('Invalid demo secret');
    }

    if (!restaurantId || !branchId) {
      throw new BadRequestException('restaurantId and branchId are required');
    }

    const updateCount = Math.min(parseInt(count || '5'), 10); // Max 10 tables

    // Get tables
    const tables = await this.tableModel.find({
      restaurantId,
      branchId,
      isActive: true
    }).limit(updateCount).lean();

    const statuses = ['available', 'occupied', 'reserved', 'cleaning'];
    const updatedTables: string[] = [];

    // Randomly update tables with realistic data
    for (const table of tables) {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      const options: any = {
        createdByName: 'Demo Quick Update',
        notes: `Quick demo update - ${randomStatus}`
      };

      // Add realistic data based on status
      if (randomStatus === 'occupied') {
        options.currentPartySize = Math.floor(Math.random() * 4) + 1;
        options.assignedServerName = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma'][Math.floor(Math.random() * 5)];
      } else if (randomStatus === 'reserved') {
        const customers = ['Mr. Smith', 'Ms. Johnson', 'Dr. Brown', 'Mrs. Wilson', 'Mr. Davis'];
        options.reservationCustomerName = customers[Math.floor(Math.random() * customers.length)];
        options.currentPartySize = Math.floor(Math.random() * 6) + 2;
      }

      await this.tableStatusService.updateTableStatus(
        restaurantId,
        table._id.toString(),
        { status: randomStatus as any, ...options },
        {
          uid: 'demo-system',
          displayName: 'Demo Quick Update',
          email: 'demo@system.com'
        }
      );

      updatedTables.push(`${table.tableNumber || table._id} -> ${randomStatus}`);
    }

    return {
      message: 'Quick table updates completed! 🚀',
      updatedTables
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}