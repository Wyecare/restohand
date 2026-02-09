# Restohand Business Model & Payment Architecture

## Executive Summary

Restohand is a modern restaurant POS and QR-based self-ordering system targeting the Indian market. Our business model combines subscription revenue with transaction-based fees, providing restaurants with a comprehensive solution while maintaining sustainable unit economics.

---

## Business Model Overview

### Revenue Streams

**1. Subscription Revenue (Predictable)**

- Starter Plan: ₹999/month
- Professional Plan: ₹2,999/month
- Enterprise Plan: ₹5,999/month

**2. Transaction Revenue (Performance-based)**

- 2% fee on all orders processed through our payment gateway
- 0% fee on cash orders or orders paid through restaurant's own card machine
- Restaurant chooses payment method per order

### Pricing Tiers

#### Starter - ₹999/month + 2% transaction fee

**Features:**

- 1 branch
- 20 tables
- 5 staff accounts
- 75 menu items
- QR-based self-ordering
- E-receipts (PDF download)
- Real-time order management
- Basic analytics
- Waiter app for manual orders
- Payment gateway integration

**Target Market:** Small cafes, QSRs, family restaurants (40-60 seats)

#### Professional - ₹2,999/month + 2% transaction fee

**Features:**

- 3 branches
- 50 tables
- 15 staff accounts
- 200 menu items
- All Starter features
- Advanced analytics & reports
- Customer CRM
- Inventory management
- Multi-location management
- Priority support

**Target Market:** Multi-location chains, mid-size restaurants (100-130 seats)

#### Enterprise - ₹5,999/month + 2% transaction fee

**Features:**

- Unlimited branches
- Unlimited tables
- Unlimited staff accounts
- Unlimited menu items
- All Professional features
- Custom integrations
- Dedicated account manager
- API access
- White-label options

**Target Market:** Large chains, fine dining groups, franchises

---

## Payment Gateway Integration

### Technology Stack

**Payment Partner:** Cashfree Payments  
**Integration Type:** Payment Gateway + Easy Split

### How It Works

```
Customer Flow:
1. Customer scans QR code at table
2. Views menu and adds items to cart
3. Reviews order summary with GST breakdown
4. Chooses payment method:
   - Pay Online (UPI/Card/Net Banking)
   - Pay Cash (mark for waiter)
5. If online: Cashfree payment gateway opens
6. Customer completes payment
7. Instant order confirmation
8. E-receipt generated automatically
```

### Payment Methods Supported

**Digital Payments (via Cashfree):**

- UPI (PhonePe, Google Pay, Paytm, etc.)
- Credit Cards (Visa, Mastercard)
- Debit Cards (RuPay, Maestro)
- Net Banking
- Wallets (Paytm, Amazon Pay, etc.)
- UPI on Credit Cards

**Manual Payments (0% fee):**

- Cash (marked in waiter app)
- Restaurant's own card machine

### Gateway Fees

**Year 1 (Cashfree Anniversary Offer - valid until March 31, 2026):**

- Payment Gateway: 1.6%
- Easy Split: 0.20%
- **Total Cashfree Fee: 1.8%**

**Year 2+ (Standard Pricing):**

- Payment Gateway: 1.95%
- Easy Split: 0.20%
- **Total Cashfree Fee: 2.15%**

### Our Transaction Fee Structure

**We charge restaurants 2% on digital payments**

**Fee Breakdown:**

- Customer pays: ₹500
- Restaurant's 2% fee: ₹10
- Cashfree takes: ₹9 (1.8%)
- Restohand keeps: ₹1 (0.2%)
- Restaurant receives: ₹490

**Restaurant's perspective:**

- Total cost: 2% (competitive with card machines at 1.5-2%)
- No card machine rental fee (saves ₹500/month)
- Auto-settlements daily
- Real-time tracking

---

## Easy Split Explained

### What is Easy Split?

Easy Split is Cashfree's feature that automatically splits payments between multiple parties. When a customer pays ₹500, the money is instantly divided and sent to different bank accounts based on pre-configured percentages.

### Requirements

**To use Easy Split:**

- ✅ Private Limited Company (mandatory)
- ✅ Separate vendor accounts for each restaurant
- ✅ Verified bank account details

**We are currently:**

- Sole Proprietorship → registering Private Limited Company
- Timeline: 2-3 weeks for Pvt Ltd registration
- Cashfree Easy Split will be activated post-registration

### How Easy Split Works

#### Setup Phase (One-time per restaurant)

1. **Restaurant Onboarding:**

   - Restaurant provides: Business name, GSTIN, bank account, PAN
   - We create vendor account in Cashfree
   - Link restaurant's bank account

2. **Split Configuration:**
   - Restaurant: 98%
   - Restohand: 2%

#### Transaction Flow (Automatic)

```
Customer pays ₹500
    ↓
Cashfree receives ₹500
    ↓
Cashfree deducts fees (1.8%) = ₹9
    ↓
Amount available for split: ₹491
    ↓
Easy Split executes:
    → Restaurant (98%): ₹481.18 → Their bank account
    → Restohand (2%): ₹9.82 → Our bank account
    ↓
Settlement happens:
    → T+1 (next day) OR
    → Instant (if enabled, costs extra 0.3%)
```

