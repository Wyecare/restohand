import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RestaurantOnboardingService, CreateLinkedAccountDto, LinkedAccountResponse } from '../restaurants/restaurant-onboarding.service';

@ApiTags('payments')
@Controller('restaurants/:restaurantId/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly restaurantOnboardingService: RestaurantOnboardingService
  ) {}

  @Post('setup-direct-settlement')
  @ApiParam({ name: 'restaurantId' })
  @ApiCreatedResponse({
    description: 'Linked account created successfully',
    schema: {
      properties: {
        accountId: { type: 'string' },
        status: { type: 'string' },
        referenceId: { type: 'string' },
        canReceivePayments: { type: 'boolean' },
        activationUrl: { type: 'string' }
      }
    }
  })
  @Roles(UserRole.Manager)
  async setupDirectSettlement(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: { email?: string; phone?: string; businessType?: string }
  ): Promise<LinkedAccountResponse> {
    const createDto: CreateLinkedAccountDto = {
      restaurantId,
      email: dto.email,
      phone: dto.phone,
      businessType: dto.businessType as any
    };

    return this.restaurantOnboardingService.createLinkedAccount(createDto);
  }

  @Get('settlement-status')
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({
    description: 'Settlement status retrieved successfully',
    schema: {
      properties: {
        accountId: { type: 'string' },
        status: { type: 'string' },
        referenceId: { type: 'string' },
        canReceivePayments: { type: 'boolean' }
      }
    }
  })
  @Roles(UserRole.Manager, UserRole.Waiter)
  async getSettlementStatus(
    @Param('restaurantId') restaurantId: string
  ): Promise<LinkedAccountResponse | null> {
    return this.restaurantOnboardingService.getLinkedAccountStatus(restaurantId);
  }

  @Get('can-receive-payments')
  @ApiParam({ name: 'restaurantId' })
  @ApiOkResponse({
    description: 'Payment capability status',
    schema: {
      properties: {
        canReceivePayments: { type: 'boolean' }
      }
    }
  })
  async canReceivePayments(
    @Param('restaurantId') restaurantId: string
  ): Promise<{ canReceivePayments: boolean }> {
    const canReceivePayments = await this.restaurantOnboardingService.canReceivePayments(restaurantId);
    return { canReceivePayments };
  }
}