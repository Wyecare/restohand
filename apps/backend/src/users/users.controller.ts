import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiOkResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { StaffResponseDto, StaffInviteResponseDto } from './dtos/staff-response.dto';
import { InviteStaffRequestDto } from './dtos/invite-staff.request';
import { UpdateStaffDto } from './dtos/update-staff.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('users')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: [StaffResponseDto] })
  @ApiOperation({ summary: 'List staff members for the manager’s restaurant' })
  list(@Req() req: Request) {
    const actor = req.user as AuthenticatedUser;
    return this.usersService.listForRestaurant(actor.restaurantId!);
  }

  @Post()
  @ApiOperation({ summary: 'Invite a staff member via OTP/PIN' })
  @ApiOkResponse({ type: StaffInviteResponseDto })
  invite(@Req() req: Request, @Body() body: InviteStaffRequestDto) {
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
