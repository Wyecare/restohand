import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class GenerateStaffQrDto {
  @ApiProperty({ enum: UserRole, description: 'Role for the staff member' })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ description: 'Optional display name for the QR code', required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'QR code validity in hours (default: 24)', required: false, minimum: 1, maximum: 168 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168) // Max 1 week
  validityHours?: number;
}

export class StaffQrDataDto {
  @ApiProperty()
  restaurantId!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  displayName?: string;

  @ApiProperty()
  expiresAt!: number; // Unix timestamp

  @ApiProperty()
  signature!: string; // HMAC signature for validation
}

export class StaffQrResponseDto {
  @ApiProperty()
  qrData!: string; // Base64 encoded QR data

  @ApiProperty()
  qrCodeUrl!: string; // Data URL for QR code image

  @ApiProperty()
  signupUrl!: string; // Full signup URL

  @ApiProperty()
  role!: UserRole;

  @ApiProperty()
  displayName?: string;

  @ApiProperty()
  expiresAt!: string; // ISO string

  @ApiProperty()
  validityHours!: number;
}

export class ValidateStaffQrDto {
  @ApiProperty({ description: 'Base64 encoded QR data' })
  @IsString()
  qrData!: string;
}

export class AcceptStaffQrDto {
  @ApiProperty({ description: 'Base64 encoded QR data' })
  @IsString()
  qrData!: string;

  @ApiProperty({ description: 'Staff phone number from Firebase auth' })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ description: 'Staff display name', required: false })
  @IsOptional()
  @IsString()
  displayName?: string;
}