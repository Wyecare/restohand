# RestoHand POS - Implementation Recommendations

## Overview
This document provides detailed technical implementation recommendations for completing RestoHand's transformation into a comprehensive POS system that matches and exceeds Foodics capabilities.

---

## PHASE 1: CRITICAL POS FOUNDATIONS (Months 1-4)

### 1. Customer Management System (Month 1-2)

#### Backend Implementation

**1.1 Customer Schema Design**
```typescript
// apps/backend/src/customers/schemas/customer.schema.ts
@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ required: true, unique: true, trim: true })
  phone!: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Branch' }] })
  frequentBranches!: string[];

  @Prop({ type: String, trim: true })
  address?: string;

  @Prop({ type: Date })
  dateOfBirth?: Date;

  @Prop({ type: String, enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop({ type: Number, default: 0, min: 0 })
  totalOrders!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalSpent!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  loyaltyPoints!: number;

  @Prop({ type: Date })
  lastVisitAt?: Date;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: SchemaTypes.Mixed })
  preferences?: {
    favoriteItems?: string[];
    allergies?: string[];
    dietaryRestrictions?: string[];
    preferredTable?: string;
  };
}
```

**1.2 Customer Service Implementation**
```typescript
// apps/backend/src/customers/customers.service.ts
@Injectable()
export class CustomersService {
  // Core CRUD operations
  async createCustomer(restaurantId: string, createCustomerDto: CreateCustomerDto)
  async findCustomers(restaurantId: string, query: CustomerQueryDto)
  async findCustomerById(restaurantId: string, customerId: string)
  async updateCustomer(restaurantId: string, customerId: string, updateCustomerDto: UpdateCustomerDto)
  async deleteCustomer(restaurantId: string, customerId: string)

  // Business logic
  async searchCustomers(restaurantId: string, searchTerm: string)
  async getCustomerOrderHistory(restaurantId: string, customerId: string)
  async updateCustomerStats(customerId: string, orderAmount: number)
  async addLoyaltyPoints(customerId: string, points: number)
  async redeemLoyaltyPoints(customerId: string, points: number)
  async getTopCustomers(restaurantId: string, limit: number)
  async getCustomerAnalytics(restaurantId: string, period: string)

  // Integration helpers
  async findOrCreateCustomer(restaurantId: string, phone: string, name?: string)
  async linkOrderToCustomer(orderId: string, customerId: string)
}
```

**1.3 API Endpoints**
```typescript
// apps/backend/src/customers/customers.controller.ts
@Controller('restaurants/:restaurantId/customers')
export class CustomersController {
  @Get() // GET /restaurants/:id/customers?search=&page=&limit=
  @Post() // POST /restaurants/:id/customers
  @Get(':customerId') // GET /restaurants/:id/customers/:customerId
  @Put(':customerId') // PUT /restaurants/:id/customers/:customerId
  @Delete(':customerId') // DELETE /restaurants/:id/customers/:customerId
  @Get(':customerId/orders') // GET /restaurants/:id/customers/:customerId/orders
  @Post(':customerId/loyalty/add') // POST /restaurants/:id/customers/:customerId/loyalty/add
  @Post(':customerId/loyalty/redeem') // POST /restaurants/:id/customers/:customerId/loyalty/redeem
}
```

#### Frontend Implementation

**1.4 Customer Management Pages**
```typescript
// apps/frontend/src/pages/customers/CustomersPage.tsx
// - Customer list with search, pagination, filters
// - Quick actions (call, email, view orders)
// - Bulk operations (export, delete, tag)

// apps/frontend/src/pages/customers/CustomerDetailPage.tsx
// - Customer profile with edit capabilities
// - Order history with filters
// - Loyalty points management
// - Customer preferences and notes

// apps/frontend/src/components/customers/CustomerSelector.tsx
// - Quick customer lookup for orders
// - Create new customer inline
// - Auto-complete search
```

**1.5 Order Integration**
```typescript
// Modify existing Order schema to reference Customer
@Prop({ type: SchemaTypes.ObjectId, ref: 'Customer', index: true })
customerId?: string;

// Migration script to convert existing customer data
// apps/backend/src/scripts/migrate-customers.ts
```

---

### 2. Shift and Till Management System (Month 2-3)

#### Backend Implementation

