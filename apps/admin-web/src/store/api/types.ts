// Super Admin Auth Types
export interface SuperAdminLoginPayload {
  email: string;
  password: string;
}

export interface SuperAdminLoginResponse {
  token: string;
  user: SuperAdminUser;
  expiresIn?: number;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

// Dashboard Types
export interface DashboardOverview {
  totalRestaurants: number;
  totalOrders: number;
  pendingSettlements: number;
  lastUpdated: string;
}

// Restaurant Types
export interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  isActive: boolean;
  createdAt: string;
}

export interface RestaurantDetails extends Restaurant {
  orderStats: {
    [status: string]: number;
  };
  revenue: number;
}

export interface PaginatedRestaurants {
  restaurants: Restaurant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Settlement Types
export interface PendingSettlement {
  restaurantId: string;
  restaurantName: string;
  orderCount: number;
  totalAmount: number;
  oldestOrder: string;
  latestOrder: string;
}

export interface SettlementCalculation {
  restaurantId: string;
  orderCount: number;
  totalAmount: number;
  commission: number;
  netAmount: number;
  orderIds: string[];
}

export interface SettlementExecution {
  success: boolean;
  message: string;
  settlementId: string;
}

export interface SettlementHistory {
  id: string;
  restaurantId: string;
  restaurantName: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  executedBy?: string;
}

export interface PaginatedSettlements {
  settlements: SettlementHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Analytics Types
export interface AnalyticsOverview {
  dailyOrders: DailyOrderStat[];
  monthlyRevenue: MonthlyRevenueStat[];
  topRestaurants: TopRestaurant[];
}

export interface DailyOrderStat {
  _id: string; // date in YYYY-MM-DD format
  orderCount: number;
  revenue: number;
}

export interface MonthlyRevenueStat {
  _id: string; // date in YYYY-MM format
  revenue: number;
}

export interface TopRestaurant {
  restaurantName: string;
  orderCount: number;
  revenue: number;
}

// Super Admin Management Types
export interface CreateSuperAdminPayload {
  email: string;
  name: string;
  password: string;
}

export interface SuperAdminListResponse {
  superAdmins: SuperAdminUser[];
}

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}