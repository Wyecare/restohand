import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CashfreeService } from './cashfree.service';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';

export interface OnboardRestaurantToCashfreeDto {
  restaurantId: string;
  scheduleOption?: number; // Default to instant settlement (17)
  forceUpdate?: boolean; // Force re-onboarding even if already exists
}

export interface CashfreeVendorResponse {
  vendorId: string;
  status: string;
  email: string;
  phone: string;
  name: string;
  bankAccount?: {
    accountNumber: string;
    accountHolder: string;
    ifsc: string;
  };
  scheduleOption: {
    scheduleId: number;
    settlementScheduleMessage: string;
  };
  kycStatus?: string;
  dashboardAccess: boolean;
}

@Injectable()
export class CashfreeVendorService {
  private readonly logger = new Logger(CashfreeVendorService.name);

  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    private readonly cashfreeService: CashfreeService,
  ) {}

  /**
   * Onboard restaurant as Cashfree vendor for Easy Split
   */
  async onboardRestaurantToCashfree(dto: OnboardRestaurantToCashfreeDto): Promise<CashfreeVendorResponse> {
    const restaurant = await this.restaurantModel.findById(dto.restaurantId);

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${dto.restaurantId} not found`);
    }

    // Check if already onboarded
    if (restaurant.cashfreeConfig?.vendorId && !dto.forceUpdate) {
      throw new BadRequestException('Restaurant already onboarded to Cashfree. Use forceUpdate=true to re-onboard.');
    }

    // Validate required fields for onboarding
    const validationErrors = this.validateRestaurantForOnboarding(restaurant);
    if (validationErrors.length > 0) {
      throw new BadRequestException(`Restaurant missing required fields: ${validationErrors.join(', ')}`);
    }

    const vendorId = `resto_${dto.restaurantId}`;
    const scheduleOption = dto.scheduleOption || 1; // Default to T+1 settlement (most commonly available)

    try {
      // Extract KYC values for debugging
      const panValue = restaurant.businessDetails?.panNumber || restaurant.documents?.pan;
      const gstValue = restaurant.businessDetails?.gst?.gstin || restaurant.documents?.gst;

      this.logger.log(`Vendor KYC values for ${restaurant.name}: PAN=${panValue}, GST=${gstValue}`);

      // Prepare vendor data
      const vendorParams = {
        vendorId,
        name: restaurant.name,
        email: restaurant.contactEmail || restaurant.email,
        phone: this.formatPhoneNumber(restaurant.contactPhone || restaurant.phone),
        bankAccount: restaurant.bankAccount ? {
          accountNumber: restaurant.bankAccount.accountNumber,
          accountHolder: restaurant.bankAccount.accountHolderName || restaurant.name,
          ifsc: restaurant.bankAccount.ifscCode,
        } : undefined,
        scheduleOption,
        kycDetails: {
          accountType: this.determineAccountType(restaurant),
          businessType: 'Food and Beverages',
          pan: panValue,
          gst: gstValue,
          cin: restaurant.documents?.cin,
        },
      };

      // Create vendor in Cashfree
      const vendor = await this.cashfreeService.createVendor(vendorParams);

      this.logger.log(`Restaurant ${restaurant.name} onboarded as Cashfree vendor: ${vendorId}`);

      // Update restaurant with Cashfree configuration
      const cashfreeConfig = {
        vendorId: vendor.vendor_id,
        status: vendor.status,
        onboardedAt: new Date(),
        kycStatus: vendor.kyc_details?.status || 'PENDING',
        scheduleOption: {
          scheduleId: scheduleOption,
          message: this.getScheduleMessage(scheduleOption),
        },
        lastSyncAt: new Date(),
      };

      await this.restaurantModel.findByIdAndUpdate(dto.restaurantId, {
        cashfreeConfig,
        'migrationStatus.cashfreeVendorOnboarded': true,
        'migrationStatus.cashfreeOnboardedAt': new Date(),
      });

      return {
        vendorId: vendor.vendor_id,
        status: vendor.status,
        email: vendor.email,
        phone: vendor.phone,
        name: vendor.name,
        bankAccount: vendorParams.bankAccount,
        scheduleOption: {
          scheduleId: scheduleOption,
          settlementScheduleMessage: this.getScheduleMessage(scheduleOption),
        },
        kycStatus: vendor.kyc_details?.status,
        dashboardAccess: vendor.dashboard_access || false,
      };
    } catch (error) {
      this.logger.error(`Failed to onboard restaurant ${dto.restaurantId} to Cashfree:`, error);

      if (error.message?.includes('vendor already exists')) {
        // Vendor exists, fetch existing details
        try {
          const existingVendor = await this.cashfreeService.getVendor(vendorId);

          // Update local database with existing vendor info
          await this.restaurantModel.findByIdAndUpdate(dto.restaurantId, {
            'cashfreeConfig.vendorId': existingVendor.vendor_id,
            'cashfreeConfig.status': existingVendor.status,
            'cashfreeConfig.lastSyncAt': new Date(),
          });

          return {
            vendorId: existingVendor.vendor_id,
            status: existingVendor.status,
            email: existingVendor.email,
            phone: existingVendor.phone,
            name: existingVendor.name,
            scheduleOption: existingVendor.schedule_option,
            kycStatus: existingVendor.kyc_details?.status,
            dashboardAccess: existingVendor.dashboard_access || false,
          };
        } catch (fetchError) {
          throw new InternalServerErrorException(`Vendor exists but failed to fetch details: ${fetchError.message}`);
        }
      }

      throw new InternalServerErrorException(`Failed to onboard restaurant to Cashfree: ${error.message}`);
    }
  }

  /**
   * Get Cashfree vendor status for restaurant
   */
  async getRestaurantVendorStatus(restaurantId: string): Promise<CashfreeVendorResponse | null> {
    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (!restaurant || !restaurant.cashfreeConfig?.vendorId) {
      return null;
    }

    try {
      // Fetch latest status from Cashfree
      const vendor = await this.cashfreeService.getVendor(restaurant.cashfreeConfig.vendorId);

      // Update local status if changed
      if (vendor.status !== restaurant.cashfreeConfig.status) {
        await this.updateRestaurantVendorStatus(restaurantId, vendor.status);
      }

      return {
        vendorId: vendor.vendor_id,
        status: vendor.status,
        email: vendor.email,
        phone: vendor.phone,
        name: vendor.name,
        scheduleOption: vendor.schedule_option,
        kycStatus: vendor.kyc_details?.status,
        dashboardAccess: vendor.dashboard_access || false,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch vendor status for restaurant ${restaurantId}:`, error);
      throw new InternalServerErrorException('Failed to fetch vendor status');
    }
  }

  /**
   * Update restaurant vendor status locally
   */
  async updateRestaurantVendorStatus(restaurantId: string, status: string): Promise<void> {
    const updateData = {
      'cashfreeConfig.status': status,
      'cashfreeConfig.lastSyncAt': new Date(),
    };

    if (status === 'ACTIVE') {
      updateData['cashfreeConfig.activatedAt'] = new Date();
    }

    await this.restaurantModel.findByIdAndUpdate(restaurantId, updateData);
    this.logger.log(`Updated Cashfree vendor status to ${status} for restaurant ${restaurantId}`);
  }

  /**
   * Check if restaurant can receive settlements
   */
  async canReceiveSettlements(restaurantId: string): Promise<boolean> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    return restaurant?.cashfreeConfig?.status === 'ACTIVE' ?? false;
  }

  /**
   * Get restaurant's vendor ID
   */
  async getRestaurantVendorId(restaurantId: string): Promise<string | null> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    return restaurant?.cashfreeConfig?.vendorId ?? null;
  }

  /**
   * Verify bank account for an existing vendor
   */
  async verifyRestaurantBankAccount(restaurantId: string): Promise<{
    success: boolean;
    vendorId: string;
    verificationStatus?: string;
    error?: string;
  }> {
    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }

    if (!restaurant.cashfreeConfig?.vendorId) {
      throw new BadRequestException('Restaurant is not onboarded to Cashfree. Please onboard first.');
    }

    // Validate bank account information exists
    if (!restaurant.bankAccount?.accountNumber || !restaurant.bankAccount?.ifscCode) {
      throw new BadRequestException('Bank account information is incomplete. Please update bank details first.');
    }

    try {
      const vendorId = restaurant.cashfreeConfig.vendorId;

      // Attempt verification through Cashfree
      const result = await this.cashfreeService.verifyVendorBankAccount(vendorId);

      // Update verification status in database
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'cashfreeConfig.bankVerificationStatus': 'VERIFIED',
        'cashfreeConfig.bankVerifiedAt': new Date(),
        'cashfreeConfig.lastSyncAt': new Date(),
      });

      this.logger.log(`Bank account verification successful for restaurant ${restaurantId}`);

      return {
        success: true,
        vendorId,
        verificationStatus: 'VERIFIED',
      };
    } catch (error) {
      this.logger.error(`Bank account verification failed for restaurant ${restaurantId}:`, error);

      // Update verification status as failed
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'cashfreeConfig.bankVerificationStatus': 'FAILED',
        'cashfreeConfig.bankVerificationError': error.message,
        'cashfreeConfig.lastSyncAt': new Date(),
      });

      return {
        success: false,
        vendorId: restaurant.cashfreeConfig.vendorId,
        verificationStatus: 'FAILED',
        error: error.message,
      };
    }
  }

  /**
   * Batch onboard multiple restaurants
   */
  async batchOnboardRestaurants(restaurantIds: string[], scheduleOption = 1): Promise<{
    successful: number;
    failed: number;
    results: Array<{ restaurantId: string; success: boolean; error?: string; vendorId?: string }>;
  }> {
    this.logger.log(`Starting batch onboarding for ${restaurantIds.length} restaurants`);

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const restaurantId of restaurantIds) {
      try {
        const result = await this.onboardRestaurantToCashfree({ restaurantId, scheduleOption });
        successful++;
        results.push({
          restaurantId,
          success: true,
          vendorId: result.vendorId,
        });
      } catch (error) {
        failed++;
        results.push({
          restaurantId,
          success: false,
          error: error.message,
        });
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.logger.log(`Batch onboarding completed: ${successful} successful, ${failed} failed`);
    return { successful, failed, results };
  }

  /**
   * Validate restaurant has required fields for Cashfree onboarding
   */
  private validateRestaurantForOnboarding(restaurant: RestaurantDocument): string[] {
    const errors: string[] = [];

    if (!restaurant.name) errors.push('restaurant name');
    if (!restaurant.contactEmail && !restaurant.email) errors.push('email address');
    if (!restaurant.contactPhone && !restaurant.phone) errors.push('phone number');

    // Bank account details required for settlements
    if (!restaurant.bankAccount?.accountNumber) errors.push('bank account number');
    if (!restaurant.bankAccount?.ifscCode) errors.push('IFSC code');
    if (!restaurant.bankAccount?.accountHolderName && !restaurant.name) errors.push('account holder name');

    // KYC documents required
    if (!restaurant.businessDetails?.panNumber && !restaurant.documents?.pan) errors.push('PAN number');

    return errors;
  }

  /**
   * Format phone number for Cashfree (must be 10 digits)
   */
  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    // Remove country code if present
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned.substring(2);
    }

    // Ensure 10 digits
    if (cleaned.length === 10) {
      return cleaned;
    }

    throw new BadRequestException(`Invalid phone number format: ${phone}. Must be 10 digits.`);
  }

  /**
   * Determine account type based on restaurant data
   */
  private determineAccountType(restaurant: RestaurantDocument): 'Individual' | 'Proprietorship' | 'Partnership' | 'Private Limited' | 'Public Limited' {
    const businessType = restaurant.businessDetails?.businessType;

    switch (businessType) {
      case 'sole_proprietorship':
        return 'Individual';
      case 'partnership':
        return 'Partnership';
      case 'private_limited':
        return 'Private Limited';
      case 'public_limited':
        return 'Public Limited';
      default:
        // Default to Proprietorship for backwards compatibility
        return 'Proprietorship';
    }
  }

  /**
   * Get human-readable schedule message
   */
  private getScheduleMessage(scheduleId: number): string {
    const scheduleMessages = {
      1: 'T+1 settlement at 11:00 AM',
      2: 'T+2 settlement at 11:00 AM',
      8: 'Instant settlement every hour 24×7',
      9: 'Instant settlement every 3 hours 24×7',
      14: 'Instant settlement every 15 minutes 24×7',
      17: 'Instant settlement every minute 24×7',
    };

    return scheduleMessages[scheduleId] || `Schedule option ${scheduleId}`;
  }
}