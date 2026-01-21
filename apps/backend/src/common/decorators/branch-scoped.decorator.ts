import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface BranchScope {
  restaurantId: string;
  branchId?: string;
  isMultibranchEnabled: boolean;
}

export const BranchScoped = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): BranchScope => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.branchContext) {
      throw new Error('Branch scope middleware not applied');
    }

    return request.branchContext;
  },
);

export interface BranchScopedQuery {
  restaurantId: string;
  branchId?: string;
}

/**
 * Helper function to create MongoDB query with branch scoping
 */
export function createBranchScopedQuery(
  branchScope: BranchScope,
  additionalQuery: Record<string, any> = {}
): BranchScopedQuery & Record<string, any> {
  const baseQuery: BranchScopedQuery = {
    restaurantId: branchScope.restaurantId,
  };

  // Add branch scoping if user is scoped to a specific branch
  if (branchScope.branchId) {
    baseQuery.branchId = branchScope.branchId;
  }

  return { ...baseQuery, ...additionalQuery };
}

/**
 * Helper function for updating documents with branch ID
 */
export function addBranchToUpdate(
  branchScope: BranchScope,
  updateData: Record<string, any>
): Record<string, any> {
  // Only add branchId if user is scoped to a specific branch
  if (branchScope.branchId && branchScope.isMultibranchEnabled) {
    return {
      ...updateData,
      branchId: branchScope.branchId,
    };
  }

  return updateData;
}