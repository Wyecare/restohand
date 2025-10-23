export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface RestaurantUpiConfig {
  vpa: string;
  displayName: string;
  mode: 'static' | 'dynamic';
}

export interface RestaurantAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Restaurant {
  id: string;
  name: string;
  legalName?: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone: string;
  address: RestaurantAddress;
  upi: RestaurantUpiConfig;
  languages: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  tableNumber: string;
  displayName?: string;
  capacity?: number;
  zone?: string;
  displayOrder: number;
  isActive: boolean;
  layoutX?: number;
  layoutY?: number;
  layoutWidth?: number;
  layoutHeight?: number;
  layoutRotation?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemPricing {
  amount: number;
  currency: string;
  isTaxInclusive?: boolean;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId?: string;
  name: string;
  description?: string;
  pricing: MenuItemPricing;
  tags: string[];
  isAvailable: boolean;
  displayOrder: number;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type OrderProgressStage = 0 | 40 | 60 | 100;

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface OrderItemPricing {
  unitAmount: number;
  currency: string;
  taxAmount?: number;
  discountAmount?: number;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  pricing: OrderItemPricing;
  notes?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  sessionId?: string;
  createdBy?: string;
  orderNumber: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'upi' | 'cash';
  progress: OrderProgressStage;
  items: OrderItem[];
  subTotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  statusNote?: string;
  paidAt?: string;
  readyAt?: string;
  paymentProvider?: string;
  paymentTransactionId?: string;
  paymentIntentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> extends PaginationMeta {
  data: T[];
}

export interface SessionInfo {
  restaurantId: string;
  roles: string[];
  userId: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  roles: string[];
  isActive: boolean;
  restaurantId: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface StaffInviteResponse {
  staff: StaffMember;
  temporaryPin: string;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  description?: string;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    pricing: MenuItemPricing;
    tags: string[];
    imageUrls: string[];
  }>;
}

export interface PublicMenuPayload {
  categories: PublicMenuCategory[];
  uncategorised: Array<{
    id: string;
    name: string;
    description?: string;
    pricing: MenuItemPricing;
    tags: string[];
    imageUrls: string[];
  }>;
}

export interface RestaurantQrCodeResponse {
  restaurant: Restaurant;
  table: string | null;
  url: string;
  dataUrl: string;
}

export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone: string;
  upi: Restaurant['upi'];
  languages: string[];
}

export interface PublicOrder {
  id: string;
  restaurantSlug: string;
  orderNumber: string;
  status: Order['status'];
  paymentStatus: Order['paymentStatus'];
  paymentMethod: Order['paymentMethod'];
  progress: Order['progress'];
  tableNumber?: string;
  customerName?: string;
  totalAmount: number;
  createdAt: string;
  readyAt?: string;
  paidAt?: string;
  items: Array<{
    name: string;
    quantity: number;
    pricing: MenuItemPricing;
  }>;
}
