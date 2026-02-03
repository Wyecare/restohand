# Cashfree Payouts Implementation Plan

## Overview
Since Cashfree Easy Split was rejected and Razorpay Route requires ₹40L+ turnover, we're implementing Cashfree Payouts as the solution for restaurant payments.

## Flow Architecture

### Current Problem
- Easy Split: Rejected by Cashfree due to internal policy constraints
- Razorpay Route: Requires ₹40L+ annual turnover + Private Limited company

### Solution: Cashfree Payouts
```
Customer → [Payment Gateway] → Platform Account → [Payouts API] → Restaurant Bank Account
```

## Technical Implementation

### 1. Payment Flow
1. **Customer Payment**: Customer pays via Cashfree Payment Gateway to platform account
2. **Payment Confirmation**: Webhook confirms successful payment
3. **Automatic Payout**: Trigger instant payout to restaurant's bank account
4. **Commission Deduction**: Deduct platform commission before payout

### 2. Required Components

#### A. Cashfree Payouts Service
- Beneficiary Management (Restaurant Bank Accounts)
- Payout Creation and Execution
- Payout Status Tracking
- Webhook Handling

#### B. Restaurant Onboarding for Payouts
- Bank Account Details Collection
- Bank Account Verification
- Beneficiary Registration with Cashfree

#### C. Commission & Settlement Logic
- Platform commission calculation (e.g., 2-5%)
- Net amount calculation for restaurant
- Settlement scheduling (instant/daily/weekly)

### 3. API Endpoints Needed

#### Payouts Service
- `POST /payouts/beneficiaries` - Add restaurant as beneficiary
- `POST /payouts/transfer` - Create payout to restaurant
- `GET /payouts/transfer/:transferId/status` - Check payout status
- `POST /webhooks/payouts` - Handle payout webhooks

#### Restaurant Management
- `PUT /restaurants/:id/bank-details` - Update bank details
- `POST /restaurants/:id/verify-account` - Verify bank account
- `GET /restaurants/:id/payout-history` - Get payout history

### 4. Database Schema Updates

#### Restaurant Schema
```typescript
{
  // Existing fields...

  // Payouts Configuration
  payoutsConfig: {
    beneficiaryId: string, // Cashfree beneficiary ID
    isVerified: boolean,
    verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED',
    commissionPercentage: number, // Platform commission
    settlementSchedule: 'INSTANT' | 'DAILY' | 'WEEKLY',
    lastPayoutAt: Date,
    totalPayoutsReceived: number
  },

  // Settlement Settings
  settlementConfig: {
    minimumPayoutAmount: number, // e.g., ₹100
    holdingPeriod: number, // days to hold before payout
    isActive: boolean
  }
}
```

#### New Payout Schema
```typescript
{
  payoutId: string, // Cashfree transfer ID
  orderId: string, // Reference order
  restaurantId: string,
  amount: number, // Original order amount
  commissionAmount: number, // Platform commission
  netAmount: number, // Amount sent to restaurant
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED',
  transferMode: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI',
  cashfreeData: object, // Raw Cashfree response
  createdAt: Date,
  processedAt: Date
}
```

### 5. Environment Configuration

```env
# Cashfree Payouts API
CASHFREE_PAYOUTS_CLIENT_ID=your_payouts_client_id
CASHFREE_PAYOUTS_CLIENT_SECRET=your_payouts_client_secret
CASHFREE_PAYOUTS_BASE_URL=https://payout-api.cashfree.com/payout/v1

# Platform Settings
PLATFORM_COMMISSION_PERCENTAGE=3
DEFAULT_MINIMUM_PAYOUT_AMOUNT=100
DEFAULT_SETTLEMENT_SCHEDULE=INSTANT
```

## Benefits of This Approach

### 1. No Approval Barriers
- No Easy Split approval needed
- No ₹40L turnover requirement
- Works with current proprietorship

### 2. Full Control
- Platform controls timing and amounts
- Can implement commission structure
- Better error handling and retry logic

### 3. Instant Transfers
- 24x7 instant payouts via IMPS/UPI
- 99.98% success rate
- Real-time status tracking

### 4. Compliance
- Transparent to restaurants
- Clear audit trail
- Proper tax handling for commissions

## Implementation Timeline

### Phase 1: Core Payouts Service (Week 1)
- [ ] Set up Cashfree Payouts API integration
- [ ] Create beneficiary management system
- [ ] Implement basic payout functionality
- [ ] Add webhook handling

### Phase 2: Restaurant Integration (Week 2)
- [ ] Update restaurant onboarding for bank details
- [ ] Add bank account verification
- [ ] Implement commission calculation
- [ ] Create payout history tracking

### Phase 3: Automation & Optimization (Week 3)
- [ ] Automatic payout on order completion
- [ ] Settlement scheduling options
- [ ] Error handling and retry logic
- [ ] Admin dashboard for payout monitoring

## Risk Mitigation

### 1. Failed Payouts
- Automatic retry with exponential backoff
- Manual retry option from admin panel
- Alert system for persistent failures

### 2. Fraud Prevention
- Bank account verification before first payout
- Daily/weekly payout limits
- Suspicious transaction detection

### 3. Reconciliation
- Daily settlement reports
- Automatic matching with order data
- Discrepancy alerts and resolution

## Next Steps

1. **Immediate**: Set up Cashfree Payouts account and get API credentials
2. **Week 1**: Implement core payouts service
3. **Week 2**: Integrate with existing restaurant system
4. **Week 3**: Deploy and monitor

This approach provides immediate access to restaurant payments without waiting for approvals or meeting high revenue thresholds.