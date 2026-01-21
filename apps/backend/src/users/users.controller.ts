import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
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
import { CreateStaffInvitationDto, StaffInvitationResponseDto } from './dtos/staff-invitation.dto';
import { GenerateStaffQrDto, StaffQrResponseDto } from './dtos/staff-qr.dto';

@ApiTags('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly staffQrService: StaffQrService
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

  // Legacy SMS invitation (keep for backward compatibility)
  @Post('sms-invite')
  @ApiOperation({ summary: '[LEGACY] Invite a staff member via SMS invitation' })
  @ApiOkResponse({ type: StaffInvitationResponseDto })
  smsInvite(@Req() req: Request, @Body() body: CreateStaffInvitationDto) {
    // Legacy endpoint - replaced by email invitations in /staff/invitations
    throw new Error('SMS invitations are deprecated. Use email invitations instead.');
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List pending staff invitations' })
  @ApiOkResponse({ type: [StaffInvitationResponseDto] })
  listInvitations(@Req() req: Request) {
    // Legacy endpoint - replaced by email invitations in /staff/invitations
    return [];
  }

  @Post('invitations/:id/revoke')
  @ApiOperation({ summary: 'Revoke a pending staff invitation' })
  revokeInvitation(@Req() req: Request, @Param('id') invitationId: string) {
    // Legacy endpoint - replaced by email invitations in /staff/invitations
    return { message: 'This feature has been moved to email invitations' };
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
}
