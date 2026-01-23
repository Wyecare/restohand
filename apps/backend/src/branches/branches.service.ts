import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
  ) {}

  async create(restaurantId: string, createBranchDto: CreateBranchDto): Promise<Branch> {
    // Check if slug already exists for this restaurant
    const existingBranch = await this.branchModel.findOne({
      restaurantId,
      slug: createBranchDto.slug,
    });

    if (existingBranch) {
      throw new ConflictException(`Branch with slug '${createBranchDto.slug}' already exists`);
    }

    // If this is marked as main branch, ensure no other main branch exists
    if (createBranchDto.isMainBranch) {
      const existingMainBranch = await this.branchModel.findOne({
        restaurantId,
        isMainBranch: true,
      });

      if (existingMainBranch) {
        throw new ConflictException('Restaurant already has a main branch');
      }
    }

    // If this is the first branch, automatically make it main branch
    const branchCount = await this.branchModel.countDocuments({ restaurantId });
    const isFirstBranch = branchCount === 0;

    const branchData = {
      ...createBranchDto,
      restaurantId,
      isMainBranch: createBranchDto.isMainBranch ?? isFirstBranch,
      address: {
        ...createBranchDto.address,
        country: createBranchDto.address.country || 'IN',
      },
    };

    const branch = new this.branchModel(branchData);
    const savedBranch = await branch.save();

    this.logger.log(`Created branch ${savedBranch.name} for restaurant ${restaurantId}`);
    return savedBranch;
  }

  async findAllByRestaurant(restaurantId: string): Promise<Branch[]> {
    return this.branchModel
      .find({ restaurantId, isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .exec();
  }

  async findOne(restaurantId: string, branchId: string): Promise<Branch> {
    const branch = await this.branchModel.findOne({
      _id: branchId,
      restaurantId,
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async findBySlug(restaurantId: string, slug: string): Promise<Branch> {
    const branch = await this.branchModel.findOne({
      restaurantId,
      slug,
      isActive: true,
    });

    if (!branch) {
      throw new NotFoundException(`Branch with slug '${slug}' not found`);
    }

    return branch;
  }

  async findMainBranch(restaurantId: string): Promise<Branch> {
    const mainBranch = await this.branchModel.findOne({
      restaurantId,
      isMainBranch: true,
      isActive: true,
    });

    if (!mainBranch) {
      throw new NotFoundException('Main branch not found');
    }

    return mainBranch;
  }

  async update(
    restaurantId: string,
    branchId: string,
    updateBranchDto: UpdateBranchDto,
  ): Promise<Branch> {
    const branch = await this.findOne(restaurantId, branchId);

    // Check slug uniqueness if slug is being updated
    if (updateBranchDto.slug && updateBranchDto.slug !== branch.slug) {
      const existingBranch = await this.branchModel.findOne({
        restaurantId,
        slug: updateBranchDto.slug,
        _id: { $ne: branchId },
      });

      if (existingBranch) {
        throw new ConflictException(`Branch with slug '${updateBranchDto.slug}' already exists`);
      }
    }

    // Handle main branch logic
    if (updateBranchDto.isMainBranch === true && !branch.isMainBranch) {
      // Setting this branch as main branch, unset other main branches
      await this.branchModel.updateMany(
        { restaurantId, isMainBranch: true },
        { isMainBranch: false },
      );
    } else if (updateBranchDto.isMainBranch === false && branch.isMainBranch) {
      // Trying to unset main branch - ensure there's another branch to be main
      const otherBranches = await this.branchModel.find({
        restaurantId,
        isActive: true,
        _id: { $ne: branchId },
      });

      if (otherBranches.length === 0) {
        throw new BadRequestException('Cannot unset main branch when no other active branches exist');
      }

      // Auto-assign main branch to the first active branch
      await this.branchModel.updateOne(
        { _id: otherBranches[0]._id },
        { isMainBranch: true },
      );
    }

    const updatedBranch = await this.branchModel.findByIdAndUpdate(
      branchId,
      {
        ...updateBranchDto,
        ...(updateBranchDto.address && {
          address: {
            ...updateBranchDto.address,
            country: updateBranchDto.address.country || 'IN',
          },
        }),
      },
      { new: true },
    );

    this.logger.log(`Updated branch ${branchId} for restaurant ${restaurantId}`);
    return updatedBranch!;
  }

  async remove(restaurantId: string, branchId: string): Promise<void> {
    const branch = await this.findOne(restaurantId, branchId);

    if (branch.isMainBranch) {
      const otherBranches = await this.branchModel.find({
        restaurantId,
        isActive: true,
        _id: { $ne: branchId },
      });

      if (otherBranches.length > 0) {
        throw new BadRequestException(
          'Cannot delete main branch when other branches exist. Please set another branch as main first.',
        );
      }
    }

    // Soft delete by setting isActive to false
    await this.branchModel.findByIdAndUpdate(branchId, { isActive: false });

    this.logger.log(`Deleted branch ${branchId} for restaurant ${restaurantId}`);
  }

  async getBranchCount(restaurantId: string): Promise<number> {
    return this.branchModel.countDocuments({ restaurantId, isActive: true });
  }

  async createDefaultBranch(restaurantId: string, restaurantName: string): Promise<Branch> {
    const defaultBranchData: CreateBranchDto = {
      name: 'Main Branch',
      slug: 'main',
      description: `Main branch of ${restaurantName}`,
      address: {
        line1: 'Main Location',
        city: 'City',
        state: 'State',
        postalCode: '000000',
        country: 'IN',
      },
      isMainBranch: true,
      isActive: true,
      settings: {
        orderNumberPrefix: 'ORD',
        enableTakeout: true,
        enableDineIn: true,
        enableDelivery: false,
      },
    };

    return this.create(restaurantId, defaultBranchData);
  }
}