import { Injectable } from '@nestjs/common';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  foodCategory?: 'cooked_food' | 'fresh_items' | 'packaged_items' | 'beverages' | 'alcohol' | 'sweets' | 'ice_cream';
}

export interface RestaurantGstConfig {
  establishmentType: 'standalone' | 'hotel_under_7500' | 'hotel_above_7500' | 'catering_standalone' | 'catering_premium';
  defaultGstRate: 5 | 18;
  canClaimITC: boolean;
  businessState: string;
  gstin?: string;
  enableServiceCharge: boolean;
  serviceChargeRate?: number;
  isGstEnabled: boolean;
}

export interface BranchCharge {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  applicableFor: 'dine_in' | 'takeout' | 'delivery' | 'all';
  isActive: boolean;
  includedInGst: boolean;
  sortOrder: number;
}

export interface BillCalculation {
  // Item totals
  subtotal: number;

  // Service charge
  serviceChargeRate: number;
  serviceChargeAmount: number;

  // Branch-specific charges
  branchCharges: Array<{
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
    includedInGst: boolean;
  }>;
  totalBranchCharges: number;

  // Subtotal with all charges
  subtotalWithCharges: number;

  // GST breakdown
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;

  // Final amounts
  grandTotal: number;
  isInterState: boolean;

  // Tax type for storage
  taxType: 'intra-state' | 'inter-state';
}

export interface CategoryTaxCalculation {
  category: 'cooked_food' | 'fresh_items' | 'packaged_items' | 'beverages' | 'alcohol' | 'sweets' | 'ice_cream';
  items: CartItem[];
  subtotal: number;
  taxType: 'gst' | 'vat' | 'exempt';
  gstRate?: number;
  vatRate?: number;
  gstAmount?: number;
  vatAmount?: number;
  totalTaxAmount: number;
  totalWithTax: number;
}

export interface MixedBillCalculation extends Omit<BillCalculation, 'gstRate' | 'cgstRate' | 'sgstRate' | 'igstRate' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'totalGstAmount'> {
  // Category breakdowns
  categoryCalculations: CategoryTaxCalculation[];

  // Tax totals
  totalGstAmount: number;
  totalVatAmount: number;
  totalTaxAmount: number;

  // GST breakdown (only for items subject to GST)
  gstSubtotal: number; // Subtotal of GST-eligible items
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;

  // VAT breakdown (for alcohol)
  vatSubtotal: number; // Subtotal of VAT-eligible items
  stateVatAmount: number;

  // Exempt items
  exemptSubtotal: number; // Subtotal of tax-exempt items
}

@Injectable()
export class RestaurantBillingService {

