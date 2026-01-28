// Core API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Authentication & Session Types
export interface SessionInfo {
  id: string;
  userId: string;
  restaurantId?: string;
  branchId?: string;
  roles: string[];
  permissions: string[];
  displayName?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  isActive: boolean;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  restaurantId: string;
  branchId?: string;
  name: string;
  email?: string;
  phone: string;
  roles: string[];
  pin?: string;
  isActive: boolean;
  invitationStatus?: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  updatedAt: string;
}

// Order Types
export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  branchId?: string;
  sessionId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'upi' | 'cash' | 'card';
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  notes?: string;
  progress?: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  estimatedPrepTime?: number;
  actualPrepTime?: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxAmount: number;
  notes?: string;
  status?: 'pending' | 'preparing' | 'ready';
  customizations?: {
    addons?: Array<{ id: string; name: string; price: number }>;
    variants?: Array<{ id: string; name: string; price: number }>;
    notes?: string;
  };
}

// Restaurant & Table Types
export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  address?: any;
  phone?: string;
  email?: string;
  gstin?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  branchId?: string;
  tableNumber: string;
  displayName?: string;
  capacity?: number;
  zone?: string;
  isActive: boolean;
  qrCode?: string;
  position?: {
    x: number;
    y: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedRestaurantTable extends RestaurantTable {
  activeOrder?: Order;
  currentStatus?: {
    id: string;
    status: 'available' | 'occupied' | 'cleaning' | 'reserved';
    assignedServerId?: string;
    assignedServerName?: string;
    updatedAt: string;
  };
}

// Kitchen Types
export type StationType = 'grill' | 'fryer' | 'salad' | 'beverage' | 'dessert' | 'preparation';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface KitchenStation {
  id: string;
  restaurantId: string;
  branchId?: string;
  name: string;
  type: StationType;
  capacity: number;
  isActive: boolean;
  avgPrepTime: number;
  todayOrdersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenStationMetrics extends KitchenStation {
  completedToday: number;
  utilizationRate: number;
  todayAvgPrepTime: number;
  currentLoad: number;
}

export interface OrderStationAssignment {
  id: string;
  orderId: string;
  orderNumber: string;
  stationId: string;
  status: AssignmentStatus;
  estimatedPrepTime: number;
  actualPrepTime?: number;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  menuItemIds: string[];
}

export interface CreateKitchenStationRequest {
  name: string;
  type: StationType;
  capacity: number;
  avgPrepTime: number;
}

export interface UpdateKitchenStationRequest extends Partial<CreateKitchenStationRequest> {
  isActive?: boolean;
}

export interface AssignOrderToStationRequest {
  stationId: string;
  menuItemIds: string[];
  estimatedPrepTime: number;
}

// Order Modification Types
export type ModificationType = 'add_item' | 'remove_item' | 'modify_quantity' | 'special_request' | 'cancel_item';
export type ModificationStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface OrderModification {
  id: string;
  orderId: string;
  type: ModificationType;
  status: ModificationStatus;
  requestedBy: string;
  description: string;
  items?: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  reason?: string;
  approvedBy?: string;
  rejectedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderModificationRequest {
  orderId: string;
  type: ModificationType;
  description: string;
  items?: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ProcessOrderModificationRequest {
  action: 'approve' | 'reject';
  reason?: string;
}

// Public API interfaces for customer-facing endpoints
export interface PublicMenuCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
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

export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone: string;
  upi: RestaurantUpiConfig;
  languages: string[];
  settings: RestaurantSettings;
}

export interface PublicOrder {
  id: string;
  restaurantSlug: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'upi' | 'cash';
  progress: OrderProgressStage;
  tableNumber?: string;
  customerName?: string;
  subTotalAmount: number;
  grossAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountAmount: number;
  roundOffAmount: number;
  taxType?: 'intra-state' | 'inter-state';
  totalAmount: number;
  createdAt: string;
  readyAt?: string;
  paidAt?: string;
  items: Array<{
    name: string;
    quantity: number;
    pricing: MenuItemPricing;
    gst?: OrderItemGst;
  }>;
}