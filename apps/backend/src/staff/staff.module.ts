import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaffInvitation, StaffInvitationSchema } from './schemas/staff-invitation.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { StaffInvitationService } from './staff-invitation.service';
import { StaffInvitationController, PublicStaffInvitationController } from './staff-invitation.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StaffInvitation.name, schema: StaffInvitationSchema },
      { name: User.name, schema: UserSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
    ]),
    UsersModule,
    AuthModule,
  ],
  controllers: [StaffInvitationController, PublicStaffInvitationController],
  providers: [StaffInvitationService],
  exports: [StaffInvitationService],
})
export class StaffModule {}