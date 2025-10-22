import { createHash, randomInt } from 'crypto';
import { Injectable, NotFoundException, ForbiddenException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { User, UserDocument } from './schemas/user.schema';
import { InviteStaffRequestDto } from './dtos/invite-staff.request';
import { StaffResponseDto } from './dtos/staff-response.dto';
import { UpdateStaffDto } from './dtos/update-staff.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly authService: AuthService
  ) {}

  async attachRestaurantToUser(
    actor: AuthenticatedUser,
    restaurantId: string,
    roles: UserRole[] = [UserRole.Manager]
  ): Promise<void> {
    await this.userModel.findOneAndUpdate(
      { firebaseUid: actor.uid },
      {
        $set: {
          firebaseUid: actor.uid,
          restaurantId,
          name: actor.displayName ?? actor.email ?? actor.phoneNumber ?? 'Owner',
          email: actor.email,
          phoneNumber: actor.phoneNumber,
          roles,
          isActive: true,
          isPrimaryOwner: true,
          lastLoginAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    await this.authService.setCustomUserClaims(actor.uid, {
      roles,
      restaurantId,
    });
  }

  async listForRestaurant(restaurantId: string): Promise<StaffResponseDto[]> {
    if (!restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }
    const users = await this.userModel
      .find({ restaurantId, isPrimaryOwner: { $ne: true } })
      .sort({ createdAt: -1 });
    return users.map((doc) => this.toDto(doc));
  }

  async inviteStaff(
    actor: AuthenticatedUser,
    dto: InviteStaffRequestDto
  ): Promise<{ staff: StaffResponseDto; temporaryPin: string }> {
    if (!actor.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    if (dto.role === UserRole.Manager) {
      throw new ForbiddenException('Use owner dashboard to add additional managers.');
    }

    const contactFilters: Record<string, string>[] = [];
    if (dto.email) contactFilters.push({ email: dto.email });
    if (dto.phoneNumber) contactFilters.push({ phoneNumber: dto.phoneNumber });

    const existing = contactFilters.length
      ? await this.userModel.findOne({
          restaurantId: actor.restaurantId,
          $or: contactFilters,
        })
      : null;

    if (existing) {
      throw new ConflictException('Staff member with provided contact already exists');
    }

    const firebaseUid = await this.authService.createStaffUser(dto.name, dto.phoneNumber);

    const pin = randomInt(1000, 9999).toString();
    const pinHash = createHash('sha256').update(pin).digest('hex');

    const created = await this.userModel.create({
      firebaseUid,
      restaurantId: actor.restaurantId,
      name: dto.name,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      roles: [dto.role],
      pinHash,
      isActive: true,
      isPrimaryOwner: false,
    });

    await this.authService.setCustomUserClaims(firebaseUid, {
      roles: [dto.role],
      restaurantId: actor.restaurantId,
    });

    return {
      staff: this.toDto(created),
      temporaryPin: pin,
    };
  }

  async updateStaff(
    actor: AuthenticatedUser,
    staffId: string,
    dto: UpdateStaffDto
  ): Promise<StaffResponseDto> {
    if (!actor.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    const staff = await this.userModel.findOne({
      _id: staffId,
      restaurantId: actor.restaurantId,
      isPrimaryOwner: { $ne: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    if (dto.roles) {
      staff.roles = dto.roles;
      await this.authService.setCustomUserClaims(staff.firebaseUid!, {
        roles: dto.roles,
        restaurantId: actor.restaurantId,
      });
    }

    if (typeof dto.isActive === 'boolean') {
      staff.isActive = dto.isActive;
    }

    await staff.save();
    return this.toDto(staff);
  }

  async resetStaffPin(
    actor: AuthenticatedUser,
    staffId: string
  ): Promise<{ staff: StaffResponseDto; temporaryPin: string }> {
    if (!actor.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    const staff = await this.userModel
      .findOne({
        _id: staffId,
        restaurantId: actor.restaurantId,
        isPrimaryOwner: { $ne: true },
      })
      .select('+pinHash');

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const pin = randomInt(1000, 9999).toString();
    staff.pinHash = createHash('sha256').update(pin).digest('hex');
    await staff.save();

    return {
      staff: this.toDto(staff),
      temporaryPin: pin,
    };
  }

  async generateStaffCustomToken(phoneOrEmail: string, pin: string) {
    const filter = {
      $or: [{ phoneNumber: phoneOrEmail }, { email: phoneOrEmail }],
      isActive: true,
    };
    const staff = await this.userModel.findOne(filter).select('+pinHash');
    if (!staff || !staff.pinHash || !staff.firebaseUid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hash = createHash('sha256').update(pin).digest('hex');
    if (hash !== staff.pinHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const restaurantId =
      (staff.restaurantId as any)?.toString?.() ?? (staff.restaurantId as string);

    await this.authService.setCustomUserClaims(staff.firebaseUid, {
      roles: staff.roles,
      restaurantId,
    });

    const token = await this.authService.generateCustomToken(staff.firebaseUid, {
      roles: staff.roles,
      restaurantId,
    });

    await this.userModel.updateOne(
      { _id: staff._id },
      { $set: { lastLoginAt: new Date() } }
    );

    return { token, staff: this.toDto(staff) };
  }

  private toDto(doc: UserDocument): StaffResponseDto {
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      phoneNumber: doc.phoneNumber,
      roles: doc.roles,
      isActive: doc.isActive,
      restaurantId: doc.restaurantId?.toString?.() ?? (doc.restaurantId as string),
      lastLoginAt: doc.lastLoginAt?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
    };
  }
}
