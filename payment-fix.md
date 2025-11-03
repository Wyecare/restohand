# Payment Fix Strategy

## Problem
- GPay shows "risky payment" warning
- Domain not verified with Razorpay
- Standard checkout still triggers warnings

## Solution: Use Razorpay Payment Links
1. Create payment link on backend
2. Redirect customer to Razorpay hosted page
3. No domain verification needed
4. 100% trusted by UPI apps

## Implementation Plan
1. Add payment link API endpoint
2. Modify frontend to use payment links
3. Keep webhook system intact