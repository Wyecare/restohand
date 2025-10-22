import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class InviteStaffDto {
  @ApiProperty({ example: 'Anita Chef' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'chef@restohand.in', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({ enum: [UserRole.Chef, UserRole.Waiter, UserRole.Cashier] })
  @IsEnum(UserRole)
  role!: UserRole;
}
