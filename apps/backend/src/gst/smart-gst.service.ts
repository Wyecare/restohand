import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { FoodCategoryService, FoodCategory } from './food-category.service';

export interface OrderItemGstData {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

export interface OrderItemWithGst extends OrderItemGstData {
  // Tax details
  foodCategory: FoodCategory;
  hsnCode: string;
  gstRate: number;
  exemptFromGst: boolean;
  useStateVat: boolean;

  // Calculated amounts
  taxableAmount: number;    // After discount
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalWithTax: number;
  lineTotal: number;        // Final amount including tax
}

export interface OrderGstSummary {
  subtotal: number;         // Total before tax and discount
  discountAmount: number;   // Total discount
  taxableAmount: number;    // Subtotal - discount
  cgstAmount: number;       // Total CGST
  sgstAmount: number;       // Total SGST
  igstAmount: number;       // Total IGST
  totalTaxAmount: number;   // Total GST
  totalAmount: number;      // Final amount
  taxType: 'intra-state' | 'inter-state';

  // ITC tracking (for 18% GST restaurants)
  itcEligibleAmount: number;
}

@Injectable()
export class SmartGstService {
  private readonly logger = new Logger(SmartGstService.name);

  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(MenuItem.name)
    private readonly menuItemModel: Model<MenuItemDocument>,
    private readonly foodCategoryService: FoodCategoryService
  ) {}

