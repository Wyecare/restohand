import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RazorpayService } from './razorpay.service';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';

export interface CreateLinkedAccountDto {
  restaurantId: string;
  email?: string;
  phone?: string;
  businessType?: 'partnership' | 'proprietorship' | 'private_limited' | 'public_limited';
}

export interface LinkedAccountResponse {
  accountId: string;
  status: string;
  referenceId: string;
  canReceivePayments: boolean;
  activationUrl?: string;
}

@Injectable()
export class RestaurantOnboardingService {
  private readonly logger = new Logger(RestaurantOnboardingService.name);

  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    private readonly razorpayService: RazorpayService
  ) {}

  async createLinkedAccount(dto: CreateLinkedAccountDto): Promise<LinkedAccountResponse> {
    const restaurant = await this.restaurantModel.findById(dto.restaurantId);

    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${dto.restaurantId} not found`);
    }

    // Check if already has linked account
    if (restaurant.razorpayAccount?.accountId) {
      throw new BadRequestException('Restaurant already has a linked Razorpay account');
    }

    // Validate required fields
    const email = dto.email || restaurant.contactEmail;
    const phone = dto.phone || restaurant.contactPhone;

    if (!email || !phone) {
      throw new BadRequestException('Email and phone are required for linked account creation');
    }

    try {
      // Create linked account with Razorpay
      const linkedAccount = await this.razorpayService.createLinkedAccount({
        email,
        phone,
        type: 'route',
        reference_id: dto.restaurantId,
        legal_business_name: restaurant.legalName || restaurant.name,
        business_type: dto.businessType || 'partnership',
        profile: {
          category: 'healthcare',
          subcategory: 'clinic',
          addresses: {
            registered: {
              street1: restaurant.address.line1,
              street2: restaurant.address.line2 || '',
              city: restaurant.address.city,
              state: restaurant.address.state,
              postal_code: restaurant.address.postalCode,
              country: restaurant.address.country
            }
          }
        }
      });

      this.logger.log(`Created Razorpay linked account ${linkedAccount.id} for restaurant ${dto.restaurantId}`);

      // Update restaurant with linked account info
      await this.restaurantModel.findByIdAndUpdate(dto.restaurantId, {
        razorpayAccount: {
          accountId: linkedAccount.id,
          status: linkedAccount.status,
          createdAt: new Date(),
          referenceId: dto.restaurantId,
          canReceivePayments: linkedAccount.status === 'activated'
        }
      });

      return {
        accountId: linkedAccount.id,
        status: linkedAccount.status,
        referenceId: dto.restaurantId,
        canReceivePayments: linkedAccount.status === 'activated',
        activationUrl: linkedAccount.activation_url
      };

    } catch (error) {
      this.logger.error(`Failed to create linked account for restaurant ${dto.restaurantId}:`, error);

      if (error.response?.data) {
        throw new BadRequestException(`Razorpay error: ${error.response.data.error.description}`);
      }

      throw new InternalServerErrorException('Failed to create linked account');
    }
  }

  async getLinkedAccountStatus(restaurantId: string): Promise<LinkedAccountResponse | null> {
    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (!restaurant || !restaurant.razorpayAccount) {
      return null;
    }

    try {
      // Fetch latest status from Razorpay
      const account = await this.razorpayService.getLinkedAccount(restaurant.razorpayAccount.accountId);

      // Update local status if changed
      if (account.status !== restaurant.razorpayAccount.status) {
        await this.updateLinkedAccountStatus(restaurantId, account.status);
      }

      return {
        accountId: account.id,
        status: account.status,
        referenceId: restaurantId,
        canReceivePayments: account.status === 'activated'
      };

    } catch (error) {
      this.logger.error(`Failed to fetch linked account status for restaurant ${restaurantId}:`, error);
      throw new InternalServerErrorException('Failed to fetch account status');
    }
  }

  async updateLinkedAccountStatus(restaurantId: string, status: string): Promise<void> {
    const updateData: any = {
      'razorpayAccount.status': status,
      'razorpayAccount.canReceivePayments': status === 'activated'
    };

    if (status === 'activated') {
      updateData['razorpayAccount.activatedAt'] = new Date();
    }

    await this.restaurantModel.findByIdAndUpdate(restaurantId, updateData);

    this.logger.log(`Updated linked account status to ${status} for restaurant ${restaurantId}`);
  }

  async canReceivePayments(restaurantId: string): Promise<boolean> {
    const restaurant = await this.restaurantModel.findById(restaurantId);

    return restaurant?.razorpayAccount?.canReceivePayments ?? false;
  }

  async getLinkedAccountId(restaurantId: string): Promise<string | null> {
    const restaurant = await this.restaurantModel.findById(restaurantId);

    return restaurant?.razorpayAccount?.accountId ?? null;
  }
}