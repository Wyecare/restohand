import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface BranchScopedRequest extends Request {
  user: {
    id: string;
    restaurantId: string;
    branchId?: string;
    roles: string[];
    canAccessAllBranches?: boolean;
  };
  branchContext: {
    restaurantId: string;
    branchId?: string;
    isMultibranchEnabled: boolean;
  };
}

@Injectable()
export class BranchScopeMiddleware implements NestMiddleware {
  use(req: BranchScopedRequest, res: Response, next: NextFunction) {
    // Skip if no user (auth middleware will handle)
    if (!req.user) {
      return next();
    }

    // Extract branch context from user
    const { restaurantId, branchId, roles, canAccessAllBranches } = req.user;

    // Check if user has cross-branch access (owners/managers with special permission)
    const hasAllBranchAccess = canAccessAllBranches ||
      roles.includes('owner') ||
      (roles.includes('manager') && canAccessAllBranches);

    // Set up branch context
    req.branchContext = {
      restaurantId,
      branchId: hasAllBranchAccess ? undefined : branchId, // undefined means all branches
      isMultibranchEnabled: Boolean(branchId), // If user has branchId, multi-branch is enabled
    };

    // Handle branch selection from query params or headers for multi-branch users
    if (hasAllBranchAccess) {
      const requestedBranchId = req.query.branchId as string ||
                               req.headers['x-branch-id'] as string;

      if (requestedBranchId) {
        req.branchContext.branchId = requestedBranchId;
      }
    }

    next();
  }
}

// Decorator to require branch scope
export function RequireBranchScope() {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const req = args.find(arg => arg && typeof arg === 'object' && 'branchContext' in arg);

      if (!req?.branchContext) {
        throw new UnauthorizedException('Branch context required');
      }

      return method.apply(this, args);
    };
  };
}