import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StaffQrService } from './staff-qr.service';
import { ValidateStaffQrDto, AcceptStaffQrDto } from './dtos/staff-qr.dto';

@ApiTags('staff-signup')
@Controller('staff-signup')
export class StaffSignupController {
  constructor(private readonly staffQrService: StaffQrService) {}

  @Get('validate-qr')
  @ApiOperation({ summary: 'Validate staff QR code' })
  @ApiQuery({ name: 'qr', description: 'Base64 encoded QR data' })
  @ApiResponse({ status: 200, description: 'QR validation result' })
  async validateQr(@Query('qr') qrData: string) {
    const result = await this.staffQrService.validateStaffQr({ qrData });

    if (!result.valid) {
      return { valid: false, message: 'Invalid or expired QR code' };
    }

    return {
      valid: true,
      data: {
        role: result.data!.role,
        displayName: result.data!.displayName,
        restaurant: result.restaurant,
        expiresAt: new Date(result.data!.expiresAt).toISOString(),
      },
    };
  }

  @Post('accept-qr')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: 'Accept QR invitation and create staff account' })
  @ApiResponse({ status: 200, description: 'Staff account created successfully' })
  async acceptQr(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptStaffQrDto
  ) {
    return this.staffQrService.acceptStaffQr(user.uid, dto);
  }
}