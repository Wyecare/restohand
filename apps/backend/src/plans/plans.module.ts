import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlanCacheService } from '../subscriptions/plan-cache.service';
import { RazorpayService } from '../payments/razorpay.service';

@Module({
  controllers: [PlansController],
  providers: [PlanCacheService, RazorpayService],
  exports: [PlanCacheService],
})
export class PlansModule {}