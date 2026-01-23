import { UserRole } from '../../common/enums/user-role.enum';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  roles: UserRole[];
  restaurantId?: string;
  branchId?: string;
  isPrimaryOwner?: boolean;
  claims: Record<string, unknown>;
}
