import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { jwtConfig } from '../config/jwt.config';
import { User, UserSchema } from '../users/schemas/user.schema';
import { JwtAuthService } from './jwt-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthController } from './auth.controller';

// Keep Firebase imports for gradual migration
import { firebaseConfig } from '../config/firebase.config';
import { firebaseProviders } from './firebase-admin.provider';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(firebaseConfig), // Keep for gradual migration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        secret:
          process.env.JWT_SECRET ||
          'your-super-secret-jwt-key-change-this-in-production',
        signOptions: {
          expiresIn: process.env.JWT_ACCESS_TTL || '30d',
        },
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController],
  providers: [
    // New JWT-based providers
    JwtAuthService,
    JwtAuthGuard,
    RolesGuard,
    // Keep Firebase providers for gradual migration
    ...firebaseProviders,
    AuthService,
    FirebaseAuthGuard,
  ],
  exports: [
    // Export both new and old providers during migration
    JwtAuthService,
    JwtAuthGuard,
    RolesGuard,
    // Legacy exports
    ...firebaseProviders,
    AuthService,
    FirebaseAuthGuard,
  ],
})
export class AuthModule {}
