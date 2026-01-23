# Testing Branch APIs

## 1. Get all branches (should show your Main Branch)
```bash
curl -X GET "http://localhost:3000/api/branches" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 2. Create a new branch
```bash
curl -X POST "http://localhost:3000/api/branches" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Branch",
    "slug": "downtown",
    "description": "Our downtown location",
    "address": {
      "line1": "123 Main St",
      "city": "Downtown",
      "state": "Kerala",
      "postalCode": "680001",
      "country": "IN"
    },
    "contactPhone": "+91 9876543210",
    "contactEmail": "downtown@testcafe.com",
    "isActive": true,
    "settings": {
      "orderNumberPrefix": "DT",
      "enableTakeout": true,
      "enableDineIn": true,
      "enableDelivery": true,
      "deliveryRadius": 5,
      "deliveryFee": 50
    }
  }'
```

## 3. Get branch count
```bash
curl -X GET "http://localhost:3000/api/branches/count" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Replace YOUR_JWT_TOKEN with your actual JWT token from the frontend.