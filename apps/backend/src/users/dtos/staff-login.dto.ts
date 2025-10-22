import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone or email registered for the staff member' })
  @IsString()
  identifier!: string;

  @ApiProperty({ example: '4821' })
  @IsString()
  @Length(4, 6)
  pin!: string;
}
