import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { SmsService } from '../common/services/sms.service';
import { User, UserDocument } from './schemas/user.schema';
import { StaffInvitation, StaffInvitationDocument } from './schemas/staff-invitation.schema';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { CreateStaffInvitationDto, AcceptStaffInvitationDto, StaffInvitationResponseDto } from './dtos/staff-invitation.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class StaffInvitationService {
  constructor(
    @InjectModel(StaffInvitation.name)
    private readonly invitationModel: Model<StaffInvitationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    private readonly smsService: SmsService,
    private readonly authService: AuthService
  ) {}

  async createInvitation(
    actor: AuthenticatedUser,
    dto: CreateStaffInvitationDto
  ): Promise<StaffInvitationResponseDto> {
    if (!actor.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    if (dto.role === UserRole.Manager) {
      throw new ForbiddenException('Use owner dashboard to add additional managers.');
    }

    // Check if user already exists with this phone number
    const existingUser = await this.userModel.findOne({
      restaurantId: actor.restaurantId,
      phoneNumber: dto.phoneNumber,
    });

    if (existingUser) {
      throw new ConflictException('Staff member with this phone number already exists');
    }

    // Check for existing active invitation
    const existingInvitation = await this.invitationModel.findOne({
      restaurantId: actor.restaurantId,
      phoneNumber: dto.phoneNumber,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      throw new ConflictException('Active invitation already exists for this phone number');
    }

    // Get restaurant info for SMS
    const restaurant = await this.restaurantModel.findById(actor.restaurantId);
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Find the inviting user's ObjectId
    const invitingUser = await this.userModel.findOne({
      firebaseUid: actor.uid,
      restaurantId: actor.restaurantId
    });
    if (!invitingUser) {
      throw new NotFoundException('Inviting user not found');
    }

    // Generate invitation token
    const invitationToken = randomBytes(32).toString('hex');

    // Create invitation
    const invitation = await this.invitationModel.create({
      restaurantId: actor.restaurantId,
      invitedBy: invitingUser._id,
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      role: dto.role,
      invitationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Send SMS invitation
    const invitationLink = `${process.env.FRONTEND_URL}/staff-signup?token=${invitationToken}`;

    try {
      await this.smsService.sendStaffInvitation(
        dto.phoneNumber,
        dto.name,
        restaurant.name,
        dto.role,
        invitationLink
      );
    } catch (error) {
      // Log error but don't fail the invitation creation
      console.error('Failed to send SMS invitation:', error);
    }

    return this.toDto(invitation);
  }

  async validateInvitation(invitationToken: string, phoneNumber: string): Promise<StaffInvitation> {
    const invitation = await this.invitationModel.findOne({
      invitationToken,
      phoneNumber,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    return invitation;
  }

  async acceptInvitation(
    firebaseUid: string,
    dto: AcceptStaffInvitationDto
  ): Promise<{ success: boolean; user: any }> {
    // Validate invitation
    const invitation = await this.validateInvitation(dto.invitationToken, dto.phoneNumber);

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      restaurantId: invitation.restaurantId,
      phoneNumber: dto.phoneNumber,
    });

    if (existingUser) {
      throw new ConflictException('Staff member already exists');
    }

    // Create staff user
    const user = await this.userModel.create({
      firebaseUid,
      restaurantId: invitation.restaurantId,
      name: invitation.name,
      email: invitation.email,
      phoneNumber: invitation.phoneNumber,
      roles: [invitation.role],
      isActive: true,
      isPrimaryOwner: false,
    });

    // Set Firebase custom claims
    await this.authService.setCustomUserClaims(firebaseUid, {
      roles: [invitation.role],
      restaurantId: invitation.restaurantId,
    });

    // Mark invitation as used
    await this.invitationModel.findByIdAndUpdate(invitation._id, {
      isUsed: true,
      usedAt: new Date(),
      acceptedBy: user._id,
    });

    return {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        role: invitation.role,
        restaurantId: invitation.restaurantId,
      },
    };
  }

  async listInvitations(restaurantId: string): Promise<StaffInvitationResponseDto[]> {
    const invitations = await this.invitationModel
      .find({
        restaurantId,
        expiresAt: { $gt: new Date() }, // Only active invitations
      })
      .sort({ createdAt: -1 });

    return invitations.map(invitation => this.toDto(invitation));
  }

  async revokeInvitation(restaurantId: string, invitationId: string): Promise<void> {
    const result = await this.invitationModel.findOneAndDelete({
      _id: invitationId,
      restaurantId,
      isUsed: false,
    });

    if (!result) {
      throw new NotFoundException('Invitation not found or already used');
    }
  }

  private toDto(invitation: StaffInvitationDocument): StaffInvitationResponseDto {
    return {
      id: invitation._id.toString(),
      restaurantId: invitation.restaurantId.toString(),
      name: invitation.name,
      phoneNumber: invitation.phoneNumber,
      email: invitation.email,
      role: invitation.role,
      invitationToken: invitation.invitationToken,
      expiresAt: invitation.expiresAt.toISOString(),
      isUsed: invitation.isUsed,
      createdAt: invitation.createdAt.toISOString(),
      usedAt: invitation.usedAt?.toISOString(),
    };
  }
}