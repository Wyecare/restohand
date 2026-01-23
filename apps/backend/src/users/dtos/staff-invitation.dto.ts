import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength, IsMongoId } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateStaffInvitationDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsPhoneNumber('IN')
  phoneNumber?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Branch ID where the staff member will be assigned'
  })
  @IsMongoId()
  branchId!: string;

  @ApiProperty({
    enum: [UserRole.Chef, UserRole.Waiter, UserRole.Cashier, UserRole.Manager],
    example: UserRole.Chef
  })
  @IsEnum([UserRole.Chef, UserRole.Waiter, UserRole.Cashier, UserRole.Manager])
  role!: UserRole;
}

export class AcceptStaffInvitationDto {
  @ApiProperty({ example: 'abc123xyz789' })
  @IsString()
  @MinLength(10)
  invitationToken!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class StaffInvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

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