### Benefits for Restaurants

**1. Instant Transparency**

- See their share in real-time dashboard
- Know exactly when money will hit their account
- No waiting for us to manually transfer

**2. Trust & Security**

- Money goes directly to their bank (not held by us)
- Automated process (no human error)
- Can't be delayed or withheld

**3. Accounting Simplicity**

- Clean separation of revenue vs commission
- Easy GST filing
- Automated reconciliation

### Benefits for Restohand

**1. Cash Flow**

- Automatic commission collection
- No manual settlement work
- No payment follow-ups

**2. Scalability**

- Handle 100+ restaurants without manual transfers
- Same effort for 10 or 1000 restaurants

**3. Compliance**

- Proper legal structure
- Transparent commission tracking
- Audit-ready records

---

## Temporary Solution (Until Pvt Ltd is Ready)

### Current Approach: Manual Settlements

**Why needed:**

- Easy Split requires Pvt Ltd company
- We're Sole Proprietorship currently
- Pvt Ltd registration in progress (2-3 weeks)

**How it works:**

1. **Payment Collection:**

   - Customer pays through our Cashfree gateway
   - Full amount comes to our account
   - Daily at 11:00 AM: We review all transactions

2. **Manual Transfer:**

   - Calculate restaurant's share (98%)
   - Transfer via NEFT/IMPS to restaurant's account
   - Send payment confirmation on WhatsApp

3. **Record Keeping:**
   - Maintain detailed logs of all transfers
   - Share daily settlement reports
   - Provide invoice/receipt for commission

**Legal Framework:**

- Written agreement with each restaurant
- Clear terms: We collect on their behalf, settle within 24 hours
- We're acting as payment intermediary/agent
- Separate our commission clearly

**Bank Considerations:**

- Using current account (higher transfer limits)
- Split large settlements into multiple transfers if needed
- Request higher daily limits from bank if required

**Timeline:**

- Use manual settlements for first 1-2 months
- Switch to Easy Split once Pvt Ltd is registered
- Communicate timeline clearly to restaurants

---

## Unit Economics

### Per Restaurant (Starter Plan)

**Assumptions:**

- 50 orders/day
- ₹500 average order value
- 50% customers use QR payment gateway
- 50% customers pay cash (0% fee to us)

**Monthly Numbers:**

- Total orders: 1,500
- Orders through gateway: 750
- GMV through gateway: ₹3,75,000

**Revenue:**

- Subscription: ₹999
- Transaction fee (2% of ₹3,75,000): ₹7,500
- **Total: ₹8,499**

**Costs:**

- Cashfree fees (1.8% of ₹3,75,000): ₹6,750
- Allocated GCP cost: ₹350
- **Total: ₹7,100**

**Profit per restaurant: ₹1,399/month**

### Scale Economics

**10 Restaurants:**

- Revenue: ₹84,990
- Costs: ₹71,000 (Cashfree) + ₹3,500 (GCP) = ₹74,500
- **Profit: ₹10,490/month**

**20 Restaurants:**

- Revenue: ₹1,69,980
- Costs: ₹1,42,000 + ₹6,000 = ₹1,48,000
- **Profit: ₹21,980/month**

**50 Restaurants:**

- Revenue: ₹4,24,950
- Costs: ₹3,55,000 + ₹12,000 = ₹3,67,000
- **Profit: ₹57,950/month**

---

## Competitive Positioning

### vs Petpooja

**Petpooja:**

- ₹833/month subscription
- 0% transaction fee
- Basic POS features
- Limited QR ordering

**Restohand:**

- ₹999/month subscription
- 2% on digital payments only (competitive with card machines)
- Modern QR self-ordering (core feature)
- Auto-settlements & Easy Split
- Better UI/UX

**Our advantage:** All-in-one solution with modern customer experience

### vs DotPe

**DotPe:**

- Commission-based (no public pricing)
- QR ordering focus
- Used by McDonald's, Haldiram's

**Restohand:**

- Transparent pricing
- Lower commission (2% vs estimated 3-5%)
- More control for restaurants

**Our advantage:** Simpler pricing, better margins for restaurants

### vs Traditional Card Machines

**Card Machines:**

- 1.5-2% transaction fee
- ₹500/month rental
- No POS software included
- Manual order management

**Restohand:**

- 2% transaction fee (similar)
- ₹999/month (includes full POS + software)
- Digital ordering + analytics
- Automated workflows

**Our advantage:** Same payment cost, but you get complete restaurant management system

---

## GST Compliance

### Tax Calculation

**Dynamic GST Rates:**

- Non-AC restaurants: 5% GST
- AC restaurants: 18% GST
- Restaurants in hotels (₹7,500+ tariff): 18% GST

**Implementation:**

- Restaurant sets their GST rate during onboarding
- System automatically calculates:
  - Same state: CGST + SGST
  - Different state: IGST

**Example Bill:**