  /**
   * Calculate complete bill breakdown for Indian restaurants
   * Implements the correct GST calculation: Items → Subtotal → Service Charge → Branch Charges → GST → Grand Total
   */
  calculateBill(
    items: CartItem[],
    gstConfig: RestaurantGstConfig,
    customerState?: string,
    branchCharges?: BranchCharge[],
    orderType: 'dine_in' | 'takeout' | 'delivery' = 'dine_in'
  ): BillCalculation {

    // Step 1: Calculate subtotal (sum of all item totals)
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Step 2: Calculate service charge (if enabled)
    const serviceChargeRate = gstConfig.enableServiceCharge ? (gstConfig.serviceChargeRate || 0) : 0;
    const serviceChargeAmount = subtotal * (serviceChargeRate / 100);

    // Step 3: Calculate applicable branch charges
    const applicableBranchCharges = (branchCharges || [])
      .filter(charge =>
        charge.isActive &&
        (charge.applicableFor === 'all' || charge.applicableFor === orderType)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const calculatedBranchCharges: Array<{
      name: string;
      type: 'percentage' | 'fixed';
      value: number;
      amount: number;
      includedInGst: boolean;
    }> = [];

    let subtotalWithService = subtotal + serviceChargeAmount;
    let totalBranchCharges = 0;

    // Calculate each branch charge sequentially
    for (const charge of applicableBranchCharges) {
      let chargeAmount: number;
      if (charge.type === 'percentage') {
        chargeAmount = subtotalWithService * (charge.value / 100);
      } else {
        chargeAmount = charge.value; // Fixed amount in paise
      }

      calculatedBranchCharges.push({
        name: charge.name,
        type: charge.type,
        value: charge.value,
        amount: chargeAmount,
        includedInGst: charge.includedInGst,
      });

      totalBranchCharges += chargeAmount;
      subtotalWithService += chargeAmount;
    }

    // Step 4: Calculate taxable amount (only include charges that are included in GST)
    const taxableCharges = calculatedBranchCharges
      .filter(charge => charge.includedInGst)
      .reduce((sum, charge) => sum + charge.amount, 0);

    const taxableAmount = subtotal + serviceChargeAmount + taxableCharges;

    // Step 5: Calculate GST on taxable amount
    const gstRate = gstConfig.isGstEnabled ? gstConfig.defaultGstRate : 0;
    const totalGstAmount = taxableAmount * (gstRate / 100);

    // Step 6: Determine if intra-state or inter-state transaction
    const customerStateNormalized = customerState?.trim() || gstConfig.businessState;
    const isInterState = customerStateNormalized.toLowerCase() !== gstConfig.businessState.toLowerCase();

    // Step 7: Calculate CGST/SGST or IGST
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;

    if (totalGstAmount > 0) {
      if (isInterState) {
        // Inter-state: Full amount as IGST
        igstAmount = totalGstAmount;
        igstRate = gstRate;
      } else {
        // Intra-state: Split equally between CGST and SGST
        cgstAmount = totalGstAmount / 2;
        sgstAmount = totalGstAmount / 2;
        cgstRate = gstRate / 2;
        sgstRate = gstRate / 2;
      }
    }

    // Step 8: Calculate grand total
    const grandTotal = subtotalWithService + totalGstAmount;

    return {
      subtotal: this.roundToTwo(subtotal),
      serviceChargeRate,
      serviceChargeAmount: this.roundToTwo(serviceChargeAmount),
      branchCharges: calculatedBranchCharges.map(charge => ({
        ...charge,
        amount: this.roundToTwo(charge.amount),
      })),
      totalBranchCharges: this.roundToTwo(totalBranchCharges),
      subtotalWithCharges: this.roundToTwo(subtotalWithService),
      gstRate,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount: this.roundToTwo(cgstAmount),
      sgstAmount: this.roundToTwo(sgstAmount),
      igstAmount: this.roundToTwo(igstAmount),
      totalGstAmount: this.roundToTwo(totalGstAmount),
      grandTotal: this.roundToTwo(grandTotal),
      isInterState,
      taxType: isInterState ? 'inter-state' : 'intra-state'
    };
  }

  /**
   * Format bill for receipt display (matches Nawras Restaurant example from docs)
   */
  formatBillReceipt(bill: BillCalculation): string {
    const lines: string[] = [];

    lines.push('─'.repeat(40));
    lines.push(`Subtotal:          ₹${bill.subtotal.toFixed(2)}`);

    if (bill.serviceChargeAmount > 0) {
      lines.push(`Service Charge (${bill.serviceChargeRate}%): ₹${bill.serviceChargeAmount.toFixed(2)}`);
    }

    // Add branch charges
    if (bill.branchCharges && bill.branchCharges.length > 0) {
      for (const charge of bill.branchCharges) {
        const chargeLabel = charge.type === 'percentage'
          ? `${charge.name} (${charge.value}%)`
          : charge.name;
        lines.push(`${chargeLabel}: ₹${charge.amount.toFixed(2)}`);
      }
    }

    if (bill.serviceChargeAmount > 0 || bill.totalBranchCharges > 0) {
      lines.push('─'.repeat(40));
      lines.push(`Subtotal:          ₹${bill.subtotalWithCharges.toFixed(2)}`);
    }

    if (bill.totalGstAmount > 0) {
      lines.push('─'.repeat(40));

      if (bill.isInterState) {
        lines.push(`IGST @ ${bill.igstRate}%:    ₹${bill.igstAmount.toFixed(2)}`);
      } else {
        lines.push(`CGST @ ${bill.cgstRate}%:   ₹${bill.cgstAmount.toFixed(2)}`);
        lines.push(`SGST @ ${bill.sgstRate}%:   ₹${bill.sgstAmount.toFixed(2)}`);
      }
    }

    lines.push('─'.repeat(40));
    lines.push(`Grand Total:       ₹${bill.grandTotal.toFixed(2)}`);
    lines.push('─'.repeat(40));

    return lines.join('\n');
  }

  /**
   * Validate that restaurant has proper GST configuration
   */
  validateGstConfig(gstConfig: RestaurantGstConfig | undefined): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!gstConfig) {
      errors.push('Restaurant GST configuration is missing');
      return { isValid: false, errors };
    }

