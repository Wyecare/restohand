import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { FIREBASE_AUTH } from './firebase-admin.provider';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(FIREBASE_AUTH) private readonly auth: Auth) {}

  async verifyToken(idToken: string): Promise<AuthenticatedUser> {
    try {
      const decoded = await this.auth.verifyIdToken(idToken, true);

      const roles = this.extractRoles(decoded);

      return {
        uid: decoded.uid,
        email: decoded.email ?? undefined,
        phoneNumber: decoded.phone_number ?? undefined,
        displayName: decoded.name ?? decoded.email ?? decoded.phone_number ?? undefined,
        photoURL: decoded.picture ?? undefined,
        restaurantId: this.extractRestaurantId(decoded),
        roles,
        claims: decoded as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.warn(`Failed to verify Firebase token: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private extractRoles(decoded: DecodedIdToken): UserRole[] {
    const claimsRoles = decoded['roles'];
    const singleRole = decoded['role'];
    const resolved: string[] = [];

    if (Array.isArray(claimsRoles)) {
      resolved.push(...claimsRoles.map(String));
    }

    if (singleRole && typeof singleRole === 'string') {
      resolved.push(singleRole);
    }

    const unique = Array.from(new Set(resolved));
    const validRoles = unique.filter((role) =>
      Object.values(UserRole).includes(role as UserRole)
    ) as UserRole[];

    return validRoles.length ? validRoles : [UserRole.Waiter];
  }

  private extractRestaurantId(decoded: DecodedIdToken): string | undefined {
    const restaurantId = (decoded as any).restaurantId ?? (decoded as any).restaurant_id;
    if (typeof restaurantId === 'string') {
      return restaurantId;
    }
    return undefined;
  }
}
