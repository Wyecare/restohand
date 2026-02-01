import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthService, AuthResult, SuperAdminAuthResult } from './jwt-auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly jwtAuthService: JwtAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResult> {
    return this.jwtAuthService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResult> {
    return this.jwtAuthService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResult> {
    return this.jwtAuthService.refreshToken(refreshTokenDto.refresh_token);
  }

  // Super Admin Authentication
  @Post('super-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin login with email and password' })
  @ApiResponse({ status: 200, description: 'Super Admin login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or not a super admin' })
  async superAdminLogin(@Body() loginDto: LoginDto): Promise<SuperAdminAuthResult> {
    return this.jwtAuthService.superAdminLogin(loginDto);
  }

  @Post('super-admin/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh super admin access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async superAdminRefresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResult> {
    return this.jwtAuthService.refreshToken(refreshTokenDto.refresh_token);
  }

  @Post('super-admin/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async superAdminLogout(): Promise<{ success: boolean }> {
    // For JWT tokens, logout is typically handled on the client side
    // by removing the token from storage. Server-side logout would
    // require token blacklisting which can be implemented if needed.
    return { success: true };
  }
}