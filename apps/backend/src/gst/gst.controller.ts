import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { GstService } from './gst.service';
import { SmartGstService } from './smart-gst.service';
import { CreateGstRateDto } from './dtos/create-gst-rate.dto';
import { UpdateGstRateDto } from './dtos/update-gst-rate.dto';
import { CreateHsnCodeDto } from './dtos/create-hsn-code.dto';
import { QueryGstRatesDto } from './dtos/query-gst-rates.dto';
import { QueryHsnCodesDto } from './dtos/query-hsn-codes.dto';
import {
  GstRateResponseDto,
  GstRateListResponseDto,
} from './dtos/gst-rate-response.dto';
import {
  HsnCodeResponseDto,
  HsnCodeListResponseDto,
} from './dtos/hsn-code-response.dto';

@ApiTags('gst')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/gst')
export class GstController {
  constructor(
    private readonly gstService: GstService,
    private readonly smartGstService: SmartGstService
  ) {}

  // GST Rates Management
  @Post('rates')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Create a new GST rate' })
  @ApiCreatedResponse({ type: GstRateResponseDto })
  async createGstRate(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateGstRateDto,
    @Req() req: Request
  ): Promise<GstRateResponseDto> {
    const user = req.user as AuthenticatedUser;

    // Ensure user can only manage their restaurant's GST rates
    if (user.restaurantId !== restaurantId) {
      throw new ForbiddenException('Unauthorized access to restaurant GST rates');
    }

    return this.gstService.createGstRate(restaurantId, dto);
  }

  @Get('rates')
  @Roles(UserRole.Manager, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Get all GST rates for a restaurant' })
  @ApiOkResponse({ type: GstRateListResponseDto })
  async getGstRates(
    @Param('restaurantId') restaurantId: string,
    @Query() query: QueryGstRatesDto,
    @Req() req: Request
  ): Promise<GstRateListResponseDto> {
    const user = req.user as AuthenticatedUser;

    console.log('🔍 GST Rates Authorization Debug:', {
      userRestaurantId: user.restaurantId,
      requestedRestaurantId: restaurantId,
      userRoles: user.roles,
      userUid: user.uid,
      match: user.restaurantId === restaurantId
    });

    if (user.restaurantId !== restaurantId) {
      throw new ForbiddenException('Unauthorized access to restaurant GST rates');
    }

    return this.gstService.findGstRates(restaurantId, query);
  }

  @Get('rates/default')
  @Roles(UserRole.Manager, UserRole.Cashier, UserRole.Waiter)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Get default GST rate for a restaurant' })
  @ApiOkResponse({ type: GstRateResponseDto })
  async getDefaultGstRate(
    @Param('restaurantId') restaurantId: string,
    @Req() req: Request
  ): Promise<GstRateResponseDto | null> {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new ForbiddenException('Unauthorized access to restaurant GST rates');
    }

    return this.gstService.getDefaultGstRate(restaurantId);
  }

  @Get('rates/:id')
  @Roles(UserRole.Manager, UserRole.Cashier)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'id', description: 'GST Rate ID' })
  @ApiOperation({ summary: 'Get a specific GST rate' })
  @ApiOkResponse({ type: GstRateResponseDto })
  async getGstRate(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Req() req: Request
  ): Promise<GstRateResponseDto> {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new ForbiddenException('Unauthorized access to restaurant GST rates');
    }

    return this.gstService.findGstRateById(id);
  }

  @Patch('rates/:id')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'id', description: 'GST Rate ID' })
  @ApiOperation({ summary: 'Update a GST rate' })
  @ApiOkResponse({ type: GstRateResponseDto })
  async updateGstRate(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGstRateDto,
    @Req() req: Request
  ): Promise<GstRateResponseDto> {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new ForbiddenException('Unauthorized access to restaurant GST rates');
    }

    return this.gstService.updateGstRate(id, dto);
  }

  @Delete('rates/:id')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiParam({ name: 'id', description: 'GST Rate ID' })
  @ApiOperation({ summary: 'Delete a GST rate' })
  @ApiOkResponse({ description: 'GST rate deleted successfully' })
  async deleteGstRate(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Req() req: Request
  ): Promise<{ success: boolean }> {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new ForbiddenException('Unauthorized access to restaurant GST rates');
    }

    await this.gstService.deleteGstRate(id);
    return { success: true };
  }

  // Tax Calculation
  @Post('calculate')
  @Roles(UserRole.Manager, UserRole.Cashier, UserRole.Waiter)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant ID' })
  @ApiOperation({ summary: 'Calculate tax for order items' })
  async calculateTax(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: {
      items: Array<{
        menuItemId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        hsnCode?: string;
        gstRateId?: string;
      }>;
      customerState?: string;
    },
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;

    if (user.restaurantId !== restaurantId) {
      throw new ForbiddenException('Unauthorized access to restaurant GST calculation');
    }

    // Transform items to match Smart GST service interface
    const orderItems = dto.items.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: 0 // No discount in cart calculation
    }));

    const { items, summary } = await this.smartGstService.calculateOrderGst(
      restaurantId,
      orderItems,
      dto.customerState
    );

    return {
      items,
      summary
    };
  }
}

// Separate controller for HSN codes (not restaurant-specific)
@ApiTags('hsn-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@Controller('hsn-codes')
export class HsnCodeController {
  constructor(private readonly gstService: GstService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new HSN code' })
  @ApiCreatedResponse({ type: HsnCodeResponseDto })
  async createHsnCode(@Body() dto: CreateHsnCodeDto): Promise<HsnCodeResponseDto> {
    return this.gstService.createHsnCode(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search HSN codes' })
  @ApiOkResponse({ type: HsnCodeListResponseDto })
  async getHsnCodes(@Query() query: QueryHsnCodesDto): Promise<HsnCodeListResponseDto> {
    return this.gstService.findHsnCodes(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'HSN Code ID' })
  @ApiOperation({ summary: 'Get a specific HSN code' })
  @ApiOkResponse({ type: HsnCodeResponseDto })
  async getHsnCode(@Param('id') id: string): Promise<HsnCodeResponseDto> {
    return this.gstService.findHsnCodeById(id);
  }

  @Get('by-code/:code')
  @ApiParam({ name: 'code', description: 'HSN Code' })
  @ApiOperation({ summary: 'Get HSN code by code value' })
  @ApiOkResponse({ type: HsnCodeResponseDto })
  async getHsnCodeByCode(@Param('code') code: string): Promise<HsnCodeResponseDto | null> {
    return this.gstService.findHsnCodeByCode(code);
  }
}
