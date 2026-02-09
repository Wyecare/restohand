import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

// Schema imports
import { SubscriptionPlan, SubscriptionPlanSchema } from './schemas/subscription-plan.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';

// Service imports
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionEnforcementService } from './subscription-enforcement.service';
import { SubscriptionAssignmentService } from './subscription-assignment.service';

// Controller imports
import { SubscriptionStatusController } from './subscription-status.controller';
import { AdminSubscriptionPlansController } from './admin-subscription-plans.controller';

// Guard imports
import { SubscriptionLimitGuard } from './guards/subscription-limit.guard';
import { FeatureAccessGuard } from './guards/feature-access.guard';

// External dependencies
import { CashfreeModule } from '../payments/cashfree.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    ConfigModule,
    AuthModule, // For JwtAuthService dependency in global context
    forwardRef(() => CashfreeModule), // For CashfreeService dependency
  ],
  controllers: [SubscriptionStatusController, AdminSubscriptionPlansController],
  providers: [
    SubscriptionPlansService,
    SubscriptionEnforcementService,
    SubscriptionAssignmentService,
    SubscriptionLimitGuard,
    FeatureAccessGuard,
  ],
  exports: [
    SubscriptionPlansService,
    SubscriptionEnforcementService,
    SubscriptionAssignmentService,
    SubscriptionLimitGuard,
    FeatureAccessGuard,
  ],
})
export class SubscriptionPlansModule {
  static forRoot() {
    return {
      module: SubscriptionPlansModule,
      global: true,
    };
  }
}