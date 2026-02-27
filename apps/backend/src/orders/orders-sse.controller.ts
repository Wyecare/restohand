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
import { OrdersSSEService } from './orders-sse.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Controller('orders/sse')
export class OrdersSSEController {
  private readonly logger = new Logger(OrdersSSEController.name);

  constructor(
    private readonly ordersSSEService: OrdersSSEService,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>
  ) {}

  @Get('connect/:restaurantId')
  async connectToOrderUpdates(
    @Param('restaurantId') restaurantId: string,
    @Query('roles') rolesParam: string,
    @Query('token') tokenParam: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    // Extract token from Authorization header or query parameter (for backward compatibility)
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

    const userRoles = rolesParam ? rolesParam.split(',') : [];

    // Verify user has access to this restaurant
    if (user.restaurantId?.toString() !== restaurantId) {
      response.status(403).send('Access denied to restaurant');
      return;
    }

    this.logger.log(`SSE connection request from user ${user._id} for restaurant ${restaurantId} with roles: ${userRoles.join(',')}`);

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
      message: 'Connected to order updates',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Register this connection (include branchId for branch-scoped filtering)
    const connectionId = this.ordersSSEService.addConnection(
      restaurantId,
      userRoles,
      response,
      user._id.toString(),
      user.branchId ?? undefined
    );

    this.logger.log(`SSE connection established: ${connectionId}`);

    // Handle client disconnect
    response.on('close', () => {
      this.logger.log(`SSE connection closed: ${connectionId}`);
      this.ordersSSEService.removeConnection(connectionId);
    });

    response.on('error', (error) => {
      this.logger.error(`SSE connection error: ${connectionId}`, error);
      this.ordersSSEService.removeConnection(connectionId);
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
        this.ordersSSEService.removeConnection(connectionId);
      }
    }, 30000); // 30 second heartbeat

    // Clean up heartbeat when connection closes
    response.on('close', () => {
      clearInterval(heartbeat);
    });
  }
}