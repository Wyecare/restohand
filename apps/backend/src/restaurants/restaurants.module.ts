import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { GstModule } from '../gst/gst.module';
import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { KitchenStation, KitchenStationSchema } from './schemas/kitchen-station.schema';
import { OrderStationAssignment, OrderStationAssignmentSchema } from '../orders/schemas/order-station-assignment.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { RestaurantOnboardingController } from './restaurant-onboarding.controller';
import { RestaurantOnboardingService } from './restaurant-onboarding.service';
import { KitchenStationController } from './kitchen-station.controller';
import { KitchenStationService } from './kitchen-station.service';
import { PaymentsController } from '../payments/payments.controller';
import { RazorpayService } from '../payments/razorpay.service';
import { CashfreeModule } from '../payments/cashfree.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => UsersModule), // Break circular dependency with UsersModule
    GstModule,
    forwardRef(() => CashfreeModule),
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: KitchenStation.name, schema: KitchenStationSchema },
      { name: OrderStationAssignment.name, schema: OrderStationAssignmentSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [RestaurantsController, RestaurantOnboardingController, KitchenStationController, PaymentsController],
  providers: [RestaurantsService, RestaurantOnboardingService, KitchenStationService, RazorpayService],
  exports: [RestaurantsService, RestaurantOnboardingService, KitchenStationService, RazorpayService],
})
export class RestaurantsModule {}
