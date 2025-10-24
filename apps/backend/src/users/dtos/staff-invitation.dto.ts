import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateStaffInvitationDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber('IN')
  phoneNumber!: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    enum: [UserRole.Chef, UserRole.Waiter, UserRole.Cashier],
    example: UserRole.Chef
  })
  @IsEnum([UserRole.Chef, UserRole.Waiter, UserRole.Cashier])
  role!: UserRole;
}

export class AcceptStaffInvitationDto {
  @ApiProperty({ example: 'abc123xyz789' })
  @IsString()
  @MinLength(10)
  invitationToken!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber('IN')
  phoneNumber!: string;
}

export class StaffInvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phoneNumber!: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  invitationToken!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty()
  isUsed!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ required: false })
  usedAt?: string;
}