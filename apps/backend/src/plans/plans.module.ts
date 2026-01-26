import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { RazorpayService } from '../payments/razorpay.service';

@Module({
  controllers: [PlansController],
  providers: [RazorpayService],
  exports: [],
})
export class PlansModule {}