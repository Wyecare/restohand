import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { UserRole } from '../common/enums/user-role.enum';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string; // user ID
  email?: string;
  name: string;
  roles: UserRole[];
  restaurantId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: AuthenticatedUser;
  expires_in: number;
}

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userModel
        .findOne({ email, isActive: true })
        .select('+passwordHash')
        .exec();

      if (!user || !user.passwordHash) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(`Error validating user: ${error}`);
      return null;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login time
    await this.userModel.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
    });

    return this.generateTokens(user);
  }

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const user = await this.userModel.create({
      email: registerDto.email,
      passwordHash,
      name: registerDto.name,
      roles: registerDto.roles || [UserRole.Manager],
      restaurantId: registerDto.restaurantId,
      isActive: true,
      lastLoginAt: new Date(),
    });

    return this.generateTokens(user);
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(token);

      const user = await this.userModel
        .findById(decoded.sub)
        .select('-passwordHash -pinHash')
        .exec();

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const authenticatedUser = {
        uid: user._id.toString(),
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.name,
        photoURL: undefined, // We can add this later if needed
        roles: user.roles,
        restaurantId: user.restaurantId?.toString(),
        branchId: user.branchId?.toString(),
        isPrimaryOwner: user.isPrimaryOwner,
        claims: {
          sub: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          roles: decoded.roles,
          restaurantId: decoded.restaurantId,
        },
      };

      return authenticatedUser;
    } catch (error) {
      this.logger.warn(`Failed to verify JWT token: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async refreshToken(token: string): Promise<AuthResult> {
    try {
      // For refresh tokens, we might want to use a different secret or longer expiry
      const decoded = this.jwtService.verify<JwtPayload>(token);

      const user = await this.userModel
        .findById(decoded.sub)
        .select('-passwordHash -pinHash')
        .exec();

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.generateTokens(user);
    } catch (error) {
      this.logger.warn(`Failed to refresh token: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userModel
      .findById(userId)
      .select('-passwordHash -pinHash')
      .exec();
  }

  private async generateTokens(user: UserDocument): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      roles: user.roles,
      restaurantId: user.restaurantId?.toString(),
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const authenticatedUser: AuthenticatedUser = {
      uid: user._id.toString(),
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: user.name,
      photoURL: undefined,
      roles: user.roles,
      restaurantId: user.restaurantId?.toString(),
      branchId: user.branchId?.toString(),
      isPrimaryOwner: user.isPrimaryOwner,
      claims: payload as unknown as Record<string, unknown>,
    };

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: authenticatedUser,
      expires_in: 15 * 60, // 15 minutes in seconds
    };
  }

  async setCustomUserClaims(
    userId: string,
    claims: Partial<{ roles: UserRole[]; restaurantId?: string }>
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, claims);
  }

  async createStaffUser(
    displayName: string,
    phoneNumber?: string,
    restaurantId?: string
  ): Promise<string> {
    const user = await this.userModel.create({
      name: displayName,
      phoneNumber,
      restaurantId,
      roles: [UserRole.Waiter],
      isActive: true,
    });

    return user._id.toString();
  }
}
