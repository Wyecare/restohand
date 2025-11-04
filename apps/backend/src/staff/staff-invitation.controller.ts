import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { StaffInvitationService } from './staff-invitation.service';
import {
  InviteStaffDto,
  CompleteSignupDto,
  VerifyInviteResponseDto,
} from './dtos/invite-staff.dto';

@ApiTags('staff-invitations')
@Controller('restaurants/:restaurantId/staff/invitations')
export class StaffInvitationController {
  constructor(private readonly staffInvitationService: StaffInvitationService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Owner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send staff invitation email' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists or invitation pending' })
  async inviteStaff(
    @Param('restaurantId') restaurantId: string,
    @GetUser('uid') userId: string,
    @Body() dto: InviteStaffDto,
  ) {
    return this.staffInvitationService.inviteStaff(restaurantId, userId, dto);
  }
}

@ApiTags('staff-invitations')
@Controller('staff/invitations')
export class PublicStaffInvitationController {
  constructor(private readonly staffInvitationService: StaffInvitationService) {}

  @Get('verify/:token')
  @ApiOperation({ summary: 'Verify invitation token' })
  @ApiResponse({ status: 200, description: 'Token verification result', type: VerifyInviteResponseDto })
  async verifyInvite(@Param('token') token: string): Promise<VerifyInviteResponseDto> {
    return this.staffInvitationService.verifyInvite(token);
  }

  @Post('complete-signup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete staff signup after Firebase authentication' })
  @ApiResponse({ status: 200, description: 'Signup completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token or signup failed' })
  async completeSignup(@Body() dto: CompleteSignupDto) {
    return this.staffInvitationService.completeSignup(dto);
  }
}