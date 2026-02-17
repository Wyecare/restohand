import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { User, UserDocument } from './schemas/user.schema';
import {
  StaffInvitation,
  StaffInvitationDocument,
} from './schemas/staff-invitation.schema';
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema';
import {
  CreateStaffInvitationDto,
  AcceptStaffInvitationDto,
  StaffInvitationResponseDto,
} from './dtos/staff-invitation.dto';
import { JwtAuthService } from '../auth/jwt-auth.service';
import { BranchPermissionsService } from './branch-permissions.service';

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
    private readonly jwtAuthService: JwtAuthService,
    private readonly branchPermissions: BranchPermissionsService
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

  async createInvitation(
    actor: AuthenticatedUser,
    dto: CreateStaffInvitationDto
  ): Promise<StaffInvitationResponseDto> {
    if (!actor.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    // Get branch permissions for the actor
    const permissions = await this.branchPermissions.getBranchPermissions(
      actor
    );

    console.log('Branch permissions:', permissions);

    // Validate branch permission
    if (!permissions.canManageBranch(dto.branchId)) {
      throw new ForbiddenException(
        'Insufficient permissions to invite staff to this branch'
      );
    }

    // Only primary owners and main branch managers can invite managers
    if (dto.role === UserRole.Manager) {
      if (!actor.isPrimaryOwner && !permissions.canAccessAllBranches) {
        throw new ForbiddenException(
          'Only primary owners and main branch managers can invite managers'
        );
      }
    }

    // Require email for invitations
    if (!dto.email) {
      throw new BadRequestException('Email is required for staff invitations');
    }

    // Check if user already exists with this email
    const existingUser = await this.userModel.findOne({
      restaurantId: actor.restaurantId,
      email: dto.email,
    });

    if (existingUser) {
      throw new ConflictException(
        'Staff member with this email already exists'
      );
    }

    // Delete any existing invitations for this email (used or unused, expired or active)
    await this.invitationModel.deleteMany({
      restaurantId: actor.restaurantId,
      email: dto.email,
    });

    // Get restaurant info for email
    const restaurant = await this.restaurantModel.findById(actor.restaurantId);
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Find the inviting user's ObjectId
    const invitingUser = await this.userModel.findOne({
      _id: actor.uid,
      restaurantId: actor.restaurantId,
    });
    console.log('Inviting user:', invitingUser);
    if (!invitingUser) {
      throw new NotFoundException('Inviting user not found');
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Create invitation
    const invitation = await this.invitationModel.create({
      restaurantId: actor.restaurantId,
      branchId: dto.branchId,
      invitedBy: invitingUser._id,
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      role: dto.role,
      invitationToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Send email invitation
    await this.sendInvitationEmail(invitation, restaurant);

    this.logger.log(
      `Staff invitation sent to ${dto.email} for ${restaurant.name}`
    );

    return this.toDto(invitation);
  }

  async validateInvitation(
    invitationToken: string,
    email?: string
  ): Promise<StaffInvitation> {
    const query: any = {
      invitationToken,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    };

    // If email is provided, include it in the query for additional security
    if (email) {
      query.email = email;
    }

    const invitation = await this.invitationModel.findOne(query);

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    return invitation;
  }

  async getInvitationWithRestaurant(invitationToken: string): Promise<{
    valid: boolean;
    email?: string;
    role?: string;
    restaurantName?: string;
    message?: string;
  }> {
    try {
      const invitation = await this.validateInvitation(invitationToken);

      // Get restaurant name
      const restaurant = await this.restaurantModel.findById(
        invitation.restaurantId
      );

      return {
        valid: true,
        email: invitation.email,
        role: invitation.role,
        restaurantName: restaurant?.name || 'Unknown Restaurant',
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error.message || 'Invalid or expired invitation token',
      };
    }
  }

  async acceptInvitation(dto: {
    invitationToken: string;
    name: string;
    password: string;
  }): Promise<{
    success: boolean;
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      restaurantId: string;
    };
    expires_in: number;
  }> {
    // Validate invitation
    const invitation = await this.validateInvitation(dto.invitationToken);

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: invitation.email,
    });

    if (existingUser) {
      throw new ConflictException('Staff member already exists');
    }

    // Register the user using JWT service
    const authResult = await this.jwtAuthService.register({
      email: invitation.email,
      password: dto.password,
      name: dto.name,
      roles: [invitation.role as UserRole],
      restaurantId: invitation.restaurantId.toString(),
    });

    // Get the created user to update with branch info
    const user = await this.userModel.findById(authResult.user.uid);
    if (user) {
      await this.userModel.findByIdAndUpdate(user._id, {
        branchId: invitation.branchId,
        isPrimaryOwner: false,
        isEmailVerified: true, // Since they clicked the invitation link
      });
    }

    // Mark invitation as used
    await this.invitationModel.findByIdAndUpdate((invitation as any)._id, {
      isUsed: true,
      usedAt: new Date(),
      acceptedBy: authResult.user.uid,
    });

    this.logger.log(`Staff signup completed for ${invitation.email}`);

    return {
      success: true,
      access_token: authResult.access_token,
      refresh_token: authResult.refresh_token,
      expires_in: authResult.expires_in,
      user: {
        id: authResult.user.uid,
        email: invitation.email,
        name: dto.name,
        role: invitation.role,
        restaurantId: invitation.restaurantId.toString(),
      },
    };
  }

  async listInvitations(
    actor: AuthenticatedUser
  ): Promise<StaffInvitationResponseDto[]> {
    if (!actor.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    const permissions = await this.branchPermissions.getBranchPermissions(
      actor
    );

    let branchFilter = {};
    if (!permissions.canAccessAllBranches) {
      branchFilter = { branchId: { $in: permissions.accessibleBranchIds } };
    }

    const invitations = await this.invitationModel
      .find({
        restaurantId: actor.restaurantId,
        ...branchFilter,
        expiresAt: { $gt: new Date() }, // Only active invitations
      })
      .sort({ createdAt: -1 });

    return invitations.map((invitation) => this.toDto(invitation));
  }

  async revokeInvitation(
    actor: AuthenticatedUser,
    invitationId: string
  ): Promise<void> {
    if (!actor.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    // Find the invitation first to check permissions
    const invitation = await this.invitationModel.findOne({
      _id: invitationId,
      restaurantId: actor.restaurantId,
      isUsed: false,
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    // Check if actor can manage the branch
    const permissions = await this.branchPermissions.getBranchPermissions(
      actor
    );
    if (!permissions.canManageBranch(invitation.branchId)) {
      throw new ForbiddenException(
        'Insufficient permissions to revoke this invitation'
      );
    }

    await this.invitationModel.findByIdAndDelete(invitationId);
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

    // Use role-specific frontend URL for staff invitations
    const staffFrontendUrl =
      this.configService.get<string>('STAFF_FRONTEND_URL');
    const adminFrontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';

    // Determine which frontend to use based on role
    let frontendUrl: string;
    if (invitation.role === UserRole.Manager || invitation.role === UserRole.Owner) {
      // Managers and owners should use admin frontend
      frontendUrl = adminFrontendUrl;
    } else {
      // Waiters, chefs, cashiers use staff frontend
      frontendUrl = staffFrontendUrl || adminFrontendUrl;
    }

    const invitationUrl = `${frontendUrl}/staff-invite-signup?token=${invitation.invitationToken}`;

    console.log('Invitation URL:', invitationUrl);

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

  private toDto(
    invitation: StaffInvitationDocument
  ): StaffInvitationResponseDto {
    return {
      id: invitation._id.toString(),
      restaurantId: invitation.restaurantId.toString(),
      branchId: invitation.branchId.toString(),
      name: invitation.name,
      email: invitation.email,
      phoneNumber: invitation.phoneNumber,
      role: invitation.role,
      invitationToken: invitation.invitationToken,
      expiresAt: invitation.expiresAt.toISOString(),
      isUsed: invitation.isUsed,
      createdAt: (invitation as any).createdAt?.toISOString(),
      usedAt: invitation.usedAt?.toISOString(),
    };
  }
}
