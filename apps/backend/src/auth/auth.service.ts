import { randomUUID } from 'crypto';
import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
      console.log('=== TOKEN VERIFICATION START ===');
      console.log('Token received (first 50 chars):', idToken?.substring(0, 50) + '...');
      console.log('Token length:', idToken?.length);
      console.log('Token starts with:', idToken?.substring(0, 10));

      // Parse the token header to see what's in it
      try {
        const parts = idToken.split('.');
        if (parts.length >= 2) {
          const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.log('Token header:', header);
          console.log('Token payload (iss, aud, exp):', {
            iss: payload.iss,
            aud: payload.aud,
            exp: payload.exp,
            iat: payload.iat,
            exp_readable: new Date(payload.exp * 1000).toISOString(),
            iat_readable: new Date(payload.iat * 1000).toISOString()
          });

          // Check time synchronization
          const now = Math.floor(Date.now() / 1000);
          const timeDiffIat = payload.iat - now;
          const timeDiffExp = payload.exp - now;
          console.log('Time synchronization check:', {
            currentUnixTime: now,
            currentReadable: new Date(now * 1000).toISOString(),
            tokenIssuedInFuture: timeDiffIat > 0,
            secondsFromNowToIat: timeDiffIat,
            secondsFromNowToExp: timeDiffExp,
            tokenExpired: now > payload.exp
          });
        }
      } catch (parseError) {
        console.log('Failed to parse token:', (parseError as Error).message);
      }

      console.log('Calling Firebase Admin verifyIdToken...');
      const decoded = await this.auth.verifyIdToken(idToken, true);

      console.log('Token verified successfully!');
      console.log('Decoded token details:', {
        uid: decoded.uid,
        email: decoded.email,
        iss: decoded.iss,
        aud: decoded.aud
      });

      const roles = this.extractRoles(decoded);

      return {
        uid: decoded.uid,
        email: decoded.email ?? undefined,
        phoneNumber: decoded.phone_number ?? undefined,
        displayName:
          decoded.name ?? decoded.email ?? decoded.phone_number ?? undefined,
        photoURL: decoded.picture ?? undefined,
        restaurantId: this.extractRestaurantId(decoded),
        roles,
        claims: decoded as Record<string, unknown>,
      };
    } catch (error) {
      console.log(error);
      this.logger.warn(
        `Failed to verify Firebase token: ${(error as Error).message}`
      );
      throw new UnauthorizedException(
        'Invalid or expired authentication token'
      );
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

    return validRoles.length ? validRoles : [UserRole.Manager];
  }

  private extractRestaurantId(decoded: DecodedIdToken): string | undefined {
    const restaurantId =
      (decoded as any).restaurantId ?? (decoded as any).restaurant_id;
    if (typeof restaurantId === 'string') {
      return restaurantId;
    }
    return undefined;
  }

  async setCustomUserClaims(
    uid: string,
    claims: Partial<{ roles: UserRole[]; restaurantId?: string }>
  ) {
    const user = await this.auth.getUser(uid);
    const currentClaims = user.customClaims ?? {};
    await this.auth.setCustomUserClaims(uid, {
      ...currentClaims,
      ...claims,
    });
  }

  async createStaffUser(
    displayName: string,
    phoneNumber?: string
  ): Promise<string> {
    const uid = `staff_${randomUUID()}`;
    await this.auth.createUser({ uid, displayName, phoneNumber });
    return uid;
  }

  async generateCustomToken(uid: string, claims: Record<string, unknown>) {
    return this.auth.createCustomToken(uid, claims);
  }
}
