import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserRole } from '../../common/enums/user-role.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SuperAdminSeeder {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async seed() {
    const superAdmins = [
      {
        email: 'admin@restohand.com',
        name: 'Super Admin',
        password: 'testing@123',
        roles: [UserRole.SuperAdmin],
      },
      {
        email: 'anandhu@restohand.com',
        name: 'Anandhu Satheesh',
        password: 'testing@123',
        roles: [UserRole.SuperAdmin],
      },
    ];

    for (const adminData of superAdmins) {
      try {
        // Check if admin already exists
        const existingAdmin = await this.userModel.findOne({
          email: adminData.email,
        });

        if (existingAdmin) {
          this.logger.log(`Super admin already exists: ${adminData.email}`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminData.password, 12);

        // Create super admin
        const superAdmin = new this.userModel({
          ...adminData,
          password: hashedPassword,
          restaurantId: null, // No restaurant association
          isActive: true,
          emailVerified: true,
          phoneVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await superAdmin.save();

        this.logger.log(`✅ Super admin created: ${adminData.email}`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to create super admin ${adminData.email}:`,
          error
        );
      }
    }

    this.logger.log('Super admin seeding completed');
  }

  async removeAll() {
    try {
      const result = await this.userModel.deleteMany({
        roles: { $in: [UserRole.SuperAdmin] },
      });

      this.logger.log(`🗑️ Removed ${result.deletedCount} super admins`);
    } catch (error) {
      this.logger.error('Failed to remove super admins:', error);
    }
  }
}
