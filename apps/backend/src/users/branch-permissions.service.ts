import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

export interface BranchPermissionCheck {
  canInviteToAnyBranch: boolean;
  canManageBranch: (branchId: string) => boolean;
  canAccessAllBranches: boolean;
  accessibleBranchIds: string[];
}

@Injectable()
export class BranchPermissionsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>
  ) {}

  /**
   * Check if a user can perform branch-related actions
   */
  async getBranchPermissions(
    user: AuthenticatedUser
  ): Promise<BranchPermissionCheck> {
    if (!user.restaurantId) {
      throw new ForbiddenException('No restaurant associated with user');
    }

    // Owner/Primary Owner has access to everything
    if (user.roles?.includes(UserRole.Owner) || user.isPrimaryOwner) {
      const allBranches = await this.branchModel
        .find({ restaurantId: user.restaurantId })
        .select('_id')
        .lean();

      const branchIds = allBranches.map((b) => b._id.toString());

      return {
        canInviteToAnyBranch: true,
        canManageBranch: () => true,
        canAccessAllBranches: true,
        accessibleBranchIds: branchIds,
      };
    }

    // Get user's detailed permissions
    const userDoc = await this.userModel
      .findOne({ _id: user.uid, restaurantId: user.restaurantId })
      .select('branchId branchScopes roles isPrimaryOwner')
      .lean();

    if (!userDoc) {
      throw new ForbiddenException('User not found');
    }

    // Manager permissions based on branch scopes
    if (user.roles?.includes(UserRole.Manager)) {
      const accessibleBranches = [
        ...(userDoc.branchId ? [userDoc.branchId] : []),
        ...(userDoc.branchScopes || []),
      ];

      const uniqueBranchIds = [...new Set(accessibleBranches)].map((id) =>
        id.toString()
      );

      return {
        canInviteToAnyBranch: uniqueBranchIds.length > 1, // Can invite to multiple branches
        canManageBranch: (branchId: string) =>
          uniqueBranchIds.includes(branchId),
        canAccessAllBranches: false,
        accessibleBranchIds: uniqueBranchIds,
      };
    }

    // Non-manager users (Chef, Waiter, Cashier) - only their assigned branch
    const ownBranchId = userDoc.branchId?.toString();

    return {
      canInviteToAnyBranch: false,
      canManageBranch: (branchId: string) => ownBranchId === branchId,
      canAccessAllBranches: false,
      accessibleBranchIds: ownBranchId ? [ownBranchId] : [],
    };
  }

  /**
   * Add branch scope to a manager (allows them to manage multiple branches)
   */
  async addBranchScope(
    actorUser: AuthenticatedUser,
    targetUserId: string,
    branchId: string
  ): Promise<void> {
    // Check if actor has permission to manage this branch
    const permissions = await this.getBranchPermissions(actorUser);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException(
        'Insufficient permissions to manage this branch'
      );
    }

    // Verify target user is a manager in the same restaurant
    const targetUser = await this.userModel.findOne({
      _id: targetUserId,
      restaurantId: actorUser.restaurantId,
      roles: { $in: [UserRole.Manager] },
    });

    if (!targetUser) {
      throw new ForbiddenException(
        'Target user is not a manager in this restaurant'
      );
    }

    // Add branch scope if not already present
    if (!targetUser.branchScopes.includes(branchId)) {
      await this.userModel.findByIdAndUpdate(targetUserId, {
        $addToSet: { branchScopes: branchId },
      });
    }
  }

  /**
   * Remove branch scope from a manager
   */
  async removeBranchScope(
    actorUser: AuthenticatedUser,
    targetUserId: string,
    branchId: string
  ): Promise<void> {
    // Check if actor has permission to manage this branch
    const permissions = await this.getBranchPermissions(actorUser);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException(
        'Insufficient permissions to manage this branch'
      );
    }

    await this.userModel.findByIdAndUpdate(targetUserId, {
      $pull: { branchScopes: branchId },
    });
  }

  /**
   * Transfer a user to a different branch
   */
  async transferUserToBranch(
    actorUser: AuthenticatedUser,
    targetUserId: string,
    newBranchId: string
  ): Promise<void> {
    const permissions = await this.getBranchPermissions(actorUser);

    // Check if actor can manage the target branch
    if (!permissions.canManageBranch(newBranchId)) {
      throw new ForbiddenException(
        'Insufficient permissions to assign users to this branch'
      );
    }

    // Get target user to check current branch
    const targetUser = await this.userModel.findOne({
      _id: targetUserId,
      restaurantId: actorUser.restaurantId,
    });

    if (!targetUser) {
      throw new ForbiddenException('Target user not found in this restaurant');
    }

    // Check if actor can manage the user's current branch (if any)
    if (
      targetUser.branchId &&
      !permissions.canManageBranch(targetUser.branchId)
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to transfer this user'
      );
    }

    // Update user's branch assignment
    await this.userModel.findByIdAndUpdate(targetUserId, {
      $set: { branchId: newBranchId },
    });
  }

  /**
   * Get branches that a user can manage
   */
  async getManageableBranches(user: AuthenticatedUser): Promise<Branch[]> {
    const permissions = await this.getBranchPermissions(user);

    if (permissions.canAccessAllBranches) {
      return this.branchModel.find({ restaurantId: user.restaurantId }).lean();
    }

    return this.branchModel
      .find({
        restaurantId: user.restaurantId,
        _id: { $in: permissions.accessibleBranchIds },
      })
      .lean();
  }
}