**2.1 Shift Schema Design**
```typescript
// apps/backend/src/shifts/schemas/shift.schema.ts
@Schema({ timestamps: true })
export class Shift {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', index: true })
  branchId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  userId!: string;

  @Prop({ type: String, required: true })
  shiftNumber!: string;

  @Prop({ type: Date, required: true })
  startTime!: Date;

  @Prop({ type: Date })
  endTime?: Date;

  @Prop({
    type: String,
    enum: ['active', 'closed', 'abandoned'],
    default: 'active',
    index: true
  })
  status!: string;

  @Prop({ type: Number, required: true, min: 0 })
  startingCash!: number;

  @Prop({ type: Number, min: 0 })
  endingCash?: number;

  @Prop({ type: Number, default: 0 })
  totalCashSales!: number;

  @Prop({ type: Number, default: 0 })
  totalDigitalSales!: number;

  @Prop({ type: Number, default: 0 })
  totalOrders!: number;

  @Prop({ type: Number, default: 0 })
  cashDiscrepancy?: number;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: SchemaTypes.Mixed })
  breakdown?: {
    cashPayments: number;
    upiPayments: number;
    cardPayments: number;
    refunds: number;
    voids: number;
  };
}
```

**2.2 Till Operations Schema**
```typescript
// apps/backend/src/shifts/schemas/till-operation.schema.ts
@Schema({ timestamps: true })
export class TillOperation {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Shift', index: true })
  shiftId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  userId!: string;

  @Prop({
    type: String,
    enum: ['cash_in', 'cash_out', 'payout', 'deposit', 'adjustment'],
    required: true
  })
  type!: string;

  @Prop({ type: Number, required: true })
  amount!: number;

  @Prop({ type: String, required: true, trim: true })
  reason!: string;

  @Prop({ type: String, trim: true })
  reference?: string;

  @Prop({ type: String, trim: true })
  notes?: string;
}
```

**2.3 Shift Service Implementation**
```typescript
// apps/backend/src/shifts/shifts.service.ts
@Injectable()
export class ShiftsService {
  async startShift(branchId: string, userId: string, startingCash: number)
  async endShift(shiftId: string, endingCash: number, notes?: string)
  async getCurrentShift(branchId: string, userId: string)
  async addTillOperation(shiftId: string, operation: CreateTillOperationDto)
  async getShiftSummary(shiftId: string)
  async getShiftReports(branchId: string, dateRange: { from: Date; to: Date })
  async calculateCashDiscrepancy(shiftId: string)
  async getActiveShifts(restaurantId: string)
  async forceCloseShift(shiftId: string, reason: string)
}
```

#### Frontend Implementation

**2.4 Shift Management UI**
```typescript
// apps/frontend/src/pages/shifts/ShiftDashboard.tsx
// - Current shift status
// - Quick till operations
// - Real-time sales summary

// apps/frontend/src/pages/shifts/StartShiftModal.tsx
// - Count starting cash
// - Shift start confirmation

// apps/frontend/src/pages/shifts/EndShiftModal.tsx
// - Count ending cash
// - Reconciliation summary
// - Cash discrepancy handling

// apps/frontend/src/pages/shifts/ShiftReportsPage.tsx
// - Historical shift data
// - Performance analytics
// - Export capabilities
```

---

### 3. Enhanced Order Management (Month 3)

#### Implementation Updates

**3.1 Order Source Tracking**
```typescript
// Add to existing Order schema
@Prop({
  type: String,
  enum: ['api', 'cashier', 'call_center', 'online', 'kiosk'],
  default: 'cashier',
  index: true
})
source!: string;

@Prop({ type: String, trim: true })
sourceDetails?: string; // API key, staff name, etc.
```

**3.2 Enhanced Order Service**
```typescript
// apps/backend/src/orders/orders.service.ts
// Add methods:
async exportOrders(restaurantId: string, filters: OrderExportDto)
async getOrdersSummary(restaurantId: string, filters: OrderSummaryDto)
async getOrderSources(restaurantId: string, period: string)
async bulkUpdateOrders(orderIds: string[], updates: BulkOrderUpdateDto)
```

