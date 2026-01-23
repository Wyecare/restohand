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
  branchId?: string;
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

// Enhanced table status system for Command Center
export enum TableStatusType {
  Available = 'available',
  Occupied = 'occupied',
  Reserved = 'reserved',
  Cleaning = 'cleaning',
}

export interface TableStatus {
  id: string;
  restaurantId: string;
  tableId: string;
  status: TableStatusType;
  occupiedSince?: string;
  availableSince?: string;
  cleaningSince?: string;
  reservedFrom?: string;
  reservedUntil?: string;
  assignedServerId?: string;
  assignedServerName?: string;
  currentPartySize?: number;
  currentBillAmount?: number;
  notes?: string;
  reservationCustomerName?: string;
  reservationCustomerPhone?: string;
  reservationEstimatedDuration?: number;
  reservationSpecialRequests?: string;
  reservationNotes?: string;
  lastStatusChange?: string;
  lastUpdatedBy?: string;
  lastUpdatedByName?: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields for UI
  timeSinceLastChange?: number;
  occupiedDuration?: number;
  statusColor?: 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'grey';
}

export interface UpdateTableStatusPayload {
  status: TableStatusType;
  assignedServerId?: string;
  currentPartySize?: number;
  notes?: string;
  reservationCustomerName?: string;
  reservationCustomerPhone?: string;
  reservedFrom?: string;
  reservedUntil?: string;
  reservationEstimatedDuration?: number;
  reservationSpecialRequests?: string;
  reservationNotes?: string;
}

export interface TableStatusStats {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  cleaningTables: number;
  averageOccupancyTime: number;
  totalRevenue: number;
}

// Zone Management Types
export interface ZoneResponse {
  id: string;
  name: string;
  branchId?: string;
  tableCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ZonesListResponse {
  zones: ZoneResponse[];
}

export interface CreateZonePayload {
  name: string;
}

export interface UpdateZonePayload {
  name: string;
}

export interface BulkUpdateZonesPayload {
  zones: string[];
}

export interface EnhancedRestaurantTable {
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
  // Enhanced with current status
  currentStatus?: TableStatus;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  branchId?: string;
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
  branchId?: string;
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
  branchId?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  displayName?: string; // For backward compatibility
  email?: string;
  phoneNumber?: string;
  photoURL?: string; // For avatar display
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

// Order Modification System Types
export enum ModificationType {
  ADD_ITEM = 'add_item',
  REMOVE_ITEM = 'remove_item',
  UPDATE_QUANTITY = 'update_quantity',
  UPDATE_NOTES = 'update_notes',
  CANCEL_ORDER = 'cancel_order',
}

export enum ModificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPLIED = 'applied',
}

export interface ModificationItemData {
  menuItemId?: string;
  name?: string;
  quantity?: number;
  unitAmount?: number;
  notes?: string;
  originalQuantity?: number;
  newQuantity?: number;
}

export interface OrderModification {
  id: string;
  orderId: string;
  restaurantId: string;
  orderNumber: string;
  type: ModificationType;
  status: ModificationStatus;
  itemData?: ModificationItemData;
  reason?: string;
  customerNotes?: string;
  amountDifference: number;
  requestedBy?: string;
  processedBy?: string;
  processedAt?: string;
  appliedAt?: string;
  rejectionReason?: string;
  notifyKitchen: boolean;
  kitchenNotified: boolean;
  kitchenNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderModificationRequest {
  orderId: string;
  type: ModificationType;
  itemData?: ModificationItemData;
  reason?: string;
  customerNotes?: string;
  notifyKitchen?: boolean;
}

export interface ProcessOrderModificationRequest {
  status: ModificationStatus.APPROVED | ModificationStatus.REJECTED | ModificationStatus.APPLIED;
  rejectionReason?: string;
  amountDifference?: number;
}

// Kitchen Station Management Types
export enum StationType {
  GRILL = 'grill',
  FRYER = 'fryer',
  SALAD = 'salad',
  BEVERAGE = 'beverage',
  DESSERT = 'dessert',
  PREPARATION = 'preparation',
  GENERAL = 'general',
}

export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export interface KitchenStation {
  id: string;
  restaurantId: string;
  name: string;
  type: StationType;
  description?: string;
  capacity: number;
  isActive: boolean;
  displayOrder: number;
  currentLoad: number;
  avgPrepTime: number;
  todayOrdersCount: number;
  todayAvgPrepTime: number;
  lastOrderAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStationAssignment {
  id: string;
  orderId: string;
  restaurantId: string;
  orderNumber: string;
  stationId: string;
  stationName: string;
  status: AssignmentStatus;
  estimatedPrepTime: number;
  startedAt?: string;
  completedAt?: string;
  actualPrepTime?: number;
  notes?: string;
  menuItemIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KitchenStationMetrics extends KitchenStation {
  completedToday: number;
  utilizationRate: number;
}

export interface CreateKitchenStationRequest {
  name: string;
  type: StationType;
  description?: string;
  capacity?: number;
  displayOrder?: number;
  avgPrepTime?: number;
}

export interface UpdateKitchenStationRequest {
  name?: string;
  description?: string;
  capacity?: number;
  isActive?: boolean;
  displayOrder?: number;
  avgPrepTime?: number;
}

export interface AssignOrderToStationRequest {
  stationId: string;
  menuItemIds: string[];
  estimatedPrepTime?: number;
  notes?: string;
}
