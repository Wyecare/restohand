import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from './schemas/user.schema';
import { Restaurant, RestaurantSchema } from '../restaurants/schemas/restaurant.schema';
import { StaffInvitation, StaffInvitationSchema } from './schemas/staff-invitation.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { UsersService } from './users.service';
import { StaffQrService } from './staff-qr.service';
import { StaffInvitationService } from './staff-invitation.service';
import { BranchPermissionsService } from './branch-permissions.service';
import { UsersController, PublicStaffInvitationController } from './users.controller';
import { StaffAuthController } from './staff-auth.controller';
import { StaffSignupController } from './staff-signup.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: StaffInvitation.name, schema: StaffInvitationSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
  ],
  controllers: [UsersController, PublicStaffInvitationController, StaffAuthController, StaffSignupController],
  providers: [UsersService, StaffQrService, StaffInvitationService, BranchPermissionsService],
  exports: [UsersService, StaffQrService, StaffInvitationService, BranchPermissionsService],
})
export class UsersModule {}
