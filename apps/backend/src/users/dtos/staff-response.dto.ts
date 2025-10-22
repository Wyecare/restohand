import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class StaffResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

  @ApiProperty({ enum: UserRole, isArray: true })
  roles!: UserRole[];

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty({ required: false })
  lastLoginAt?: string;

  @ApiProperty()
  createdAt!: string;
}

export class StaffInviteResponseDto {
  @ApiProperty({ type: StaffResponseDto })
  staff!: StaffResponseDto;

  @ApiProperty({ description: 'Temporary PIN provided to the staff member' })
  temporaryPin!: string;
}