**3.3 Order Export System**
```typescript
// apps/backend/src/orders/order-export.service.ts
@Injectable()
export class OrderExportService {
  async exportToCsv(orders: Order[]): Promise<Buffer>
  async exportToPdf(orders: Order[]): Promise<Buffer>
  async exportToExcel(orders: Order[]): Promise<Buffer>
  async scheduleReport(restaurantId: string, config: ReportScheduleDto)
}
```

---

### 4. Audit Trail System (Month 4)

#### Backend Implementation

**4.1 Audit Log Schema**
```typescript
// apps/backend/src/audit/schemas/audit-log.schema.ts
@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', index: true })
  branchId?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  userId?: string;

  @Prop({ type: String, required: true, trim: true })
  action!: string; // 'create', 'update', 'delete', 'login', 'logout'

  @Prop({ type: String, required: true, trim: true })
  entity!: string; // 'order', 'customer', 'menu_item', 'user'

  @Prop({ type: String, trim: true })
  entityId?: string;

  @Prop({ type: SchemaTypes.Mixed })
  changes?: {
    before?: any;
    after?: any;
  };

  @Prop({ type: String, trim: true })
  ipAddress?: string;

  @Prop({ type: String, trim: true })
  userAgent?: string;

  @Prop({ type: String, trim: true })
  sessionId?: string;

  @Prop({ type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' })
  severity!: string;

  @Prop({ type: String, trim: true })
  description?: string;
}
```

**4.2 Audit Service Implementation**
```typescript
// apps/backend/src/audit/audit.service.ts
@Injectable()
export class AuditService {
  async logAction(auditData: CreateAuditLogDto)
  async getAuditLogs(restaurantId: string, filters: AuditQueryDto)
  async getAuditTrail(entityType: string, entityId: string)
  async getUserActivity(userId: string, dateRange: DateRange)
  async getSecurityEvents(restaurantId: string)
  async exportAuditLogs(restaurantId: string, filters: AuditExportDto)
  async cleanupOldLogs(daysToKeep: number)
}
```

**4.3 Audit Interceptor**
```typescript
// apps/backend/src/audit/interceptors/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  // Automatically log all CRUD operations
  // Capture user context, IP, changes
  // Queue audit logs for async processing
}
```

---

## PHASE 2: BUSINESS OPERATIONS (Months 5-7)

### 5. Purchase Order Management (Month 5-6)

#### Backend Implementation

**5.1 Supplier Schema**
```typescript
// apps/backend/src/suppliers/schemas/supplier.schema.ts
@Schema({ timestamps: true })
export class Supplier {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, unique: true, uppercase: true })
  supplierCode!: string;

  @Prop({ type: String, trim: true })
  contactPerson?: string;

  @Prop({ type: String, trim: true })
  phone?: string;

  @Prop({ type: String, trim: true, lowercase: true })
  email?: string;

  @Prop({ type: [String], default: [] })
  additionalEmails!: string[];

  @Prop({ type: AddressSchema })
  address?: Address;

  @Prop({ type: String, trim: true })
  gstin?: string;

  @Prop({ type: SchemaTypes.Mixed })
  paymentTerms?: {
    creditDays: number;
    paymentMethod: string;
    discountPercent?: number;
    discountDays?: number;
  };

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: [String], default: [] })
  categories!: string[]; // What they supply

  @Prop({ type: Number, min: 1, max: 5, default: 3 })
  rating?: number;

  @Prop({ type: String, trim: true })
  notes?: string;
}
```

**5.2 Purchase Order Schema**
```typescript
// apps/backend/src/purchase-orders/schemas/purchase-order.schema.ts
@Schema({ timestamps: true })
export class PurchaseOrder {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', index: true })
  branchId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Supplier', required: true })
  supplierId!: string;

  @Prop({ type: String, required: true, unique: true })
  poNumber!: string;

  @Prop({
    type: String,
    enum: ['draft', 'pending', 'approved', 'sent', 'acknowledged', 'delivered', 'cancelled'],
    default: 'draft',
    index: true
  })
  status!: string;

  @Prop({ type: Date })
  expectedDeliveryDate?: Date;

  @Prop({ type: String, trim: true })
  deliveryTime?: string;

  @Prop({ type: [PurchaseOrderItemSchema], required: true })
  items!: PurchaseOrderItem[];

  @Prop({ type: Number, min: 0, default: 0 })
  subtotal!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  taxAmount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  totalAmount!: number;

  @Prop({ type: String, trim: true })
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  approvedBy?: string;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  acknowledgedAt?: Date;
}
```

