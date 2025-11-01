import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { RestaurantOnboardingController } from './restaurant-onboarding.controller';
import { RestaurantOnboardingService } from './restaurant-onboarding.service';
import { PaymentsController } from '../payments/payments.controller';
import { RazorpayService } from '../payments/razorpay.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [RestaurantsController, RestaurantOnboardingController, PaymentsController],
  providers: [RestaurantsService, RestaurantOnboardingService, RazorpayService],
  exports: [RestaurantsService, RestaurantOnboardingService],
})
export class RestaurantsModule {}
