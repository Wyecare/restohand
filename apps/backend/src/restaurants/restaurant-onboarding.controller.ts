import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RestaurantOnboardingService, RestaurantOnboardingData } from './restaurant-onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Restaurant Onboarding')
@Controller('restaurants/onboard')
@UseGuards(JwtAuthGuard)
export class RestaurantOnboardingController {
  constructor(
    private readonly restaurantOnboardingService: RestaurantOnboardingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Onboard new restaurant with SaaS setup' })
  @ApiResponse({
    status: 201,
    description: 'Restaurant onboarded successfully with direct settlement',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        saasConfig: {
          type: 'object',
          properties: {
            plan: { type: 'string' },
            subscriptionStatus: { type: 'string' },
            trialEndsAt: { type: 'string', format: 'date-time' },
            monthlyPrice: { type: 'number' },
          },
        },
        paymentConfig: {
          type: 'object',
          properties: {
            linkedAccountId: { type: 'string' },
            canReceivePayments: { type: 'boolean' },
            directSettlement: { type: 'boolean' },
          },
        },
      },
    },
  })
  async onboardRestaurant(
    @Request() req: any,
    @Body() onboardingData: RestaurantOnboardingData,
  ) {
    const ownerId = req.user?.uid;

    if (!ownerId) {
      throw new Error('User ID not found in request');
    }

    const restaurant = await this.restaurantOnboardingService.onboardRestaurant(
      ownerId,
      onboardingData,
    );

    return {
      message: 'Restaurant onboarded successfully with SaaS model',
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        saasConfig: restaurant.saasConfig,
        paymentConfig: restaurant.paymentConfig,
      },
    };
  }
}