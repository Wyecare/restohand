// Professional billing calculation utilities for restaurant orders

export interface BillBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  serviceCharge: number;
  packagingFee: number;
  platformFee: number;
  discount: number;
  deliveryFee: number;
  total: number;
  savings: number;
}

export interface BillConfig {
  // Tax rates (in percentage)
  cgstRate: number;
  sgstRate: number;
  igstRate: number;

  // Service charges (in percentage)
  serviceChargeRate: number;

  // Fixed fees (in rupees)
  packagingFee: number;
  platformFee: number;
  deliveryFee: number;

  // Discounts
  discountPercentage: number;
  discountAmount: number;

  // Delivery options
  isDelivery: boolean;
  isInterstateOrder: boolean; // For IGST vs CGST+SGST
}

export const DEFAULT_BILL_CONFIG: BillConfig = {
  // Standard GST rates for restaurants in India
  cgstRate: 2.5, // 2.5% CGST (Central GST)
  sgstRate: 2.5, // 2.5% SGST (State GST) - Total 5% GST for dine-in
  igstRate: 5, // 5% IGST (Integrated GST) for interstate orders

  // Service charges
  serviceChargeRate: 3, // 3% service charge

  // Fixed fees
  packagingFee: 5, // ₹5 packaging fee for takeaway/delivery
  platformFee: 2, // ₹2 platform fee
  deliveryFee: 0, // Free delivery (can be configurable)

  // Discounts
  discountPercentage: 0,
  discountAmount: 0,

  // Order type
  isDelivery: false,
  isInterstateOrder: false,
};

// Format currency for display
export const formatCurrency = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 3,
  }).format(amount);

// Interface for cart items with GST information
export interface CartItemWithGst {
  id: string;
  name: string;
  pricing: {
    amount: number;
    currency?: string;
  };
  quantity: number;
  gstRate?: number; // Individual item GST rate
}

// Calculate comprehensive bill breakdown
export function calculateBillBreakdown(
  subtotal: number,
  config: Partial<BillConfig> = {}
): BillBreakdown {
  const finalConfig = { ...DEFAULT_BILL_CONFIG, ...config };

  // Calculate taxes based on order type
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (finalConfig.isInterstateOrder) {
    // For interstate orders, use IGST
    igst = (subtotal * finalConfig.igstRate) / 100;
  } else {
    // For intrastate orders, use CGST + SGST
    cgst = (subtotal * finalConfig.cgstRate) / 100;
    sgst = (subtotal * finalConfig.sgstRate) / 100;
  }

  const totalTax = cgst + sgst + igst;

  // Calculate service charge on subtotal
  const serviceCharge = (subtotal * finalConfig.serviceChargeRate) / 100;

  // Fixed fees
  const packagingFee =
    finalConfig.isDelivery || finalConfig.packagingFee > 0
      ? finalConfig.packagingFee
      : 0;
  const platformFee = finalConfig.platformFee;
  const deliveryFee = finalConfig.isDelivery ? finalConfig.deliveryFee : 0;

  // Calculate subtotal before discount
  const subtotalWithCharges =
    subtotal +
    totalTax +
    serviceCharge +
    packagingFee +
    platformFee +
    deliveryFee;

  // Calculate discount
  let discount = 0;
  if (finalConfig.discountPercentage > 0) {
    discount = (subtotal * finalConfig.discountPercentage) / 100;
  }
  if (finalConfig.discountAmount > 0) {
    discount += finalConfig.discountAmount;
  }

  // Final total
  const total = Math.max(0, subtotalWithCharges - discount);

  // Calculate savings (discount amount)
  const savings = discount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    serviceCharge: Math.round(serviceCharge * 100) / 100,
    packagingFee: Math.round(packagingFee * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    savings: Math.round(savings * 100) / 100,
  };
}

// Get tax information based on restaurant location
export function getTaxInfo(isInterstateOrder: boolean = false) {
  if (isInterstateOrder) {
    return {
      taxType: 'IGST',
      rate: '5%',
      description: 'Integrated Goods and Services Tax',
    };
  } else {
    return {
      taxType: 'CGST + SGST',
      rate: '2.5% + 2.5% = 5%',
      description: 'Central + State Goods and Services Tax',
    };
  }
}