    if (!gstConfig.establishmentType) {
      errors.push('Restaurant establishment type is not configured');
    }

    if (!gstConfig.businessState) {
      errors.push('Restaurant business state is not configured');
    }

    if (gstConfig.defaultGstRate !== 5 && gstConfig.defaultGstRate !== 18) {
      errors.push('Invalid GST rate. Must be 5% or 18%');
    }

    if (gstConfig.enableServiceCharge && (!gstConfig.serviceChargeRate || gstConfig.serviceChargeRate < 0 || gstConfig.serviceChargeRate > 50)) {
      errors.push('Invalid service charge rate. Must be between 0-50%');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate mixed bill with category-based taxation (GST for food, VAT for alcohol, exempt for fresh items)
   */
  calculateMixedBill(
    items: CartItem[],
    gstConfig: RestaurantGstConfig,
    customerState?: string,
    branchCharges?: BranchCharge[],
    orderType: 'dine_in' | 'takeout' | 'delivery' = 'dine_in'
  ): MixedBillCalculation {

    // Step 1: Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Step 2: Calculate service charge
    const serviceChargeRate = gstConfig.enableServiceCharge ? (gstConfig.serviceChargeRate || 0) : 0;
    const serviceChargeAmount = subtotal * (serviceChargeRate / 100);

    // Step 3: Calculate branch charges (same as regular billing)
    const applicableBranchCharges = (branchCharges || [])
      .filter(charge =>
        charge.isActive &&
        (charge.applicableFor === 'all' || charge.applicableFor === orderType)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const calculatedBranchCharges = [];
    let subtotalWithService = subtotal + serviceChargeAmount;
    let totalBranchCharges = 0;

    for (const charge of applicableBranchCharges) {
      let chargeAmount: number;
      if (charge.type === 'percentage') {
        chargeAmount = subtotalWithService * (charge.value / 100);
      } else {
        chargeAmount = charge.value;
      }

      calculatedBranchCharges.push({
        name: charge.name,
        type: charge.type,
        value: charge.value,
        amount: chargeAmount,
        includedInGst: charge.includedInGst,
      });

      totalBranchCharges += chargeAmount;
      subtotalWithService += chargeAmount;
    }

    // Step 4: Group items by food category
    const categorizedItems = this.categorizeItems(items);

    // Step 5: Calculate taxes per category
    const categoryCalculations: CategoryTaxCalculation[] = [];
    let totalGstAmount = 0;
    let totalVatAmount = 0;
    let gstSubtotal = 0;
    let vatSubtotal = 0;
    let exemptSubtotal = 0;

    for (const [category, categoryItems] of categorizedItems.entries()) {
      const categorySubtotal = categoryItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Determine tax treatment for this category
      const taxInfo = this.getCategoryTaxInfo(category, gstConfig);

      let categoryTaxAmount = 0;
      let categoryTotal = categorySubtotal;

      if (taxInfo.taxType === 'gst' && gstConfig.isGstEnabled) {
        categoryTaxAmount = categorySubtotal * (taxInfo.gstRate! / 100);
        categoryTotal = categorySubtotal + categoryTaxAmount;
        totalGstAmount += categoryTaxAmount;
        gstSubtotal += categorySubtotal;
      } else if (taxInfo.taxType === 'vat') {
        categoryTaxAmount = categorySubtotal * (taxInfo.vatRate! / 100);
        categoryTotal = categorySubtotal + categoryTaxAmount;
        totalVatAmount += categoryTaxAmount;
        vatSubtotal += categorySubtotal;
      } else {
        // Exempt items
        exemptSubtotal += categorySubtotal;
      }

      categoryCalculations.push({
        category,
        items: categoryItems,
        subtotal: this.roundToTwo(categorySubtotal),
        taxType: taxInfo.taxType,
        gstRate: taxInfo.gstRate,
        vatRate: taxInfo.vatRate,
        gstAmount: taxInfo.taxType === 'gst' ? this.roundToTwo(categoryTaxAmount) : undefined,
        vatAmount: taxInfo.taxType === 'vat' ? this.roundToTwo(categoryTaxAmount) : undefined,
        totalTaxAmount: this.roundToTwo(categoryTaxAmount),
        totalWithTax: this.roundToTwo(categoryTotal),
      });
    }

    // Step 6: Calculate CGST/SGST/IGST breakdown for GST portion
    const isInterState = customerState &&
      customerState.trim().toLowerCase() !== gstConfig.businessState.toLowerCase();

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (totalGstAmount > 0) {
      if (isInterState) {
        igstAmount = totalGstAmount;
      } else {
        cgstAmount = totalGstAmount / 2;
        sgstAmount = totalGstAmount / 2;
      }
    }

    // Step 7: Calculate final total
    const totalTaxAmount = totalGstAmount + totalVatAmount;
    const grandTotal = subtotalWithService + totalTaxAmount;

    return {
      subtotal: this.roundToTwo(subtotal),
      serviceChargeRate,
      serviceChargeAmount: this.roundToTwo(serviceChargeAmount),
      branchCharges: calculatedBranchCharges.map(charge => ({
        ...charge,
        amount: this.roundToTwo(charge.amount),
      })),
      totalBranchCharges: this.roundToTwo(totalBranchCharges),
      subtotalWithCharges: this.roundToTwo(subtotalWithService),

      // Category-specific calculations
      categoryCalculations,

      // Tax totals
      totalGstAmount: this.roundToTwo(totalGstAmount),
      totalVatAmount: this.roundToTwo(totalVatAmount),
      totalTaxAmount: this.roundToTwo(totalTaxAmount),

      // GST breakdown
      gstSubtotal: this.roundToTwo(gstSubtotal),
      cgstAmount: this.roundToTwo(cgstAmount),
      sgstAmount: this.roundToTwo(sgstAmount),
      igstAmount: this.roundToTwo(igstAmount),

      // VAT breakdown
      vatSubtotal: this.roundToTwo(vatSubtotal),
      stateVatAmount: this.roundToTwo(totalVatAmount),

      // Exempt items
      exemptSubtotal: this.roundToTwo(exemptSubtotal),

      // Final amounts
      grandTotal: this.roundToTwo(grandTotal),
      isInterState: isInterState || false,
      taxType: isInterState ? 'inter-state' : 'intra-state',
    };
  }

  /**
   * Group items by their food category
   */
  private categorizeItems(items: CartItem[]): Map<string, CartItem[]> {
    const categorized = new Map<string, CartItem[]>();

    for (const item of items) {
      const category = item.foodCategory || 'cooked_food'; // Default to cooked_food

      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(item);
    }

    return categorized;
  }

  /**
   * Get tax information for a food category
   */
  private getCategoryTaxInfo(
    category: string,
    gstConfig: RestaurantGstConfig
  ): { taxType: 'gst' | 'vat' | 'exempt'; gstRate?: number; vatRate?: number } {

    switch (category) {
      case 'alcohol':
        return {
          taxType: 'vat',
          vatRate: this.getStateVatRate(gstConfig.businessState)
        };

      case 'fresh_items':
        return { taxType: 'exempt' };

      case 'cooked_food':
      case 'beverages':
      case 'packaged_items':
      case 'sweets':
      case 'ice_cream':
      default:
        return {
          taxType: 'gst',
          gstRate: gstConfig.defaultGstRate
        };
    }
  }

  /**
   * Get state VAT rate for alcoholic beverages
   * This should be configurable per state, but for now using reasonable defaults
   */
  private getStateVatRate(state: string): number {
    // Default VAT rates for alcohol by state
    const stateVatRates: Record<string, number> = {
      'Karnataka': 20,
      'Maharashtra': 25,
      'Tamil Nadu': 20,
      'Kerala': 25,
      'Delhi': 20,
      'Goa': 20,
      'Gujarat': 25, // Dry state, but for completeness
      'Rajasthan': 25,
      'Punjab': 20,
      'Haryana': 25,
      'Uttar Pradesh': 20,
      'West Bengal': 20,
    };

    return stateVatRates[state] || 20; // Default 20% if state not found
  }

  /**
   * Helper function for rounding to 2 decimal places (paisa level)
   */
  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }
}