  /**
   * Main method: Calculate GST for an entire order
   */
  async calculateOrderGst(
    restaurantId: string,
    orderItems: OrderItemGstData[],
    customerState?: string
  ): Promise<{
    items: OrderItemWithGst[];
    summary: OrderGstSummary;
  }> {
    // Get restaurant configuration
    const restaurant = await this.getRestaurantGstConfig(restaurantId);
    if (!restaurant) {
      throw new Error(`Restaurant ${restaurantId} not found`);
    }

    const { businessDetails } = restaurant;
    const { gst: gstConfig } = businessDetails;

    // Determine tax type (intra-state vs inter-state)
    const customerStateCode = customerState || gstConfig.businessState;
    const taxType: 'intra-state' | 'inter-state' =
      customerStateCode === gstConfig.businessState ? 'intra-state' : 'inter-state';

    // Get menu items with GST configuration
    const menuItemIds = orderItems.map(item => item.menuItemId);
    const menuItems = await this.menuItemModel
      .find({ _id: { $in: menuItemIds }, restaurantId })
      .lean();

    const menuMap = new Map(menuItems.map(item => [item._id.toString(), item]));

    // Calculate GST for each item
    const itemsWithGst: OrderItemWithGst[] = [];
    let subtotal = 0;
    let totalDiscountAmount = 0;
    let totalTaxAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let itcEligibleAmount = 0;

    for (const orderItem of orderItems) {
      const menuItem = menuMap.get(orderItem.menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item ${orderItem.menuItemId} not found`);
      }

      const itemGst = this.calculateItemGst(
        orderItem,
        menuItem,
        gstConfig,
        taxType
      );

      itemsWithGst.push(itemGst);

      // Accumulate totals
      subtotal += itemGst.unitPrice * itemGst.quantity;
      totalDiscountAmount += itemGst.discountAmount;
      totalTaxAmount += itemGst.totalTaxAmount;

      if (taxType === 'intra-state') {
        cgstAmount += itemGst.cgstAmount;
        sgstAmount += itemGst.sgstAmount;
      } else {
        igstAmount += itemGst.igstAmount;
      }

      // Track ITC eligible amount (only for 18% GST restaurants)
      if (gstConfig.canClaimITC && !itemGst.exemptFromGst) {
        itcEligibleAmount += itemGst.totalTaxAmount;
      }
    }

    const taxableAmount = subtotal - totalDiscountAmount;
    const totalAmount = taxableAmount + totalTaxAmount;

    const summary: OrderGstSummary = {
      subtotal: this.roundToTwo(subtotal),
      discountAmount: this.roundToTwo(totalDiscountAmount),
      taxableAmount: this.roundToTwo(taxableAmount),
      cgstAmount: this.roundToTwo(cgstAmount),
      sgstAmount: this.roundToTwo(sgstAmount),
      igstAmount: this.roundToTwo(igstAmount),
      totalTaxAmount: this.roundToTwo(totalTaxAmount),
      totalAmount: this.roundToTwo(totalAmount),
      taxType,
      itcEligibleAmount: this.roundToTwo(itcEligibleAmount)
    };

    return {
      items: itemsWithGst,
      summary
    };
  }

  /**
   * Calculate GST for a single menu item in an order
   */
  private calculateItemGst(
    orderItem: OrderItemGstData,
    menuItem: MenuItemDocument,
    gstConfig: any,
    taxType: 'intra-state' | 'inter-state'
  ): OrderItemWithGst {
    // Validate and use menu item GST rate, fallback to restaurant default
    const menuGstRate = typeof menuItem.gstRate === 'number' && !isNaN(menuItem.gstRate)
      ? menuItem.gstRate
      : gstConfig.defaultGstRate;

    const effectiveGstRate = typeof menuItem.overrideGstRate === 'number' && !isNaN(menuItem.overrideGstRate)
      ? menuItem.overrideGstRate
      : menuGstRate;

    // Validate input values
    const safeUnitPrice = typeof orderItem.unitPrice === 'number' && !isNaN(orderItem.unitPrice)
      ? orderItem.unitPrice
      : 0;
    const safeQuantity = typeof orderItem.quantity === 'number' && !isNaN(orderItem.quantity)
      ? orderItem.quantity
      : 1;
    const safeDiscountAmount = typeof orderItem.discountAmount === 'number' && !isNaN(orderItem.discountAmount)
      ? orderItem.discountAmount
      : 0;

    // Calculate amounts
    const grossAmount = this.roundToTwo(safeUnitPrice * safeQuantity);
    const taxableAmount = this.roundToTwo(grossAmount - safeDiscountAmount);

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalTaxAmount = 0;

    if (!menuItem.exemptFromGst && !menuItem.useStateVat) {
      if (taxType === 'intra-state') {
        // Same state: CGST + SGST
        const halfRate = effectiveGstRate / 2;
        cgstAmount = this.roundToTwo(taxableAmount * halfRate / 100);
        sgstAmount = this.roundToTwo(taxableAmount * halfRate / 100);
        totalTaxAmount = cgstAmount + sgstAmount;
      } else {
        // Different state: IGST
        igstAmount = this.roundToTwo(taxableAmount * effectiveGstRate / 100);
        totalTaxAmount = igstAmount;
      }
    }

    const totalWithTax = this.roundToTwo(taxableAmount + totalTaxAmount);

    return {
      menuItemId: orderItem.menuItemId,
      name: orderItem.name || menuItem.name || '',
      quantity: safeQuantity,
      unitPrice: safeUnitPrice,
      discountAmount: safeDiscountAmount,
      foodCategory: menuItem.foodCategory || 'cooked_food',
      hsnCode: menuItem.hsnCode || '9954',
      gstRate: effectiveGstRate || 0,
      exemptFromGst: menuItem.exemptFromGst ?? false,
      useStateVat: menuItem.useStateVat ?? false,
      taxableAmount: taxableAmount || 0,
      cgstAmount: cgstAmount || 0,
      sgstAmount: sgstAmount || 0,
      igstAmount: igstAmount || 0,
      totalTaxAmount: totalTaxAmount || 0,
      totalWithTax: totalWithTax || 0,
      lineTotal: totalWithTax || 0
    };
  }

  /**
   * Auto-configure GST for a menu item when created/updated
   */
  async autoConfigureMenuItemGst(
    menuItem: {
      name: string;
      description?: string;
      restaurantId: string;
    }
  ): Promise<{
    foodCategory: FoodCategory;
    hsnCode: string;
    gstRate: number;
    exemptFromGst: boolean;
    useStateVat: boolean;
    categoryConfidence: number;
  }> {
    // Get restaurant configuration
    const restaurant = await this.getRestaurantGstConfig(menuItem.restaurantId);
    if (!restaurant) {
      throw new Error(`Restaurant ${menuItem.restaurantId} not found`);
    }

    const { gst: gstConfig } = restaurant.businessDetails;

    // Detect food category
    const detection = this.foodCategoryService.detectFoodCategory(
      menuItem.name,
      menuItem.description
    );

    // Calculate GST configuration
    const gstCalculation = this.foodCategoryService.calculateGstRate(
      detection.category,
      gstConfig.defaultGstRate,
      gstConfig.canClaimITC
    );

    return {
      foodCategory: detection.category,
      hsnCode: gstCalculation.hsnCode,
      gstRate: gstCalculation.gstRate,
      exemptFromGst: gstCalculation.exemptFromGst,
      useStateVat: gstCalculation.useStateVat,
      categoryConfidence: detection.confidence
    };
  }

  /**
   * Update restaurant GST configuration based on establishment type
   */
  async updateRestaurantGstConfig(
    restaurantId: string,
    establishmentType: string,
    businessState: string,
    gstin?: string
  ): Promise<void> {
    const gstConfig = this.foodCategoryService.getRestaurantGstConfiguration(establishmentType);

    await this.restaurantModel.findByIdAndUpdate(restaurantId, {
      'businessDetails.gst': {
        establishmentType,
        defaultGstRate: gstConfig.defaultGstRate,
        canClaimITC: gstConfig.canClaimITC,
        businessState,
        gstin,
        customGstRate: undefined,
        exemptFromGst: false,
        isGstEnabled: true
      }
    });

    this.logger.log(`Updated GST config for restaurant ${restaurantId}: ${establishmentType} -> ${gstConfig.defaultGstRate}%`);
  }

  /**
   * Get restaurant GST configuration
   */
  private async getRestaurantGstConfig(restaurantId: string) {
    return this.restaurantModel
      .findById(restaurantId)
      .select('businessDetails')
      .lean();
  }

  /**
   * Utility: Round to 2 decimal places
   */
  private roundToTwo(num: number): number {
    if (typeof num !== 'number' || isNaN(num)) {
      return 0;
    }
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  /**
   * Get all available food categories for frontend
   */
  getFoodCategories() {
    return this.foodCategoryService.getAllFoodCategories();
  }

  /**
   * Manually override food category for a menu item
   */
  async overrideMenuItemCategory(
    menuItemId: string,
    category: FoodCategory,
    customGstRate?: number
  ): Promise<void> {
    const menuItem = await this.menuItemModel.findById(menuItemId);
    if (!menuItem) {
      throw new Error(`Menu item ${menuItemId} not found`);
    }

    const restaurant = await this.getRestaurantGstConfig(menuItem.restaurantId);
    if (!restaurant) {
      throw new Error(`Restaurant ${menuItem.restaurantId} not found`);
    }

    const { gst: gstConfig } = restaurant.businessDetails;

    // Calculate new GST configuration
    const gstCalculation = this.foodCategoryService.calculateGstRate(
      category,
      gstConfig.defaultGstRate,
      gstConfig.canClaimITC
    );

    await this.menuItemModel.findByIdAndUpdate(menuItemId, {
      foodCategory: category,
      hsnCode: gstCalculation.hsnCode,
      gstRate: gstCalculation.gstRate,
      overrideGstRate: customGstRate,
      exemptFromGst: gstCalculation.exemptFromGst,
      useStateVat: gstCalculation.useStateVat,
      categoryConfidence: 1.0 // Manual override = 100% confidence
    });

    this.logger.log(`Overrode menu item ${menuItemId} category to ${category}`);
  }
}