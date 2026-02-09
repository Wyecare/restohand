import {
  Controller,
  Get,
  Param,
  Res,
  Query,
  Req,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { TableStatusSSEService } from './table-status-sse.service';
import { RestaurantTablesService } from './restaurant-tables.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Controller('tables/sse')
export class TableHeatmapSSEController {
  private readonly logger = new Logger(TableHeatmapSSEController.name);

  constructor(
    private readonly tableStatusSSEService: TableStatusSSEService,
    private readonly tablesService: RestaurantTablesService,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>
  ) {}

  @Get('connect/:restaurantId')
  async connectToTableHeatmap(
    @Param('restaurantId') restaurantId: string,
    @Query('branchId') branchId: string,
    @Query('token') tokenParam: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    // Extract token from query parameter
    let token = tokenParam;
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Validate token and get user
    if (!token) {
      response.status(401).send('Missing authentication token');
      return;
    }

    let user: UserDocument;
    try {
      const decoded = this.jwtService.verify(token);
      user = await this.userModel.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
    } catch (error) {
      response.status(401).send('Invalid authentication token');
      return;
    }

    // Verify user has access to this restaurant
    if (user.restaurantId?.toString() !== restaurantId) {
      response.status(403).send('Access denied to restaurant');
      return;
    }

    // Handle branchId properly
    const effectiveBranchId = branchId && branchId !== 'undefined' && branchId !== 'all' ? branchId : undefined;

    this.logger.log(`SSE connection request from user ${user._id} for restaurant ${restaurantId}, branch: ${effectiveBranchId || 'all'}`);

    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    response.write(`data: ${JSON.stringify({
      type: 'connection',
      message: 'Connected to table heatmap updates',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Register this connection
    const connectionId = this.tableStatusSSEService.addConnection(
      restaurantId,
      effectiveBranchId,
      user.roles,
      response,
      user._id.toString()
    );

    this.logger.log(`Table heatmap SSE connection established: ${connectionId}`);

    // Send initial table data
    try {
      const initialTableData = await this.tablesService.listForService(restaurantId, effectiveBranchId);

      // Transform to heatmap format
      const heatmapTables = initialTableData.tables?.map((table) => ({
        tableId: table.id,
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        status: table.currentStatus?.status || 'available',
        statusColor: table.currentStatus?.statusColor || 'green',
        occupiedDuration: table.currentStatus?.occupiedDuration,
        currentBillAmount: table.totalBillAmount || 0,
        partySize: table.currentStatus?.currentPartySize,
        assignedServerName: table.currentStatus?.assignedServerName,
        capacity: table.capacity,
        zone: table.zone,
        layoutPosition: {
          x: table.layoutX || 0,
          y: table.layoutY || 0,
          width: table.layoutWidth,
          height: table.layoutHeight
        },
        lastUpdate: new Date().toISOString(),
      })) || [];

      // Send initial data
      response.write(`data: ${JSON.stringify({
        type: 'table-heatmap.initial',
        timestamp: new Date().toISOString(),
        restaurantId,
        branchId: effectiveBranchId,
        data: heatmapTables
      })}\n\n`);
    } catch (error) {
      this.logger.error('Error fetching initial table data:', error);
    }

    // Handle client disconnect
    response.on('close', () => {
      this.logger.log(`Table heatmap SSE connection closed: ${connectionId}`);
      this.tableStatusSSEService.removeConnection(connectionId);
    });

    response.on('error', (error) => {
      this.logger.error(`Table heatmap SSE connection error: ${connectionId}`, error);
      this.tableStatusSSEService.removeConnection(connectionId);
    });

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      try {
        response.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`);
      } catch (error) {
        this.logger.error(`Heartbeat failed for connection ${connectionId}:`, error);
        clearInterval(heartbeat);
        this.tableStatusSSEService.removeConnection(connectionId);
      }
    }, 30000); // 30 second heartbeat

    // Clean up heartbeat when connection closes
    response.on('close', () => {
      clearInterval(heartbeat);
    });
  }
}