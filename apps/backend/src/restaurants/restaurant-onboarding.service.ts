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
      // 1. Create Razorpay contact and fund account for transfers
      let razorpayContactId = null;
      let razorpayFundAccountId = null;
      let canReceivePayments = false;

      try {
        // For now, skip complex transfers setup and use direct settlement via linked accounts
        // This will be handled separately when restaurant sets up payment acceptance
        this.logger.log('Skipping contact/fund account creation - will use linked accounts for direct settlement');
        canReceivePayments = false; // Will be enabled when linked account is set up
      } catch (razorpayError) {
        this.logger.warn(`Failed to create Razorpay contact/fund account: ${razorpayError.message}`);
        this.logger.warn('Continuing onboarding without transfers - restaurant can still process orders');
        // Continue with onboarding even if contact/fund account creation fails
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
          linkedAccountId: null, // Not using Route feature
          razorpayContactId,
          razorpayFundAccountId,
          canReceivePayments,
          directSettlement: !!razorpayFundAccountId,
          settlementType: razorpayFundAccountId ? 'transfers' : 'scheduled',
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
