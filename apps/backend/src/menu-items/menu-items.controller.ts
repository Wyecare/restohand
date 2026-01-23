import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BranchPermissionsService } from '../users/branch-permissions.service';
import { CreateMenuItemDto } from './dtos/create-menu-item.dto';
import { MenuItemListResponseDto } from './dtos/menu-item-list-response.dto';
import { MenuItemResponseDto } from './dtos/menu-item-response.dto';
import { QueryMenuItemsDto } from './dtos/query-menu-items.dto';
import { UpdateMenuItemDto } from './dtos/update-menu-item.dto';
import { MenuItemsService } from './menu-items.service';
import { ImageUploadService } from '../common/services/image-upload.service';
import { memoryStorage } from 'multer';

const multerConfig = {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: any, file: any, callback: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`), false);
    }
  },
};

@ApiTags('menu-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('restaurants/:restaurantId/menu/items')
export class MenuItemsController {
  constructor(
    private readonly menuItemsService: MenuItemsService,
    private readonly imageUploadService: ImageUploadService,
    private readonly branchPermissions: BranchPermissionsService,
  ) {}

  @Post()
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({ type: MenuItemResponseDto })
  async create(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuItemDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Get user's manageable branches to determine which branch to assign
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    const manageableBranches = await this.branchPermissions.getManageableBranches(user);

    // For main managers, we need to specify a branchId in the request or use the first branch
    // For branch managers, use their assigned branch
    let branchId: string;

    if (manageableBranches.length > 0) {
      // Use the first manageable branch for both main managers and branch managers
      branchId = manageableBranches[0]._id.toString();
    } else {
      throw new ForbiddenException('No manageable branches found');
    }

    return this.menuItemsService.createForBranch(restaurantId, branchId, dto);
  }

  @Get()
  @ApiParam({ name: 'restaurantId' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'isAvailable', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ type: MenuItemListResponseDto })
  async findAll(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Query() query: QueryMenuItemsDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Get user's manageable branches
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    const manageableBranches = await this.branchPermissions.getManageableBranches(user);

    if (permissions.canAccessAllBranches) {
      // Main manager - return items from all branches they can manage
      const branchIds = manageableBranches.map(branch => branch._id.toString());
      return this.menuItemsService.findAllByBranches(restaurantId, branchIds, query);
    } else if (manageableBranches.length > 0) {
      // Branch manager - return items from their assigned branch
      return this.menuItemsService.findByBranch(restaurantId, manageableBranches[0]._id.toString(), query);
    } else {
      throw new ForbiddenException('No manageable branches found');
    }
  }

  @Get('profitability-analysis')
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({ description: 'Menu profitability analysis' })
  async getProfitabilityAnalysis(
    @Param('restaurantId') restaurantId: string
  ) {
    return this.menuItemsService.getMenuProfitabilityAnalysis(restaurantId);
  }

  @Get(':itemId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiOkResponse({ type: MenuItemResponseDto })
  async findOne(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string
  ) {
    return this.menuItemsService.findOne(restaurantId, itemId);
  }

  @Get(':itemId/cost-analysis')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiOkResponse({ description: 'Menu item with cost analysis' })
  async getMenuItemWithCostAnalysis(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string
  ) {
    return this.menuItemsService.getMenuItemWithCostAnalysis(restaurantId, itemId);
  }

  @Patch(':itemId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiOkResponse({ type: MenuItemResponseDto })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuItemDto
  ) {
    return this.menuItemsService.update(restaurantId, itemId, dto);
  }

  @Delete(':itemId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiOkResponse({ description: 'Menu item deleted' })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string
  ) {
    await this.menuItemsService.remove(restaurantId, itemId);
    return { success: true };
  }

  @Post(':itemId/upload-image')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 uploads per minute
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          // Changed from 'image' to 'file'
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        imageUrl: { type: 'string' },
        fileName: { type: 'string' },
      },
    },
  })
  async uploadImage(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    console.log('🚀 Upload endpoint hit!', { restaurantId, itemId });
    console.log('📁 File received:', file ? 'YES' : 'NO');

    if (!file) {
      console.log('❌ No file provided');
      throw new BadRequestException('No image file provided');
    }

    console.log('📋 File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Upload image to Firebase Storage
    const uploadResult = await this.imageUploadService.uploadMenuItemImage(
      restaurantId,
      itemId,
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // Update menu item with new image URL
    const menuItem = await this.menuItemsService.findOne(restaurantId, itemId);
    const updatedImageUrls = [
      ...(menuItem.imageUrls || []),
      uploadResult.publicUrl,
    ];

    await this.menuItemsService.update(restaurantId, itemId, {
      imageUrls: updatedImageUrls,
    });

    return {
      success: true,
      imageUrl: uploadResult.publicUrl,
      fileName: uploadResult.fileName,
    };
  }

  @Delete(':itemId/images/:imageIndex')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'itemId' })
  @ApiParam({ name: 'imageIndex', description: 'Index of image to delete' })
  @ApiOkResponse({ description: 'Image deleted successfully' })
  async removeImage(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Param('imageIndex') imageIndex: string
  ) {
    const index = parseInt(imageIndex, 10);
    if (isNaN(index)) {
      throw new BadRequestException('Invalid image index');
    }

    const menuItem = await this.menuItemsService.findOne(restaurantId, itemId);
    if (
      !menuItem.imageUrls ||
      index < 0 ||
      index >= menuItem.imageUrls.length
    ) {
      throw new BadRequestException('Image index out of range');
    }

    // Remove image URL from array
    const updatedImageUrls = menuItem.imageUrls.filter((_, i) => i !== index);

    await this.menuItemsService.update(restaurantId, itemId, {
      imageUrls: updatedImageUrls,
    });

    // Note: We could also delete the actual file from Firebase Storage here
    // but keeping it for now in case of accidental deletions

    return { success: true };
  }

  // New branch-aware endpoints
  @Get('branch/:branchId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'isAvailable', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ type: MenuItemListResponseDto })
  async findByBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Query() query: QueryMenuItemsDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to access this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to access this branch menu');
    }

    return this.menuItemsService.findByBranch(restaurantId, branchId, query);
  }

  @Post('branch/:branchId')
  @ApiParam({ name: 'restaurantId' })
  @ApiParam({ name: 'branchId' })
  @ApiCreatedResponse({ type: MenuItemResponseDto })
  async createForBranch(
    @Request() req: any,
    @Param('restaurantId') restaurantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: CreateMenuItemDto
  ) {
    const user = req.user as AuthenticatedUser;

    // Check if user has permission to manage this branch
    const permissions = await this.branchPermissions.getBranchPermissions(user);
    if (!permissions.canManageBranch(branchId)) {
      throw new ForbiddenException('Insufficient permissions to create menu items for this branch');
    }

    return this.menuItemsService.createForBranch(restaurantId, branchId, dto);
  }
}
