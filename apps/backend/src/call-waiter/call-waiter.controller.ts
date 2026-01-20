import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CallWaiterService } from './call-waiter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CallWaiterStatus } from './schemas/call-waiter.schema';
import {
  CreateCallWaiterDto,
  UpdateFcmTokenDto,
  AcknowledgeCallDto,
  ResolveCallDto,
  CallWaiterResponseDto
} from './dtos/call-waiter.dto';

@ApiTags('Call Waiter')
@Controller('call-waiter')
export class CallWaiterController {
  constructor(private readonly callWaiterService: CallWaiterService) {}

  @Post(':restaurantId')
  @ApiOperation({
    summary: 'Create call waiter alert',
    description: 'Customer creates an alert to call assigned waiter for assistance'
  })
  @ApiResponse({
    status: 201,
    description: 'Alert created successfully',
    type: CallWaiterResponseDto
  })
  async createCall(
    @Param('restaurantId') restaurantId: string,
    @Body() createCallDto: CreateCallWaiterDto,
  ) {
    return this.callWaiterService.createCallWaiter(restaurantId, createCallDto);
  }

  @Put('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update FCM token',
    description: 'Staff member updates their FCM token for push notifications'
  })
  @ApiResponse({ status: 200, description: 'FCM token updated successfully' })
  async updateFcmToken(
    @Request() req: any,
    @Body() updateFcmDto: UpdateFcmTokenDto,
  ) {
    const userId = req.user?.uid || req.user?.claims?.sub || req.user?.sub;
    await this.callWaiterService.updateFcmToken(userId, updateFcmDto.fcmToken);
    return { message: 'FCM token updated successfully' };
  }

  @Put(':callId/acknowledge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Acknowledge call waiter alert',
    description: 'Staff member acknowledges they received the alert'
  })
  @ApiResponse({
    status: 200,
    description: 'Alert acknowledged successfully',
    type: CallWaiterResponseDto
  })
  async acknowledgeCall(
    @Param('callId') callId: string,
    @Request() req: any,
    @Body() acknowledgeDto?: AcknowledgeCallDto,
  ) {
    return this.callWaiterService.acknowledgeCall(
      callId,
      req.user.uid || req.user.claims?.sub || req.user.sub,
      req.user.restaurantId,
      acknowledgeDto
    );
  }

  @Put(':callId/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resolve call waiter alert',
    description: 'Staff member marks the alert as resolved'
  })
  @ApiResponse({
    status: 200,
    description: 'Alert resolved successfully',
    type: CallWaiterResponseDto
  })
  async resolveCall(
    @Param('callId') callId: string,
    @Request() req: any,
    @Body() resolveDto: ResolveCallDto,
  ) {
    return this.callWaiterService.resolveCall(
      callId,
      req.user.uid || req.user.claims?.sub || req.user.sub,
      req.user.restaurantId,
      resolveDto
    );
  }

  @Get('restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Waiter, UserRole.Cashier, UserRole.Chef)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get restaurant call alerts',
    description: 'Get all call waiter alerts for the restaurant'
  })
  @ApiQuery({ name: 'status', required: false, enum: CallWaiterStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Restaurant alerts retrieved successfully',
    type: [CallWaiterResponseDto]
  })
  async getRestaurantCalls(
    @Param('restaurantId') restaurantId: string,
    @Query('status') status?: CallWaiterStatus,
    @Query('limit') limit?: number,
  ) {
    return this.callWaiterService.getRestaurantCalls(
      restaurantId,
      status,
      limit ? parseInt(limit.toString()) : undefined
    );
  }

  @Get('waiter/my-calls')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Waiter, UserRole.Manager)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get waiter assigned calls',
    description: 'Get call waiter alerts assigned to the current waiter'
  })
  @ApiQuery({ name: 'status', required: false, enum: CallWaiterStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Waiter calls retrieved successfully',
    type: [CallWaiterResponseDto]
  })
  async getWaiterCalls(
    @Request() req: any,
    @Query('status') status?: CallWaiterStatus,
    @Query('limit') limit?: number,
  ) {
    return this.callWaiterService.getWaiterCalls(
      req.user.restaurantId,
      req.user.uid || req.user.claims?.sub || req.user.sub,
      status,
      limit ? parseInt(limit.toString()) : undefined
    );
  }
}