import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    AuthModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret:
          process.env.JWT_SECRET ||
          'your-super-secret-jwt-key-change-this-in-production',
        signOptions: {
          expiresIn: process.env.JWT_ACCESS_TTL || '30d',
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}