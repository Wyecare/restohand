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
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import { RestaurantListResponseDto } from './dtos/restaurant-list-response.dto';
import { RestaurantResponseDto } from './dtos/restaurant-response.dto';
import { UpdateRestaurantDto } from './dtos/update-restaurant.dto';
import { QueryRestaurantsDto } from './dtos/query-restaurants.dto';
import { RestaurantsService } from './restaurants.service';
import { RestaurantOnboardingService } from './restaurant-onboarding.service';
import { CashfreeVendorService } from '../payments/cashfree-vendor.service';

@ApiTags('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly onboardingService: RestaurantOnboardingService,
    @Inject(forwardRef(() => CashfreeVendorService))
    private readonly cashfreeVendorService: CashfreeVendorService
  ) {}

  @Post()
  @Roles(UserRole.Manager)
  @ApiCreatedResponse({ type: RestaurantResponseDto })
  async create(@Body() dto: CreateRestaurantDto, @Req() req: Request) {
    return this.restaurantsService.create(dto, req.user);
  }

  @Get()
  @Roles(UserRole.Manager)
  @ApiOkResponse({ type: RestaurantListResponseDto })
  async findAll(@Query() query: QueryRestaurantsDto) {
    return this.restaurantsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ type: RestaurantResponseDto })
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ type: RestaurantResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto
  ) {
    return this.restaurantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({ description: 'Restaurant archived successfully' })
  async remove(@Param('id') id: string) {
    await this.restaurantsService.remove(id);
    return { success: true };
  }

  @Get(':id/qrcode')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiQuery({ name: 'table', required: false })
  async generateQr(
    @Param('id') id: string,
    @Query('table') table?: string
  ) {
    return this.restaurantsService.generateQrCode(id, table);
  }

  @Post(':id/payment/setup-linked-account')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({
    description: 'Setup linked account response',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        linkedAccountId: { type: 'string' },
        status: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async setupLinkedAccount(@Param('id') id: string) {
    return this.onboardingService.setupLinkedAccount(id);
  }

  @Get(':id/payment/status')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({
    description: 'Payment status information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        canReceivePayments: { type: 'boolean' },
        linkedAccountId: { type: 'string' },
        error: { type: 'string' },
        setupAttempts: { type: 'number' },
        lastAttempt: { type: 'string' }
      }
    }
  })
  async getPaymentStatus(@Param('id') id: string) {
    const restaurant = await this.restaurantsService.findById(id);

    return {
      status: restaurant.paymentConfig?.status || 'pending_setup',
      canReceivePayments: restaurant.paymentConfig?.canReceivePayments || false,
      linkedAccountId: restaurant.paymentConfig?.linkedAccountId,
      error: restaurant.paymentConfig?.error,
      setupAttempts: restaurant.paymentConfig?.setupAttempts || 0,
      lastAttempt: restaurant.paymentConfig?.lastAttempt?.toISOString(),
    };
  }

  @Post(':id/cashfree/vendor/onboard')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({
    description: 'Cashfree vendor onboarding response',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        vendorId: { type: 'string' },
        status: { type: 'string' },
        kycStatus: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async onboardToCashfree(
    @Param('id') restaurantId: string,
    @Body() body: {
      scheduleOption?: number; // Settlement schedule (default: 17 for instant per minute)
      forceUpdate?: boolean;
    }
  ) {
    const result = await this.cashfreeVendorService.onboardRestaurantToCashfree({
      restaurantId,
      scheduleOption: body.scheduleOption || 1,
      forceUpdate: body.forceUpdate || false,
    });

    return {
      success: true,
      vendorId: result.vendorId,
      status: result.status,
      kycStatus: result.kycStatus,
    };
  }

  @Get(':id/cashfree/vendor/status')
  @Roles(UserRole.Manager, UserRole.Chef, UserRole.Waiter, UserRole.Cashier)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({
    description: 'Cashfree vendor status',
    schema: {
      type: 'object',
      properties: {
        hasVendor: { type: 'boolean' },
        vendorId: { type: 'string' },
        status: { type: 'string' },
        kycStatus: { type: 'string' },
        canReceiveSettlements: { type: 'boolean' },
        scheduleOption: {
          type: 'object',
          properties: {
            scheduleId: { type: 'number' },
            settlementScheduleMessage: { type: 'string' }
          }
        },
        error: { type: 'string' }
      }
    }
  })
  async getCashfreeVendorStatus(@Param('id') restaurantId: string) {
    const status = await this.cashfreeVendorService.getRestaurantVendorStatus(restaurantId);

    if (!status) {
      return {
        hasVendor: false,
        canReceiveSettlements: false,
      };
    }

    return {
      hasVendor: true,
      vendorId: status.vendorId,
      status: status.status,
      kycStatus: status.kycStatus,
      canReceiveSettlements: status.status === 'ACTIVE',
      scheduleOption: status.scheduleOption,
    };
  }

  @Post(':id/cashfree/vendor/sync')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({
    description: 'Sync vendor status with Cashfree',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        vendorId: { type: 'string' },
        status: { type: 'string' },
        kycStatus: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  async syncCashfreeVendorStatus(@Param('id') restaurantId: string) {
    const syncResult = await this.cashfreeVendorService.getRestaurantVendorStatus(restaurantId);

    if (!syncResult) {
      return {
        success: false,
        message: 'No vendor found for this restaurant',
      };
    }

    return {
      success: true,
      vendorId: syncResult.vendorId,
      status: syncResult.status,
      kycStatus: syncResult.kycStatus,
      message: 'Vendor status synced successfully',
    };
  }

  @Post(':id/cashfree/vendor/verify-bank')
  @Roles(UserRole.Manager)
  @ApiParam({ name: 'id', description: 'Restaurant ID' })
  @ApiOkResponse({
    description: 'Verify vendor bank account',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        vendorId: { type: 'string' },
        verificationStatus: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async verifyCashfreeVendorBankAccount(@Param('id') restaurantId: string) {
    return this.cashfreeVendorService.verifyRestaurantBankAccount(restaurantId);
  }
}
