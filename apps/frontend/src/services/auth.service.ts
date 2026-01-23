import axios from 'axios';

import { env } from '@/config/env';

export const API_BASE_URL = env.apiBaseUrl.replace(/\/$/, '');

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  roles?: string[];
  restaurantId?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    uid: string;
    email?: string;
    phoneNumber?: string;
    displayName?: string;
    photoURL?: string;
    roles: string[];
    restaurantId?: string;
    branchId?: string;
    claims: Record<string, unknown>;
  };
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

class AuthService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${this.baseURL}/auth/login`,
      credentials
    );
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${this.baseURL}/auth/register`,
      userData
    );
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${this.baseURL}/auth/refresh`,
      {
        refresh_token: refreshToken,
      }
    );
    return response.data;
  }

  // Helper methods for token management
  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const authService = new AuthService();
