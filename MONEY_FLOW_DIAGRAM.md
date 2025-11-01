# RestoHand Money Flow Architecture

## Primary Revenue Streams

### 1. SaaS Subscription Model
```
Restaurant → Monthly/Annual Fee → RestoHand
₹2,000-10,000/month per restaurant
```

### 2. Transaction Fee Model
```
Customer Payment → Razorpay → RestoHand Commission → Restaurant
2-3% transaction fee on digital payments
```

### 3. Premium Features
```
Restaurant → Feature Upgrade Fee → RestoHand
Analytics, Multi-location, Advanced reports
```

## Payment Flow Diagram

```mermaid
graph TD
    A[Customer Orders ₹1000] --> B{Payment Method?}
    B -->|UPI| C[Razorpay UPI Intent]
    B -->|Cash| D[Cash Payment to Restaurant]

    C --> E[Customer's UPI App]
    E --> F[Payment Successful]
    F --> G[Razorpay Processes Payment]

    G --> H[Razorpay Fee: ₹18-25]
    G --> I[RestoHand Commission: ₹20-30]
    G --> J[Restaurant Receives: ₹945-962]

    D --> K[Restaurant Receives: ₹1000]
    D --> L[RestoHand SaaS Fee: ₹5000/month]

    H --> M[Razorpay Revenue]
    I --> N[RestoHand Revenue]
    J --> O[Restaurant Revenue]
    K --> O
    L --> N

    style N fill:#4CAF50
    style O fill:#2196F3
    style M fill:#FF9800
```

## Revenue Calculation Example

### Monthly Revenue per Restaurant
- **SaaS Fee**: ₹5,000/month
- **Transaction Volume**: ₹2,00,000/month
- **Digital Payment %**: 70% = ₹1,40,000
- **Commission (2%)**: ₹2,800/month
- **Total Revenue**: ₹7,800/month per restaurant

### Scale Projections
- **100 Restaurants**: ₹7.8 lakhs/month
- **500 Restaurants**: ₹39 lakhs/month
- **1000 Restaurants**: ₹78 lakhs/month

## Cost Structure
- **Technology Infrastructure**: ₹2-3 lakhs/month
- **Payment Processing**: 1.8% to Razorpay
- **Customer Support**: ₹5-8 lakhs/month
- **Sales & Marketing**: 30-40% of revenue