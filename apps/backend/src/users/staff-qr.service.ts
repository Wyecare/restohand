import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHmac, randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../common/enums/user-role.enum';
import { User, UserDocument } from './schemas/user.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import {
  GenerateStaffQrDto,
  StaffQrResponseDto,
  ValidateStaffQrDto,
  AcceptStaffQrDto,
  StaffQrDataDto,
} from './dtos/staff-qr.dto';

@Injectable()
export class StaffQrService {
  private readonly qrSecret: string;
  private readonly frontendUrl: string;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    this.qrSecret =
      this.configService.get<string>('QR_SECRET') ||
      randomBytes(32).toString('hex');
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
  }

  async generateStaffQr(
    actor: AuthenticatedUser,
    dto: GenerateStaffQrDto
  ): Promise<StaffQrResponseDto> {
    if (!actor.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    if (dto.role === UserRole.Manager) {
      throw new ForbiddenException('Cannot generate QR code for manager role');
    }

    // Get restaurant info
    const restaurant = await this.restaurantModel.findById(actor.restaurantId);
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const validityHours = dto.validityHours || 24;
    const expiresAt = Date.now() + validityHours * 60 * 60 * 1000;

    // Create QR data payload
    const qrPayload: StaffQrDataDto = {
      restaurantId: actor.restaurantId,
      role: dto.role,
      displayName: dto.displayName || `${dto.role} at ${restaurant.name}`,
      expiresAt,
      signature: this.signQrData({
        restaurantId: actor.restaurantId,
        role: dto.role,
        expiresAt,
      }),
    };

    // Encode as base64
    const qrData = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

    // Generate signup URL
    const signupUrl = `${this.frontendUrl}/staff-signup?qr=${encodeURIComponent(
      qrData
    )}`;

    // Generate QR code image
    const qrCodeUrl = await QRCode.toDataURL(signupUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return {
      qrData,
      qrCodeUrl,
      signupUrl,
      role: dto.role,
      displayName: qrPayload.displayName,
      expiresAt: new Date(expiresAt).toISOString(),
      validityHours,
    };
  }

  async validateStaffQr(dto: ValidateStaffQrDto): Promise<{
    valid: boolean;
    data?: StaffQrDataDto;
    restaurant?: { id: string; name: string };
  }> {
    try {
      // Decode QR data
      const qrPayload: StaffQrDataDto = JSON.parse(
        Buffer.from(dto.qrData, 'base64').toString('utf8')
      );

      // Check expiration
      if (Date.now() > qrPayload.expiresAt) {
        return { valid: false };
      }

      // Verify signature
      const expectedSignature = this.signQrData({
        restaurantId: qrPayload.restaurantId,
        role: qrPayload.role,
        expiresAt: qrPayload.expiresAt,
      });

      if (qrPayload.signature !== expectedSignature) {
        return { valid: false };
      }

      // Get restaurant info
      const restaurant = await this.restaurantModel.findById(
        qrPayload.restaurantId
      );
      if (!restaurant) {
        return { valid: false };
      }

      return {
        valid: true,
        data: qrPayload,
        restaurant: {
          id: restaurant._id.toString(),
          name: restaurant.name,
        },
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async acceptStaffQr(
    firebaseUid: string,
    dto: AcceptStaffQrDto
  ): Promise<{ success: boolean; user: any }> {
    // Validate QR code
    const validation = await this.validateStaffQr({ qrData: dto.qrData });
    if (!validation.valid || !validation.data || !validation.restaurant) {
      throw new BadRequestException('Invalid or expired QR code');
    }

    const { data: qrData, restaurant } = validation;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      restaurantId: qrData.restaurantId,
      phoneNumber: dto.phoneNumber,
    });

    if (existingUser) {
      throw new ConflictException(
        'Staff member with this phone number already exists'
      );
    }

    // Create staff user
    const displayName =
      dto.displayName || qrData.displayName || `${qrData.role} Staff`;

    const user = await this.userModel.create({
      firebaseUid,
      restaurantId: qrData.restaurantId,
      name: displayName,
      phoneNumber: dto.phoneNumber,
      roles: [qrData.role],
      isActive: true,
      isPrimaryOwner: false,
    });

    // Set Firebase custom claims
    await this.authService.setCustomUserClaims(firebaseUid, {
      roles: [qrData.role],
      restaurantId: qrData.restaurantId,
    });

    return {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        role: qrData.role,
        restaurantId: qrData.restaurantId,
        restaurantName: restaurant.name,
      },
    };
  }

  private signQrData(data: {
    restaurantId: string;
    role: UserRole;
    expiresAt: number;
  }): string {
    const payload = `${data.restaurantId}:${data.role}:${data.expiresAt}`;
    return createHmac('sha256', this.qrSecret).update(payload).digest('hex');
  }
}
