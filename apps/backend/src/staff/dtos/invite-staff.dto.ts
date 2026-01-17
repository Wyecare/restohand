import { IsEmail, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class InviteStaffDto {
  @ApiProperty({ description: 'Email address of the staff member to invite' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the staff member',
    enum: ['chef', 'waiter', 'cashier']
  })
  @IsEnum(['chef', 'waiter', 'cashier'])
  role: 'chef' | 'waiter' | 'cashier';
}

export class CompleteSignupDto {
  @ApiProperty({ description: 'Invitation token from email' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Password for the new account' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Full name of the staff member' })
  @IsString()
  name: string;
}

export class VerifyInviteResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  role?: string;

  @ApiProperty()
  restaurantName?: string;

  @ApiProperty()
  message?: string;
}