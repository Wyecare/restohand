import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlan, SubscriptionPlanSchema } from './schemas/subscription-plan.schema';
import { CashfreeModule } from '../payments/cashfree.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
    CashfreeModule,
  ],
  providers: [SubscriptionPlansService],
  exports: [SubscriptionPlansService],
})
export class SubscriptionPlansModule {}