**5.3 Purchase Order Service**
```typescript
// apps/backend/src/purchase-orders/purchase-orders.service.ts
@Injectable()
export class PurchaseOrdersService {
  async createPurchaseOrder(restaurantId: string, createPoDto: CreatePurchaseOrderDto)
  async findPurchaseOrders(restaurantId: string, filters: PoQueryDto)
  async approvePurchaseOrder(poId: string, approverId: string)
  async sendPurchaseOrderEmail(poId: string)
  async acknowledgePurchaseOrder(poId: string)
  async cancelPurchaseOrder(poId: string, reason: string)
  async generatePoPdf(poId: string): Promise<Buffer>
  async receivePurchaseOrder(poId: string, receiptData: PoReceiptDto)
  async getPurchaseOrderAnalytics(restaurantId: string, period: string)
}
```

---

### 6. Loyalty Program System (Month 6-7)

#### Backend Implementation

**6.1 Loyalty Configuration Schema**
```typescript
// apps/backend/src/loyalty/schemas/loyalty-config.schema.ts
@Schema({ timestamps: true })
export class LoyaltyConfiguration {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', unique: true })
  restaurantId!: string;

  @Prop({ type: Boolean, default: false })
  isEnabled!: boolean;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Branch' }] })
  enabledBranches!: string[];

  @Prop({ type: Number, default: 1, min: 0 })
  pointsPerRupee!: number; // 1 point per ₹1 spent

  @Prop({ type: Number, default: 0.01, min: 0 })
  redemptionRate!: number; // ₹0.01 per point

  @Prop({ type: Number, default: 100, min: 1 })
  minimumRedemption!: number; // Minimum 100 points to redeem

  @Prop({ type: Number, default: 10000, min: 0 })
  maximumRedemptionPerOrder!: number; // Max 10000 points per order

  @Prop({ type: Number, default: 365, min: 0 })
  pointsExpiryDays!: number; // Points expire after 1 year

  @Prop({ type: [LoyaltyTierSchema], default: [] })
  tiers!: LoyaltyTier[];

  @Prop({ type: [LoyaltyRewardSchema], default: [] })
  rewards!: LoyaltyReward[];
}
```

**6.2 Loyalty Transaction Schema**
```typescript
// apps/backend/src/loyalty/schemas/loyalty-transaction.schema.ts
@Schema({ timestamps: true })
export class LoyaltyTransaction {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Customer', index: true })
  customerId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', index: true })
  orderId?: string;

  @Prop({
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'adjusted', 'bonus'],
    required: true,
    index: true
  })
  type!: string;

  @Prop({ type: Number, required: true })
  points!: number; // Positive for earned/bonus, negative for redeemed/expired

  @Prop({ type: Number, min: 0 })
  orderAmount?: number; // For earned points

  @Prop({ type: Number, min: 0 })
  redemptionValue?: number; // For redeemed points

  @Prop({ type: String, trim: true })
  description!: string;

  @Prop({ type: String, trim: true })
  reference?: string;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  processedBy?: string;
}
```

**6.3 Loyalty Service Implementation**
```typescript
// apps/backend/src/loyalty/loyalty.service.ts
@Injectable()
export class LoyaltyService {
  async calculateEarnedPoints(customerId: string, orderAmount: number)
  async awardPoints(customerId: string, orderId: string, points: number)
  async redeemPoints(customerId: string, points: number, orderId: string)
  async getCustomerBalance(customerId: string)
  async getPointsHistory(customerId: string, limit?: number)
  async expirePoints(daysOld: number)
  async adjustPoints(customerId: string, points: number, reason: string, userId: string)
  async getLoyaltyAnalytics(restaurantId: string, period: string)
  async getTopLoyaltyCustomers(restaurantId: string, limit: number)
  async exportLoyaltyReport(restaurantId: string, filters: LoyaltyReportDto)
}
```

---

## PHASE 3: ADVANCED FEATURES (Months 8-10)

### 7. Enhanced Marketing System (Month 8-9)

#### Backend Implementation

