import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiOkResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { QueryStaffDto } from './dtos/query-staff.dto';
import { StaffListResponseDto } from './dtos/staff-list-response.dto';
import { StaffResponseDto, StaffInviteResponseDto } from './dtos/staff-response.dto';
import { InviteStaffRequestDto } from './dtos/invite-staff.request';
import { UpdateStaffDto } from './dtos/update-staff.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StaffQrService } from './staff-qr.service';
import { StaffInvitationService } from './staff-invitation.service';
import { BranchPermissionsService } from './branch-permissions.service';
import { CreateStaffInvitationDto, StaffInvitationResponseDto, AcceptStaffInvitationDto } from './dtos/staff-invitation.dto';
import { GenerateStaffQrDto, StaffQrResponseDto } from './dtos/staff-qr.dto';

@ApiTags('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly staffQrService: StaffQrService,
    private readonly staffInvitationService: StaffInvitationService,
    private readonly branchPermissionsService: BranchPermissionsService
  ) {}

  @Get()
  @ApiOkResponse({ type: StaffListResponseDto })
  @ApiOperation({ summary: 'List staff members for the managers restaurant and branch' })
  list(@Req() req: Request, @Query() query: QueryStaffDto) {
    const actor = req.user as AuthenticatedUser;
    return this.usersService.listForRestaurant(actor.restaurantId!, query, actor.branchId);
  }

  // QR Code generation (NEW PRIMARY METHOD)
  @Post('generate-qr')
  @ApiOperation({ summary: 'Generate QR code for staff signup' })
  @ApiOkResponse({ type: StaffQrResponseDto })
  generateQr(@Req() req: Request, @Body() body: GenerateStaffQrDto) {
    return this.staffQrService.generateStaffQr(req.user as AuthenticatedUser, body);
  }

  // Staff invitation endpoints
  @Post('invitations')
  @ApiOperation({ summary: 'Create a new staff invitation' })
  @ApiOkResponse({ type: StaffInvitationResponseDto })
  createInvitation(@Req() req: Request, @Body() body: CreateStaffInvitationDto) {
    const actor = req.user as AuthenticatedUser;
    return this.staffInvitationService.createInvitation(actor, body);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List pending staff invitations' })
  @ApiOkResponse({ type: [StaffInvitationResponseDto] })
  listInvitations(@Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.staffInvitationService.listInvitations(actor);
  }

  @Delete('invitations/:id')
  @ApiOperation({ summary: 'Revoke a pending staff invitation' })
  revokeInvitation(@Req() req: Request, @Param('id') invitationId: string) {
    const actor = req.user as AuthenticatedUser;
    return this.staffInvitationService.revokeInvitation(actor, invitationId);
  }


  // Legacy PIN-based invitation (keep for backward compatibility)
  @Post('legacy-invite')
  @ApiOperation({ summary: '[LEGACY] Invite a staff member via OTP/PIN' })
  @ApiOkResponse({ type: StaffInviteResponseDto })
  legacyInvite(@Req() req: Request, @Body() body: InviteStaffRequestDto) {
    return this.usersService.inviteStaff(req.user as AuthenticatedUser, body);
  }

  @Patch(':id')
  @ApiOkResponse({ type: StaffResponseDto })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateStaffDto
  ) {
    return this.usersService.updateStaff(req.user as AuthenticatedUser, id, body);
  }

  @Post(':id/reset-pin')
  @ApiOkResponse({ type: StaffInviteResponseDto })
  resetPin(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.resetStaffPin(req.user as AuthenticatedUser, id);
  }

  // Branch management endpoints
  @Post(':userId/add-branch-scope/:branchId')
  @ApiOperation({ summary: 'Add branch scope to a manager' })
  @Roles(UserRole.Manager, UserRole.Owner)
  async addBranchScope(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Param('branchId') branchId: string
  ) {
    const actor = req.user as AuthenticatedUser;
    await this.branchPermissionsService.addBranchScope(actor, userId, branchId);
    return { message: 'Branch scope added successfully' };
  }

  @Delete(':userId/remove-branch-scope/:branchId')
  @ApiOperation({ summary: 'Remove branch scope from a manager' })
  @Roles(UserRole.Manager, UserRole.Owner)
  async removeBranchScope(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Param('branchId') branchId: string
  ) {
    const actor = req.user as AuthenticatedUser;
    await this.branchPermissionsService.removeBranchScope(actor, userId, branchId);
    return { message: 'Branch scope removed successfully' };
  }

  @Post(':userId/transfer-to-branch/:branchId')
  @ApiOperation({ summary: 'Transfer user to a different branch' })
  @Roles(UserRole.Manager, UserRole.Owner)
  async transferUserToBranch(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Param('branchId') branchId: string
  ) {
    const actor = req.user as AuthenticatedUser;
    await this.branchPermissionsService.transferUserToBranch(actor, userId, branchId);
    return { message: 'User transferred successfully' };
  }

  @Get('manageable-branches')
  @ApiOperation({ summary: 'Get branches that the current user can manage' })
  @Roles(UserRole.Manager, UserRole.Owner)
  getManageableBranches(@Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.branchPermissionsService.getManageableBranches(actor);
  }

  // Branch-aware staff endpoints
  @Get('branch/:branchId')
  @ApiOkResponse({ type: StaffListResponseDto })
  @ApiOperation({ summary: 'List staff members for a specific branch' })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async listByBranch(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Query() query: QueryStaffDto
  ) {
    const actor = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissionsService.getBranchPermissions(actor);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch staff');
    }

    return this.usersService.listForRestaurant(actor.restaurantId!, query, branchId);
  }

  @Get('branch/:branchId/waiters')
  @ApiOperation({ summary: 'List waiters for a specific branch' })
  @ApiOkResponse({ type: [StaffResponseDto] })
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  async listWaitersByBranch(
    @Req() req: Request,
    @Param('branchId') branchId: string
  ) {
    const actor = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissionsService.getBranchPermissions(actor);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch waiters');
    }

    const query: QueryStaffDto = { role: 'waiter' };
    return this.usersService.listForRestaurant(actor.restaurantId!, query, branchId);
  }
}

// Public controller for staff invitation acceptance (no authentication required)
@ApiTags('staff-invitations')
@Controller('public/staff-invitations')
export class PublicStaffInvitationController {
  constructor(private readonly staffInvitationService: StaffInvitationService) {}

  @Get('verify/:token')
  @ApiOperation({ summary: 'Verify invitation token' })
  @ApiOkResponse({
    description: 'Token verification result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        email: { type: 'string' },
        role: { type: 'string' },
        restaurantName: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  async verifyInvitation(@Param('token') token: string) {
    return this.staffInvitationService.getInvitationWithRestaurant(token);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept a staff invitation and create account' })
  @ApiOkResponse({
    description: 'Staff invitation accepted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            restaurantId: { type: 'string' }
          }
        }
      }
    }
  })
  async acceptInvitation(@Body() body: AcceptStaffInvitationDto) {
    return this.staffInvitationService.acceptInvitation(body);
  }
}
