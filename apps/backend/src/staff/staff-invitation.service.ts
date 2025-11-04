import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import {
  StaffInvitation,
  StaffInvitationDocument,
} from './schemas/staff-invitation.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import {
  InviteStaffDto,
  CompleteSignupDto,
  VerifyInviteResponseDto,
} from './dtos/invite-staff.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class StaffInvitationService {
  private readonly logger = new Logger(StaffInvitationService.name);
  private transporter?: nodemailer.Transporter;

  constructor(
    @InjectModel(StaffInvitation.name)
    private readonly invitationModel: Model<StaffInvitationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email transporter initialized successfully');
    } else {
      this.logger.warn(
        'Email configuration missing - invitations will not be sent'
      );
    }
  }

  async inviteStaff(
    restaurantId: string,
    invitedById: string,
    dto: InviteStaffDto
  ): Promise<{ message: string; token: string }> {
    // Check if restaurant exists
    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Check if user already exists with this email
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.invitationModel.findOne({
      email: dto.email,
      restaurantId,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const invitation = await this.invitationModel.create({
      restaurantId,
      email: dto.email,
      role: dto.role,
      token,
      expiresAt,
      invitedBy: invitedById,
    });

    // Send email
    await this.sendInvitationEmail(invitation, restaurant);

    this.logger.log(
      `Staff invitation sent to ${dto.email} for ${restaurant.name}`
    );

    return {
      message: 'Invitation sent successfully',
      token, // Return for testing purposes
    };
  }

  async verifyInvite(token: string): Promise<VerifyInviteResponseDto> {
    const invitation = await this.invitationModel
      .findOne({ token })
      .populate('restaurantId', 'name')
      .lean();

    if (!invitation) {
      return {
        valid: false,
        message: 'Invalid invitation token',
      };
    }

    if (invitation.isUsed) {
      return {
        valid: false,
        message: 'This invitation has already been used',
      };
    }

    if (invitation.expiresAt < new Date()) {
      return {
        valid: false,
        message: 'This invitation has expired',
      };
    }

    return {
      valid: true,
      email: invitation.email,
      role: invitation.role,
      restaurantName: (invitation.restaurantId as { name: string }).name,
    };
  }

  async completeSignup(
    dto: CompleteSignupDto
  ): Promise<{ message: string; user: { id: string; email: string; role: string; restaurantId: string } }> {
    const invitation = await this.invitationModel.findOne({ token: dto.token });

    if (!invitation) {
      throw new BadRequestException('Invalid invitation token');
    }

    if (invitation.isUsed) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    // Check if user already exists with this Firebase UID
    const existingUser = await this.userModel.findOne({ firebaseUid: dto.firebaseUid });
    if (existingUser) {
      throw new BadRequestException('User with this Firebase UID already exists');
    }

    // Check if user exists with this email
    const existingEmailUser = await this.userModel.findOne({ email: invitation.email });
    if (existingEmailUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Create new user
    const user = await this.userModel.create({
      firebaseUid: dto.firebaseUid,
      email: invitation.email,
      roles: [invitation.role as UserRole],
      restaurantId: invitation.restaurantId,
      isActive: true,
      isPrimaryOwner: false,
      isEmailVerified: true, // Since they clicked the invitation link
      createdAt: new Date(),
    });

    // Set Firebase custom claims
    await this.authService.setCustomUserClaims(dto.firebaseUid, {
      roles: [invitation.role as UserRole],
      restaurantId: invitation.restaurantId.toString(),
    });

    // Mark invitation as used
    await this.invitationModel.updateOne(
      { _id: invitation._id },
      {
        isUsed: true,
        usedBy: user._id,
        usedAt: new Date(),
      }
    );

    this.logger.log(`Staff signup completed for ${invitation.email}`);

    return {
      message: 'Account created successfully',
      user: {
        id: (user._id as string).toString(),
        email: user.email || invitation.email,
        role: user.roles[0],
        restaurantId: (user.restaurantId as string).toString(),
      },
    };
  }

  private async sendInvitationEmail(
    invitation: StaffInvitationDocument,
    restaurant: RestaurantDocument
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        'Email transporter not configured - skipping email send'
      );
      return;
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const invitationUrl = `${frontendUrl}/staff-invite-signup?token=${invitation.token}`;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_USER'),
      to: invitation.email,
      subject: `You're invited to join ${restaurant.name} staff`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Welcome to ${restaurant.name}!</h2>

          <p>You've been invited to join <strong>${restaurant.name}</strong> as a <strong>${invitation.role}</strong>.</p>

          <p>Click the button below to create your account:</p>

          <a href="${invitationUrl}"
             style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Accept Invitation
          </a>

          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            This invitation will expire in 7 days. If you have any questions, please contact your manager.
          </p>

          <p style="font-size: 12px; color: #999;">
            Powered by Restohand
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      await this.invitationModel.updateOne(
        { _id: invitation._id },
        {
          $inc: { emailSentCount: 1 },
          lastEmailSentAt: new Date(),
        }
      );
      this.logger.log(`Invitation email sent to ${invitation.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email to ${invitation.email}:`,
        error
      );
      throw new BadRequestException('Failed to send invitation email');
    }
  }
}