**7.1 Discount System Enhancement**
```typescript
// apps/backend/src/discounts/schemas/discount.schema.ts
@Schema({ timestamps: true })
export class Discount {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Branch' }] })
  applicableBranches!: string[];

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'spend_x_get_y'],
    required: true
  })
  type!: string;

  @Prop({ type: Number, min: 0 })
  value!: number; // Percentage or amount

  @Prop({
    type: String,
    enum: ['item', 'category', 'order'],
    required: true
  })
  appliesTo!: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId }] })
  applicableItems!: string[]; // Item or category IDs

  @Prop({ type: Number, min: 0 })
  minimumOrderValue?: number;

  @Prop({ type: Number, min: 0 })
  maximumDiscount?: number;

  @Prop({ type: Boolean, default: false })
  requiresManagerApproval!: boolean;

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validUntil?: Date;

  @Prop({ type: [Number], default: [0,1,2,3,4,5,6] }) // Days of week
  applicableDays!: number[];

  @Prop({ type: String, trim: true })
  applicableTimeStart?: string; // HH:mm

  @Prop({ type: String, trim: true })
  applicableTimeEnd?: string; // HH:mm

  @Prop({ type: Number, min: 0 })
  usageLimit?: number;

  @Prop({ type: Number, default: 0, min: 0 })
  usageCount!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}
```

**7.2 Coupon System**
```typescript
// apps/backend/src/coupons/schemas/coupon.schema.ts
@Schema({ timestamps: true })
export class Coupon {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, unique: true, uppercase: true })
  code!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: ['percentage', 'fixed_amount'],
    required: true
  })
  discountType!: string;

  @Prop({ type: Number, min: 0, required: true })
  discountValue!: number;

  @Prop({ type: Number, min: 0 })
  minimumOrderValue?: number;

  @Prop({ type: Number, min: 0 })
  maximumDiscount?: number;

  @Prop({ type: Date, required: true })
  validFrom!: Date;

  @Prop({ type: Date, required: true })
  validUntil!: Date;

  @Prop({ type: Number, min: 0 })
  totalUsageLimit?: number;

  @Prop({ type: Number, default: 1, min: 1 })
  usagePerCustomerLimit!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalUsageCount!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Branch' }] })
  applicableBranches!: string[];
}
```

---

### 8. Gift Card System (Month 9-10)

#### Backend Implementation

**8.1 Gift Card Schema**
```typescript
// apps/backend/src/gift-cards/schemas/gift-card.schema.ts
@Schema({ timestamps: true })
export class GiftCard {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Restaurant', index: true })
  restaurantId!: string;

  @Prop({ type: String, required: true, unique: true, uppercase: true })
  cardNumber!: string; // 16-digit card number

  @Prop({ type: String, required: true, unique: true })
  code!: string; // 8-digit PIN

  @Prop({ type: Number, required: true, min: 0 })
  initialValue!: number;

  @Prop({ type: Number, required: true, min: 0 })
  currentBalance!: number;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'expired', 'used'],
    default: 'active',
    index: true
  })
  status!: string;

  @Prop({ type: Date, required: true })
  expiryDate!: Date;

  @Prop({ type: String, trim: true })
  purchaserName?: string;

  @Prop({ type: String, trim: true })
  purchaserPhone?: string;

  @Prop({ type: String, trim: true })
  purchaserEmail?: string;

  @Prop({ type: String, trim: true })
  recipientName?: string;

  @Prop({ type: String, trim: true })
  recipientPhone?: string;

  @Prop({ type: String, trim: true })
  message?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  issuedBy!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch' })
  issuedAt!: string;

  @Prop({ type: Date, default: Date.now })
  issuedOn!: Date;

  @Prop({ type: Date })
  lastUsedAt?: Date;
}
```

**8.2 Gift Card Transaction Schema**
```typescript
// apps/backend/src/gift-cards/schemas/gift-card-transaction.schema.ts
@Schema({ timestamps: true })
export class GiftCardTransaction {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'GiftCard', index: true })
  giftCardId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', index: true })
  orderId?: string;

  @Prop({
    type: String,
    enum: ['purchase', 'redemption', 'adjustment', 'expiry'],
    required: true
  })
  type!: string;

  @Prop({ type: Number, required: true })
  amount!: number; // Positive for purchase/adjustment, negative for redemption

  @Prop({ type: Number, required: true, min: 0 })
  balanceAfter!: number;

  @Prop({ type: String, trim: true })
  description!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  processedBy!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch' })
  branchId!: string;

  @Prop({ type: String, trim: true })
  reference?: string;
}
```

