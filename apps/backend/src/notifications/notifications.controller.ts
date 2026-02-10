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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
  BulkUpdateNotificationsDto,
  NotificationStatsDto,
} from './dtos/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles('super_admin', 'owner', 'manager')
  @ApiOperation({ summary: 'Create a notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully', type: NotificationResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() createDto: CreateNotificationDto
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.create(restaurantId, createDto);
  }

  @Post('bulk')
  @Roles('super_admin', 'owner', 'manager')
  @ApiOperation({ summary: 'Create bulk notifications for multiple recipients' })
  @ApiResponse({ status: 201, description: 'Bulk notifications created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createBulk(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { recipientIds: string[] } & Omit<CreateNotificationDto, 'recipientId'>
  ): Promise<NotificationResponseDto[]> {
    const { recipientIds, ...notificationData } = body;
    return this.notificationsService.createBulk(restaurantId, recipientIds, notificationData);
  }

  @Get()
  @Roles('super_admin', 'owner', 'manager', 'chef', 'waiter', 'cashier')
  @ApiOperation({ summary: 'Get notifications with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async findAll(
    @Param('restaurantId') restaurantId: string,
    @Query() query: NotificationQueryDto,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<{ notifications: NotificationResponseDto[]; total: number; page: number; limit: number }> {
    return this.notificationsService.findAll(restaurantId, query, req.user);
  }

  @Get('stats')
  @Roles('super_admin', 'owner', 'manager', 'chef', 'waiter', 'cashier')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Notification stats retrieved successfully', type: NotificationStatsDto })
  async getStats(
    @Param('restaurantId') restaurantId: string,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<NotificationStatsDto> {
    return this.notificationsService.getStats(restaurantId, req.user);
  }

  @Get('my-notifications')
  @Roles('super_admin', 'owner', 'manager', 'chef', 'waiter', 'cashier')
  @ApiOperation({ summary: 'Get current user\'s notifications' })
  @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
  async getMyNotifications(
    @Param('restaurantId') restaurantId: string,
    @Query() query: NotificationQueryDto,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<{ notifications: NotificationResponseDto[]; total: number; page: number; limit: number }> {
    // Force recipientId to current user
    const userQuery = { ...query, recipientId: req.user.uid };
    return this.notificationsService.findAll(restaurantId, userQuery, req.user);
  }

  @Get(':id')
  @Roles('super_admin', 'owner', 'manager', 'chef', 'waiter', 'cashier')
  @ApiOperation({ summary: 'Get a specific notification' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully', type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.findOne(restaurantId, id, req.user);
  }

  @Put(':id')
  @Roles('super_admin', 'owner', 'manager', 'chef', 'waiter', 'cashier')
  @ApiOperation({ summary: 'Update a notification' })
  @ApiResponse({ status: 200, description: 'Notification updated successfully', type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateNotificationDto,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.update(restaurantId, id, updateDto, req.user);
  }

  @Put(':id/read')
  @Roles('super_admin', 'owner', 'manager', 'chef', 'waiter', 'cashier')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read', type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(restaurantId, id, req.user);
  }

  @Put('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'owner', 'manager', 'chef', 'waiter', 'cashier')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @Param('restaurantId') restaurantId: string,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<{ updated: number }> {
    return this.notificationsService.markAllAsRead(restaurantId, req.user);
  }

  @Put('bulk-update')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'owner', 'manager', 'chef', 'waiter', 'cashier')
  @ApiOperation({ summary: 'Perform bulk update on multiple notifications' })
  @ApiResponse({ status: 200, description: 'Bulk update completed successfully' })
  async bulkUpdate(
    @Param('restaurantId') restaurantId: string,
    @Body() bulkUpdateDto: BulkUpdateNotificationsDto,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<{ updated: number }> {
    return this.notificationsService.bulkUpdate(restaurantId, bulkUpdateDto, req.user);
  }

  @Post('cleanup')
  @Roles('super_admin', 'owner', 'manager')
  @ApiOperation({ summary: 'Delete old read/archived notifications (admin only)' })
  @ApiResponse({ status: 200, description: 'Old notifications cleaned up successfully' })
  async cleanupOld(
    @Param('restaurantId') restaurantId: string,
    @Body() body?: { daysOld?: number }
  ): Promise<{ deleted: number }> {
    return this.notificationsService.deleteOld(restaurantId, body?.daysOld);
  }
}