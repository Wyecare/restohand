import { Injectable } from '@nestjs/common';

export type RestaurantType = 'standalone' | 'hotel_under_7500' | 'hotel_above_7500' | 'catering_standalone' | 'catering_premium';

export interface GstBreakdown {
  subtotal: number;
  serviceChargeAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  grandTotal: number;
  isInterState: boolean;
}

export interface GstValidationResult {
  isValid: boolean;
  gstRate: 5 | 18;
  canClaimITC: boolean;
  errors: string[];
}

@Injectable()
export class GstService {
  private readonly INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh',
    'Dadra and Nagar Haveli', 'Daman and Diu', 'Lakshadweep', 'Puducherry'
  ];

  private readonly STATE_CODES = {
    'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
    'Chhattisgarh': '22', 'Goa': '30', 'Gujarat': '24', 'Haryana': '06',
    'Himachal Pradesh': '02', 'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32',
    'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17',
    'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Punjab': '03',
    'Rajasthan': '08', 'Sikkim': '11', 'Tamil Nadu': '33', 'Telangana': '36',
    'Tripura': '16', 'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19',
    'Delhi': '07', 'Chandigarh': '04', 'Dadra and Nagar Haveli': '26',
    'Daman and Diu': '25', 'Lakshadweep': '31', 'Puducherry': '34'
  };

  /**
   * Validate GST configuration based on restaurant type
   */
  validateGstConfiguration(
    establishmentType: RestaurantType,
    roomTariff?: number
  ): GstValidationResult {
    const errors: string[] = [];
    let gstRate: 5 | 18;
    let canClaimITC: boolean;

    switch (establishmentType) {
      case 'standalone':
        gstRate = 5;
        canClaimITC = false;
        break;

      case 'hotel_under_7500':
        gstRate = 5;
        canClaimITC = false;
        if (roomTariff && roomTariff >= 7500) {
          errors.push('Room tariff must be less than ₹7,500 for hotel_under_7500 category');
        }
        break;

      case 'hotel_above_7500':
        gstRate = 18;
        canClaimITC = true;
        if (roomTariff && roomTariff < 7500) {
          errors.push('Room tariff must be ₹7,500 or above for hotel_above_7500 category');
        }
        if (!roomTariff) {
          errors.push('Room tariff is required for premium hotel restaurants');
        }
        break;

      case 'catering_standalone':
        gstRate = 5;
        canClaimITC = false;
        break;

      case 'catering_premium':
        gstRate = 18;
        canClaimITC = true;
        break;

      default:
        errors.push('Invalid establishment type');
        gstRate = 5;
        canClaimITC = false;
    }

    return {
      isValid: errors.length === 0,
      gstRate,
      canClaimITC,
      errors
    };
  }

  /**
   * Validate GSTIN format and state code
   */
  validateGstin(gstin: string, businessState: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!gstin) {
      return { isValid: true, errors }; // GSTIN is optional
    }

    // Format validation
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstin)) {
      errors.push('Invalid GSTIN format. Must be 15 characters (e.g., 29ABCDE1234F1Z5)');
      return { isValid: false, errors };
    }

    // State code validation
    const gstinStateCode = gstin.substring(0, 2);
    const expectedStateCode = this.STATE_CODES[businessState];

    if (!expectedStateCode) {
      errors.push('Invalid business state');
    } else if (gstinStateCode !== expectedStateCode) {
      errors.push(`GSTIN state code (${gstinStateCode}) does not match business state (${businessState})`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate GST breakdown for a bill
   */
  calculateGstBreakdown(
    subtotal: number,
    gstRate: number,
    businessState: string,
    customerState: string,
    enableServiceCharge: boolean = false,
    serviceChargeRate: number = 0
  ): GstBreakdown {
    // Calculate service charge
    const serviceChargeAmount = enableServiceCharge ? (subtotal * serviceChargeRate) / 100 : 0;
    const taxableAmount = subtotal + serviceChargeAmount;

    // Determine if inter-state transaction
    const isInterState = businessState.toLowerCase() !== customerState.toLowerCase();

    // Calculate GST amounts
    const totalGstAmount = (taxableAmount * gstRate) / 100;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;

    if (isInterState) {
      // Inter-state: Use IGST
      igstAmount = totalGstAmount;
      igstRate = gstRate;
    } else {
      // Intra-state: Split between CGST and SGST
      cgstAmount = totalGstAmount / 2;
      sgstAmount = totalGstAmount / 2;
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
    }

    const grandTotal = taxableAmount + totalGstAmount;

    return {
      subtotal,
      serviceChargeAmount,
      taxableAmount,
      gstRate,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount: Math.round(cgstAmount * 100) / 100, // Round to 2 decimals
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: Math.round(igstAmount * 100) / 100,
      totalGstAmount: Math.round(totalGstAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      isInterState
    };
  }

  /**
   * Get establishment type display name
   */
  getEstablishmentTypeDisplay(type: RestaurantType): string {
    const displayNames = {
      'standalone': 'Standalone Restaurant',
      'hotel_under_7500': 'Hotel Restaurant (Budget)',
      'hotel_above_7500': 'Hotel Restaurant (Premium)',
      'catering_standalone': 'Catering Services',
      'catering_premium': 'Premium Catering Services'
    };
    return displayNames[type] || 'Restaurant';
  }

  /**
   * Check if state is valid
   */
  isValidState(state: string): boolean {
    return this.INDIAN_STATES.includes(state);
  }

  /**
   * Get all Indian states
   */
  getIndianStates(): string[] {
    return [...this.INDIAN_STATES];
  }

  /**
   * Get state code for a state
   */
  getStateCode(state: string): string | undefined {
    return this.STATE_CODES[state];
  }
}