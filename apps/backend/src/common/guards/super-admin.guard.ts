import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Check if user has SuperAdmin role
    return user.roles?.includes(UserRole.SuperAdmin) || false;
  }
}