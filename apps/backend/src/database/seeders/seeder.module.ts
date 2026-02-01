import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminSeeder } from './super-admin.seeder';
import { User, UserSchema } from '../../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }
    ]),
  ],
  providers: [SuperAdminSeeder],
  exports: [SuperAdminSeeder],
})
export class SeederModule {}