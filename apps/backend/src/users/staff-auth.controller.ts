import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { StaffLoginDto } from './dtos/staff-login.dto';
import { StaffResponseDto } from './dtos/staff-response.dto';
import { ApiProperty } from '@nestjs/swagger';

class StaffLoginResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty({ type: () => StaffResponseDto })
  staff!: StaffResponseDto;
}

@ApiTags('auth')
@Controller('auth/staff')
export class StaffAuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  @ApiOkResponse({ type: StaffLoginResponseDto })
  async login(@Body() body: StaffLoginDto) {
    return this.usersService.generateStaffCustomToken(body.identifier, body.pin);
  }
}
