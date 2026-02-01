import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSuperAdminDto {
  @ApiProperty({ example: 'admin@restohand.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin User' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'strongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;
}