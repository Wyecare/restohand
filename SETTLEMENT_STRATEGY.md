# Restohand Settlement System Strategy

## Background
- Razorpay Route is not available for our use case
- Need to settle restaurant payments from company Razorpay account to restaurant bank accounts
- Current system has 3% commission model

## Settlement Approaches Discussed

### 1. Manual Settlement Process
- **Description**: Admin manually processes settlements through Razorpay dashboard
- **Process**:
  - Calculate pending amounts in admin portal
  - Manually create transfers via Razorpay dashboard
  - Mark orders as settled in our system
- **Pros**: Simple, no additional integration needed
- **Cons**: Manual work, prone to errors

### 2. Razorpay Transfer API Integration
- **Description**: Automated transfers using Razorpay's Transfer API
- **Requirements**:
  - Restaurant bank account details stored in our system
  - Razorpay Transfer API access (successor to Route)
- **Process**:
  - Calculate settlement amounts
  - Create transfer via API to restaurant account
  - Track transfer status
  - Mark orders as settled
- **Pros**: Automated, trackable, scalable
- **Cons**: Requires API integration, bank account management

### 3. Batch Settlement System
- **Description**: Process settlements in batches (daily/weekly)
- **Features**:
  - Collect all pending settlements
  - Process as batch transfers
  - Generate settlement reports
  - Email notifications to restaurants
- **Benefits**: Reduces transaction costs, better cash flow management

### 4. Webhook-Based Settlement Tracking
- **Description**: Use Razorpay webhooks to track settlement status
- **Process**:
  - Create transfer via API
  - Listen for transfer completion webhooks
  - Update order settlement status automatically
  - Handle failed transfers with retry logic

## Current Implementation Status
- ✅ Settlement calculation (3% commission)
- ✅ Pending settlements tracking
- ✅ Admin dashboard for settlements
- ❌ Actual money transfer (currently placeholder)
- ❌ Settlement history tracking
- ❌ Bank account management

## Next Steps Needed
1. **Bank Account Storage**: Add restaurant bank account fields to database
2. **Razorpay Integration**: Implement Transfer API calls
3. **Settlement Records**: Create settlement transaction logging
4. **Error Handling**: Handle transfer failures and retries
5. **Notifications**: Email restaurants about settlements

## Technical Requirements
- Restaurant bank account details (account number, IFSC, account holder name)
- Razorpay Transfer API credentials
- Settlement transaction schema
- Transfer status tracking
- Audit trail for all settlements

## Security Considerations
- Encrypt bank account details
- Audit all settlement operations
- Multi-approval process for large settlements
- Rate limiting on settlement operations
- Secure webhook validation