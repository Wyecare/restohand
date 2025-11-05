import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant } from './schemas/restaurant.schema';
import { RazorpayService } from '../payments/razorpay.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';

export interface RestaurantOnboardingData {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  businessType:
    | 'sole_proprietorship'
    | 'partnership'
    | 'private_limited'
    | 'public_limited';
  gstNumber?: string;
  panNumber?: string;
  bankAccount: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
}

@Injectable()
export class RestaurantOnboardingService {
  private readonly logger = new Logger(RestaurantOnboardingService.name);

  constructor(
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
    private readonly razorpayService: RazorpayService,
    private readonly usersService: UsersService
  ) {}

  async onboardRestaurant(
    ownerId: string,
    data: RestaurantOnboardingData
  ): Promise<Restaurant> {
    this.logger.log(`Starting SaaS onboarding for restaurant: ${data.name}`);

    try {
      // 1. Attempt to create Razorpay linked account for direct settlement
      let linkedAccountId = null;
      let canReceivePayments = false;
      let paymentStatus = 'pending_setup';
      let setupError = null;

      try {
        this.logger.log(`Attempting to create Razorpay linked account for ${data.name}`);

        // Check if Route feature is available (RBI compliance requirement)
        const isRouteEnabled = process.env.RAZORPAY_ROUTE_ENABLED === 'true';

        if (!isRouteEnabled) {
          this.logger.warn('Route feature not enabled - using standard payment flow');
          setupError = 'Route feature requires RBI compliance verification. Contact support to enable.';
          paymentStatus = 'route_not_available';
          canReceivePayments = false; // Will use standard payment flow
        } else {
          const linkedAccountData = {
            email: data.email,
            phone: data.phone,
            type: 'standard',
            reference_id: `restaurant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            legal_business_name: data.name,
            business_type: data.businessType,
            profile: {
              category: 'food_and_beverages',
              subcategory: 'restaurant',
              addresses: {
                registered: {
                  street1: data.address.street,
                  street2: '',
                  city: data.address.city,
                  state: data.address.state,
                  postal_code: data.address.postalCode,
                  country: data.address.country,
                }
              }
            }
          };

          const linkedAccount = await this.razorpayService.createLinkedAccount(linkedAccountData);
          linkedAccountId = linkedAccount.id;
          paymentStatus = 'pending_approval';
          canReceivePayments = linkedAccount.status === 'activated';

          this.logger.log(`Linked account created successfully: ${linkedAccountId}, status: ${linkedAccount.status}`);
        }
      } catch (razorpayError) {
        this.logger.warn(`Failed to create Razorpay linked account: ${razorpayError.message}`);

        // Check if it's a Route access denied error
        if (razorpayError.error?.code === 'BAD_REQUEST_ERROR' && razorpayError.error?.description === 'Access Denied') {
          this.logger.warn('Route feature access denied - likely RBI compliance requirements not met');
          setupError = 'Route feature requires RBI compliance verification (₹40L+ turnover). Using standard payments.';
          paymentStatus = 'route_not_available';
        } else {
          setupError = razorpayError.message;
          paymentStatus = 'pending_setup';
        }

        this.logger.warn('Continuing onboarding - restaurant can still accept payments via standard flow');
        canReceivePayments = false;
        // Continue with onboarding even if linked account creation fails
      }

      // 2. Create restaurant with SaaS configuration
      const restaurant = new this.restaurantModel({
        name: data.name,
        slug: this.generateSlug(data.name),
        email: data.email,
        phone: data.phone,
        address: {
          line1: data.address.street,
          city: data.address.city,
          state: data.address.state,
          postalCode: data.address.postalCode,
          country: data.address.country,
        },
        upi: {
          vpa: `${data.email.split('@')[0]}@upi`, // Generate UPI VPA from email
          displayName: data.name,
          mode: 'static',
        },
        ownerId,

        // SaaS Configuration
        saasConfig: {
          plan: 'starter', // Default plan
          billingCycle: 'monthly',
          subscriptionStatus: 'trial', // 30-day free trial
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          monthlyPrice: 99900, // ₹999 in paise
        },

        // Payment Configuration
        paymentConfig: {
          linkedAccountId,
          razorpayContactId: null,
          razorpayFundAccountId: null,
          canReceivePayments,
          directSettlement: !!linkedAccountId,
          settlementType: linkedAccountId ? 'instant' : 'scheduled',
          status: paymentStatus,
          error: setupError,
          setupAttempts: setupError ? 1 : 0,
          lastAttempt: setupError ? new Date() : undefined,
          approvedAt: canReceivePayments ? new Date() : undefined,
        },

        // Business Details
        businessDetails: {
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          businessType: data.businessType,
        },

        // Bank Account
        bankAccount: {
          ...data.bankAccount,
          verified: false, // Will be verified by Razorpay
        },

        // Default settings
        settings: {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          operatingHours: {
            monday: { open: '09:00', close: '22:00', isOpen: true },
            tuesday: { open: '09:00', close: '22:00', isOpen: true },
            wednesday: { open: '09:00', close: '22:00', isOpen: true },
            thursday: { open: '09:00', close: '22:00', isOpen: true },
            friday: { open: '09:00', close: '22:00', isOpen: true },
            saturday: { open: '09:00', close: '22:00', isOpen: true },
            sunday: { open: '09:00', close: '22:00', isOpen: true },
          },
        },

        isActive: true,
        createdAt: new Date(),
      });

      const savedRestaurant = await restaurant.save();

      this.logger.log(
        `Restaurant onboarded successfully with SaaS model: ${savedRestaurant.id}`
      );

      // 3. Associate user with restaurant and set Firebase claims
      const actor = {
        uid: ownerId,
        email: data.email,
        displayName: data.name,
        phoneNumber: data.phone,
        roles: [UserRole.Manager],
        claims: {},
      };

      await this.usersService.attachRestaurantToUser(
        actor,
        savedRestaurant.id,
        [UserRole.Manager]
      );

      this.logger.log(
        `User ${ownerId} attached to restaurant ${savedRestaurant.id}`
      );

      // 4. Schedule first subscription billing (after trial)
      await this.scheduleTrialEnd(
        savedRestaurant.id,
        savedRestaurant.saasConfig.trialEndsAt
      );

      return savedRestaurant;
    } catch (error) {
      console.log(error, 'error');
      this.logger.error(
        `Failed to onboard restaurant: ${error.message}`,
        error.stack
      );
      throw new BadRequestException(
        `Restaurant onboarding failed: ${error.message}`
      );
    }
  }

  async canReceivePayments(restaurantId: string): Promise<boolean> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    return restaurant?.paymentConfig?.canReceivePayments || false;
  }

  async getLinkedAccountId(restaurantId: string): Promise<string | null> {
    const restaurant = await this.restaurantModel.findById(restaurantId);
    return restaurant?.paymentConfig?.linkedAccountId || null;
  }

  async getSubscriptionStatus(restaurantId: string) {
    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (!restaurant) {
      throw new BadRequestException('Restaurant not found');
    }

    const now = new Date();
    const isTrialActive = restaurant.saasConfig.trialEndsAt > now;
    const isSubscriptionActive =
      restaurant.saasConfig.subscriptionStatus === 'active';

    return {
      plan: restaurant.saasConfig.plan,
      status: restaurant.saasConfig.subscriptionStatus,
      isActive: isTrialActive || isSubscriptionActive,
      trialEndsAt: restaurant.saasConfig.trialEndsAt,
      nextBillingDate: restaurant.saasConfig.nextBillingDate,
      monthlyPrice: restaurant.saasConfig.monthlyPrice,
    };
  }

  async updateSubscriptionStatus(
    restaurantId: string,
    status: 'active' | 'suspended' | 'cancelled'
  ) {
    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      'saasConfig.subscriptionStatus': status,
      'saasConfig.lastUpdated': new Date(),
    });
  }

  async setupLinkedAccount(restaurantId: string): Promise<{
    success: boolean;
    linkedAccountId?: string;
    status?: string;
    error?: string;
  }> {
    this.logger.log(`Setting up linked account for restaurant: ${restaurantId}`);

    try {
      const restaurant = await this.restaurantModel.findById(restaurantId);
      if (!restaurant) {
        throw new BadRequestException('Restaurant not found');
      }

      // Check if already has a linked account
      if (restaurant.paymentConfig?.linkedAccountId) {
        this.logger.log(`Restaurant ${restaurantId} already has linked account: ${restaurant.paymentConfig.linkedAccountId}`);

        // Check current status from Razorpay
        const status = await this.razorpayService.getLinkedAccountStatus(restaurant.paymentConfig.linkedAccountId);

        // Update local status
        await this.restaurantModel.findByIdAndUpdate(restaurantId, {
          'paymentConfig.status': status.canReceivePayments ? 'approved' : 'pending_approval',
          'paymentConfig.canReceivePayments': status.canReceivePayments,
          'paymentConfig.approvedAt': status.canReceivePayments ? new Date() : undefined,
          'paymentConfig.error': status.details.error || null,
        });

        return {
          success: true,
          linkedAccountId: restaurant.paymentConfig.linkedAccountId,
          status: status.status,
        };
      }

      // Create new linked account
      const linkedAccountData = {
        email: restaurant.email || restaurant.contactEmail || `contact@${restaurant.slug}.com`,
        phone: restaurant.phone || restaurant.contactPhone || '9999999999',
        type: 'standard',
        reference_id: `restaurant_${restaurantId}_${Date.now()}`,
        legal_business_name: restaurant.legalName || restaurant.name,
        business_type: restaurant.businessDetails?.businessType || 'sole_proprietorship',
        profile: {
          category: 'food_and_beverages',
          subcategory: 'restaurant',
          addresses: {
            registered: {
              street1: restaurant.address.line1,
              street2: restaurant.address.line2 || '',
              city: restaurant.address.city,
              state: restaurant.address.state,
              postal_code: restaurant.address.postalCode,
              country: restaurant.address.country,
            }
          }
        }
      };

      const linkedAccount = await this.razorpayService.createLinkedAccount(linkedAccountData);

      // Update restaurant with linked account details
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'paymentConfig.linkedAccountId': linkedAccount.id,
        'paymentConfig.status': 'pending_approval',
        'paymentConfig.canReceivePayments': linkedAccount.status === 'activated',
        'paymentConfig.directSettlement': true,
        'paymentConfig.settlementType': 'instant',
        'paymentConfig.setupAttempts': (restaurant.paymentConfig?.setupAttempts || 0) + 1,
        'paymentConfig.lastAttempt': new Date(),
        'paymentConfig.error': null,
        'paymentConfig.approvedAt': linkedAccount.status === 'activated' ? new Date() : undefined,
      });

      this.logger.log(`Linked account created successfully for restaurant ${restaurantId}: ${linkedAccount.id}`);

      return {
        success: true,
        linkedAccountId: linkedAccount.id,
        status: linkedAccount.status,
      };

    } catch (error) {
      this.logger.error(`Failed to setup linked account for restaurant ${restaurantId}: ${error.message}`, error.stack);

      // Update error details
      const restaurant = await this.restaurantModel.findById(restaurantId);
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        'paymentConfig.status': 'pending_setup',
        'paymentConfig.error': error.message,
        'paymentConfig.setupAttempts': (restaurant?.paymentConfig?.setupAttempts || 0) + 1,
        'paymentConfig.lastAttempt': new Date(),
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  private async scheduleTrialEnd(restaurantId: string, trialEndDate: Date) {
    // This would integrate with a job queue like Bull or Agenda
    // For now, we'll handle this in the subscription service
    this.logger.log(
      `Trial scheduled to end for restaurant ${restaurantId} on ${trialEndDate}`
    );
  }
}