---

## PHASE 4: OPTIMIZATION & INTEGRATION (Months 11-12)

### 9. UAE Market Compliance

**9.1 Arabic Language Support**
- Complete Arabic translation for all customer-facing interfaces
- RTL (right-to-left) text direction support
- Arabic receipt generation with proper formatting
- Date/time localization for Arabic regions

**9.2 UAE Tax Compliance**
- UAE emirate configuration in location settings
- VAT rate configuration for UAE (5% standard rate)
- AED currency handling and formatting
- Emirates-specific business rules

### 10. Performance Optimization

**10.1 Database Optimization**
- Index optimization for all new schemas
- Query optimization with aggregation pipelines
- Caching strategy for frequently accessed data
- Database sharding considerations for scale

**10.2 Real-time Features Enhancement**
- WebSocket optimization for real-time updates
- Push notifications for mobile apps
- Real-time inventory updates
- Live dashboard refresh

### 11. Integration Framework

**11.1 Third-party Integrations**
- Accounting software integration (Tally, QuickBooks)
- Payment gateway integrations (beyond current ones)
- Food delivery platform APIs (Zomato, Swiggy)
- SMS/WhatsApp integration for notifications

**11.2 API Enhancements**
- RESTful API completion for all modules
- GraphQL implementation for complex queries
- Webhook system for real-time notifications
- API rate limiting and security enhancements

---

## Technical Implementation Guidelines

### Development Standards

**1. Code Quality**
- TypeScript strict mode enabled
- ESLint and Prettier configured
- 90%+ test coverage requirement
- Comprehensive API documentation with Swagger

**2. Database Design**
- Proper indexing strategy
- Data validation at schema level
- Soft delete implementation for audit trail
- Optimized queries with aggregation pipelines

**3. Security Implementation**
- Role-based access control (RBAC)
- JWT token with refresh mechanism
- Rate limiting on all APIs
- Input validation and sanitization
- SQL injection prevention

**4. Performance Requirements**
- API response time < 200ms for 95% of requests
- Database queries optimized with proper indexing
- Frontend bundle size optimization
- CDN implementation for static assets

### Testing Strategy

**1. Backend Testing**
- Unit tests for all services (Jest)
- Integration tests for API endpoints
- E2E tests for critical user flows
- Database seeding for consistent testing

**2. Frontend Testing**
- Component unit tests (React Testing Library)
- Integration tests for user flows
- Visual regression testing
- Cross-browser compatibility testing

### Deployment Strategy

**1. CI/CD Pipeline**
- Automated testing on pull requests
- Staging environment for testing
- Blue-green deployment for zero downtime
- Database migration automation

**2. Monitoring & Logging**
- Application performance monitoring (APM)
- Error tracking and alerting
- Business metrics dashboards
- Audit log monitoring

---

## Success Metrics

### Technical Metrics
- 99.9% uptime SLA
- < 2 second page load times
- 90%+ test coverage
- Zero critical security vulnerabilities

### Business Metrics
- Support for 1000+ concurrent users
- 10,000+ orders processed per day
- Sub-second search response times
- 24/7 system availability

### User Experience Metrics
- < 3 clicks for common operations
- Mobile-responsive design (95+ Lighthouse score)
- Accessibility compliance (WCAG 2.1)
- Intuitive UI with minimal training required

---

## Resource Requirements

### Development Team
- 2 Senior Full-stack Developers
- 1 Frontend Specialist (React/TypeScript)
- 1 Backend Specialist (NestJS/MongoDB)
- 1 QA Engineer
- 1 DevOps Engineer
- 1 Product Manager

### Infrastructure
- Production MongoDB cluster
- Redis for caching and sessions
- CDN for static assets
- Load balancers for high availability
- Monitoring and logging infrastructure

### Timeline
- **Months 1-4**: Critical POS foundations
- **Months 5-7**: Business operations features
- **Months 8-10**: Advanced marketing and loyalty
- **Months 11-12**: Optimization and market expansion

This implementation plan will transform RestoHand into a comprehensive POS system that not only matches Foodics capabilities but provides competitive advantages through modern architecture, superior analytics, and innovative features.