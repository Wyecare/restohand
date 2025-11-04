import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from './schemas/user.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { UsersService } from './users.service';
import { StaffQrService } from './staff-qr.service';
import { UsersController } from './users.controller';
import { StaffAuthController } from './staff-auth.controller';
import { StaffSignupController } from './staff-signup.controller';
import { SmsService } from '../common/services/sms.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
  ],
  controllers: [UsersController, StaffAuthController, StaffSignupController],
  providers: [UsersService, StaffQrService, SmsService],
  exports: [UsersService, StaffQrService],
})
export class UsersModule {}
