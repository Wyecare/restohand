import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { firebaseProviders } from './firebase-admin.provider';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [ConfigModule],
  providers: [...firebaseProviders, AuthService, FirebaseAuthGuard, RolesGuard],
  exports: [AuthService, FirebaseAuthGuard, RolesGuard],
})
export class AuthModule {}
