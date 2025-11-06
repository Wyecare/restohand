export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
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

export interface RestaurantSettings {
  orderNumberPrefix: string;
  currency: string;
  locale: string;
  enableTax: boolean;
  selfOrderingEnabled: boolean;
}

export interface PaymentConfig {
  linkedAccountId?: string;
  razorpayContactId?: string;
  razorpayFundAccountId?: string;
  canReceivePayments: boolean;
  directSettlement: boolean;
  settlementType: 'instant' | 'scheduled' | 'transfers';
  status: 'pending_setup' | 'pending_approval' | 'approved' | 'rejected' | 'suspended' | 'route_not_available';
  error?: string;
  setupAttempts: number;
  lastAttempt?: string;
  approvedAt?: string;
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
  settings: RestaurantSettings;
  languages: string[];
  gstin?: string;
  applyDefaultGstToMenuItems: boolean;
  isActive: boolean;
  paymentConfig?: PaymentConfig;
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
  activeOrder?: Order;
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
  hsnCode?: string;
  gstRateId?: string;
  gstRate?: number;
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

export interface OrderItemGst {
  hsnCode?: string;
  gstRateId?: string;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  taxableAmount: number;
  totalWithTax: number;
  grossAmount: number;
  isTaxInclusive: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  pricing: OrderItemPricing;
  gst?: OrderItemGst;
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
  customerEmail?: string;
  customerGstin?: string;
  customerState?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'upi' | 'cash';
  progress: OrderProgressStage;
  items: OrderItem[];
  subTotalAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountAmount: number;
  grossAmount: number;
  totalAmount: number;
  roundOffAmount: number;
  taxType?: 'intra-state' | 'inter-state';
  notes?: string;
  statusNote?: string;
  paidAt?: string;
  readyAt?: string;
  paymentProvider?: string;
  paymentTransactionId?: string;
  razorpayOrderId?: string;
  paymentMeta?: Record<string, unknown>;
  paymentIntentUrl?: string;
  taxInvoiceNumber?: string;
  taxInvoiceGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
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

export interface ServiceTablesStats {
  totalTables: number;
  occupiedTables: number;
  activeOrders: number;
  readyOrders: number;
  unpaidOrders: number;
  todaysRevenue: number;
}

export interface ServiceTablesResponse {
  tables: RestaurantTable[];
  stats: ServiceTablesStats;
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
  settings: RestaurantSettings;
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