// Validate if item pricing includes tax
export function adjustForTaxInclusive(
  amount: number,
  isTaxInclusive: boolean,
  taxRate: number = 5
): number {
  if (isTaxInclusive) {
    // If price is tax-inclusive, extract the base amount
    return amount / (1 + taxRate / 100);
  }
  return amount;
}

// Get billing summary for display
export function getBillingSummary(breakdown: BillBreakdown) {
  const items = [];

  items.push({ label: 'Subtotal', amount: breakdown.subtotal });

  if (breakdown.cgst > 0) {
    items.push({ label: 'CGST (2.5%)', amount: breakdown.cgst });
  }
  if (breakdown.sgst > 0) {
    items.push({ label: 'SGST (2.5%)', amount: breakdown.sgst });
  }
  if (breakdown.igst > 0) {
    items.push({ label: 'IGST (5%)', amount: breakdown.igst });
  }

  if (breakdown.serviceCharge > 0) {
    items.push({
      label: 'Service Charge (3%)',
      amount: breakdown.serviceCharge,
    });
  }

  if (breakdown.packagingFee > 0) {
    items.push({ label: 'Packaging Fee', amount: breakdown.packagingFee });
  }

  if (breakdown.platformFee > 0) {
    items.push({ label: 'Platform Fee', amount: breakdown.platformFee });
  }

  if (breakdown.deliveryFee > 0) {
    items.push({ label: 'Delivery Fee', amount: breakdown.deliveryFee });
  }

  if (breakdown.discount > 0) {
    items.push({
      label: 'Discount',
      amount: -breakdown.discount,
      isDiscount: true,
    });
  }

  return items;
}

// Calculate bill breakdown with per-item GST rates
export function calculateItemizedBillBreakdown(
  cartItems: CartItemWithGst[],
  config: Partial<BillConfig> = {}
): BillBreakdown {
  const finalConfig = { ...DEFAULT_BILL_CONFIG, ...config };

  // Calculate subtotal
  const subtotal = cartItems.reduce(
    (total, item) => total + item.pricing.amount * item.quantity,
    0
  );

  // Calculate taxes for each item based on individual GST rates
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  cartItems.forEach((item) => {
    const itemTotal = item.pricing.amount * item.quantity;
    const itemGstRate =
      item.gstRate || finalConfig.cgstRate + finalConfig.sgstRate;

    if (finalConfig.isInterstateOrder) {
      // For interstate orders, use IGST
      totalIgst += (itemTotal * itemGstRate) / 100;
    } else {
      // For intrastate orders, split between CGST and SGST
      const cgstRate = itemGstRate / 2;
      const sgstRate = itemGstRate / 2;
      totalCgst += (itemTotal * cgstRate) / 100;
      totalSgst += (itemTotal * sgstRate) / 100;
    }
  });

  const totalTax = totalCgst + totalSgst + totalIgst;

  // Calculate service charge on subtotal
  const serviceCharge = (subtotal * finalConfig.serviceChargeRate) / 100;

  // Fixed fees
  const packagingFee =
    finalConfig.isDelivery || finalConfig.packagingFee > 0
      ? finalConfig.packagingFee
      : 0;
  const platformFee = finalConfig.platformFee;
  const deliveryFee = finalConfig.isDelivery ? finalConfig.deliveryFee : 0;

  // Calculate subtotal before discount
  const subtotalWithCharges =
    subtotal +
    totalTax +
    serviceCharge +
    packagingFee +
    platformFee +
    deliveryFee;

  // Calculate discount
  let discount = 0;
  if (finalConfig.discountPercentage > 0) {
    discount = (subtotal * finalConfig.discountPercentage) / 100;
  }
  if (finalConfig.discountAmount > 0) {
    discount += finalConfig.discountAmount;
  }

  // Final total
  const total = Math.max(0, subtotalWithCharges - discount);

  // Calculate savings (discount amount)
  const savings = discount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    cgst: Math.round(totalCgst * 100) / 100,
    sgst: Math.round(totalSgst * 100) / 100,
    igst: Math.round(totalIgst * 100) / 100,
    serviceCharge: Math.round(serviceCharge * 100) / 100,
    packagingFee: Math.round(packagingFee * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    savings: Math.round(savings * 100) / 100,
  };
}