```
Item 1: Biryani        ₹200
Item 2: Coke          ₹100
─────────────────────────
Subtotal              ₹300
CGST (2.5%)          ₹7.50
SGST (2.5%)          ₹7.50
─────────────────────────
Total                 ₹315
```

### Invoice Requirements

**Every e-receipt includes:**

- Restaurant name & GSTIN
- Date & time
- Unique bill number
- Item-wise breakdown
- GST split (CGST/SGST or IGST)
- Total amount
- Payment method

---

## Risk Mitigation

### Technical Risks

**1. Payment Gateway Downtime**

- Fallback: Restaurant can accept cash/own card machine
- Real-time status monitoring
- Customer support hotline

**2. Server Crashes**

- Cloud Run auto-scaling
- MongoDB cluster redundancy
- 99.9% uptime SLA target

**3. QR Code Issues**

- Printable backup QR codes
- Multiple formats (table stickers, standees, menu cards)

### Business Risks

**1. Low QR Adoption**

- Impact: Lower transaction revenue
- Mitigation: Subscription still covers base costs
- Strategy: Staff training, customer incentives

**2. Cash Preference**

- Impact: 0% transaction fees on cash orders
- Mitigation: Subscription revenue model
- Acceptance: We're okay with this, software value remains

**3. Cashfree Fee Increases**

- Impact: Margin compression (0.2% → 0% after Year 1)
- Mitigation: Increase our fee to 2.5% in Year 2
- Communication: Notify restaurants 30 days prior

### Financial Risks

**1. High Customer Acquisition Cost**

- Track CAC closely
- Target: <3 months payback period
- Focus: Word-of-mouth, referrals

**2. Churn**

- Monitor: Monthly churn rate
- Target: <5% monthly churn
- Action: Customer success check-ins

---

## Growth Strategy

### Phase 1: Proof of Concept (Months 1-3)

- Target: 5 restaurants
- Strategy: Free 2-month trial
- Goal: Validate product-market fit
- Focus: Gather feedback, iterate fast

### Phase 2: Early Traction (Months 4-6)

- Target: 10 restaurants
- Strategy: Launch paid subscriptions
- Goal: ₹10k MRR
- Focus: Case studies, testimonials

### Phase 3: Scale (Months 7-12)

- Target: 20-30 restaurants
- Strategy: Sales team (1-2 people)
- Goal: ₹30k MRR
- Focus: Process refinement, support

### Phase 4: Expansion (Months 13-24)

- Target: 50-100 restaurants
- Strategy: Multi-city expansion
- Goal: ₹1L MRR
- Focus: Team building, features

---

## Technology Infrastructure

### Current Setup

**Backend:**

- Cloud Run (API - Node.js/Python)
- MongoDB Atlas (Database)
- Firebase (Auth, Hosting, Storage)
- Cashfree (Payments)

**Frontend:**

- React (Customer ordering app)
- React (Waiter app)
- React (Restaurant dashboard)

**Mobile:**

- PWA (works on all devices)
- No app download required

### Costs with Credits

**GCP Credits:** ₹1,00,000  
**MongoDB Credits:** ₹50,000  
**Total Credits:** ₹1,50,000

**Estimated Burn Rate:**

- 0-10 restaurants: ₹2,000-4,000/month
- 10-20 restaurants: ₹4,000-8,000/month
- 20-50 restaurants: ₹8,000-15,000/month

**Credits Last:** 10-15 months (enough to reach profitability)

---

## Key Metrics to Track

### Financial Metrics

- Monthly Recurring Revenue (MRR)
- Transaction Revenue
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Gross Margin
- Burn Rate

### Product Metrics

- QR adoption rate (% of orders via QR)
- Average order value
- Orders per restaurant per day
- Payment method split (cash vs digital)

### Customer Metrics

- Number of active restaurants
- Monthly churn rate
- Net Promoter Score (NPS)
- Support ticket volume
- Feature usage rates

---

## Next Steps

### Immediate (Week 1-2)

- [x] Finalize business model
- [ ] Register Private Limited Company
- [ ] Sign up for Cashfree (before March 31, 2026 for anniversary offer)
- [ ] Set up Cashfree integration
- [ ] Create vendor onboarding flow

### Short-term (Month 1-2)

- [ ] Launch with 2-3 pilot restaurants (free trial)
- [ ] Set up manual settlement process
- [ ] Create legal agreements for restaurants
- [ ] Activate Easy Split (once Pvt Ltd ready)
- [ ] Build restaurant dashboard

### Medium-term (Month 3-6)

- [ ] Start charging subscriptions
- [ ] Onboard 10 restaurants
- [ ] Hire 1 customer success person
- [ ] Build marketing materials
- [ ] Create referral program

---

## Conclusion

Restohand's business model is built on:

1. **Sustainable unit economics** - Profitable from restaurant #1
2. **Scalable technology** - Cloud infrastructure grows with demand
3. **Fair pricing** - Competitive with alternatives, transparent
4. **Win-win approach** - Restaurants save money, we make money
5. **Modern experience** - QR ordering is the future

**Target: 20 restaurants in 12 months = ₹20k+ monthly profit**

This is achievable, sustainable, and ready to scale.

---

_Last Updated: February 9, 2026_
