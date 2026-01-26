import { Injectable } from '@nestjs/common';

export type FoodCategory =
  | 'cooked_food'     // Restaurant prepared food - follows restaurant GST rate
  | 'fresh_items'     // Fresh vegetables, fruits - 0% GST
  | 'packaged_items'  // Packaged/branded food - 5% GST
  | 'beverages'       // Non-alcoholic drinks - 12% GST
  | 'alcohol'         // Alcoholic beverages - State VAT (not GST)
  | 'sweets'          // Sweets and confectionery - 5% GST
  | 'ice_cream';      // Ice cream - 18% GST

export interface FoodCategoryRule {
  category: FoodCategory;
  hsnCode: string;
  description: string;
  defaultGstRate: number;
  useRestaurantDefault: boolean; // If true, uses restaurant's default GST rate
  exemptFromGst: boolean;
  useStateVat: boolean; // For alcohol
}

export interface CategoryDetectionResult {
  category: FoodCategory;
  confidence: number; // 0-1, how confident the detection is
  rule: FoodCategoryRule;
}

@Injectable()
export class FoodCategoryService {

  private readonly FOOD_CATEGORY_RULES: Record<FoodCategory, FoodCategoryRule> = {
    cooked_food: {
      category: 'cooked_food',
      hsnCode: '9954', // Restaurant services
      description: 'Restaurant prepared cooked food',
      defaultGstRate: 5, // Will be overridden by restaurant default
      useRestaurantDefault: true,
      exemptFromGst: false,
      useStateVat: false
    },
    fresh_items: {
      category: 'fresh_items',
      hsnCode: '0701', // Fresh vegetables (representative)
      description: 'Fresh vegetables, fruits, and unprocessed food items',
      defaultGstRate: 0,
      useRestaurantDefault: false,
      exemptFromGst: true,
      useStateVat: false
    },
    packaged_items: {
      category: 'packaged_items',
      hsnCode: '2106', // Food preparations
      description: 'Packaged and branded food items',
      defaultGstRate: 5,
      useRestaurantDefault: false,
      exemptFromGst: false,
      useStateVat: false
    },
    beverages: {
      category: 'beverages',
      hsnCode: '2202', // Non-alcoholic beverages
      description: 'Soft drinks, juices, and non-alcoholic beverages',
      defaultGstRate: 12,
      useRestaurantDefault: false,
      exemptFromGst: false,
      useStateVat: false
    },
    alcohol: {
      category: 'alcohol',
      hsnCode: '2208', // Alcoholic beverages
      description: 'Alcoholic beverages and liquor',
      defaultGstRate: 0, // State VAT applies, not GST
      useRestaurantDefault: false,
      exemptFromGst: true,
      useStateVat: true
    },
    sweets: {
      category: 'sweets',
      hsnCode: '1704', // Sugar confectionery
      description: 'Sweets, desserts, and confectionery',
      defaultGstRate: 5,
      useRestaurantDefault: false,
      exemptFromGst: false,
      useStateVat: false
    },
    ice_cream: {
      category: 'ice_cream',
      hsnCode: '2105', // Ice cream
      description: 'Ice cream and frozen desserts',
      defaultGstRate: 18,
      useRestaurantDefault: false,
      exemptFromGst: false,
      useStateVat: false
    }
  };

  // Keywords for automatic category detection
  private readonly CATEGORY_KEYWORDS: Record<FoodCategory, string[]> = {
    cooked_food: [
      // Main dishes
      'biryani', 'curry', 'dal', 'rice', 'roti', 'naan', 'pasta', 'pizza', 'burger',
      'sandwich', 'soup', 'salad', 'fried', 'grilled', 'roasted', 'steamed',
      'chicken', 'mutton', 'fish', 'prawn', 'egg', 'paneer', 'sabzi', 'gravy',
      'masala', 'tandoor', 'kebab', 'tikka', 'pulao', 'samosa', 'pakora',
      // Indian dishes
      'dosa', 'idli', 'vada', 'uttapam', 'poha', 'upma', 'paratha', 'chapati',
      'puri', 'bhatura', 'chole', 'rajma', 'palak', 'aloo', 'gobi', 'bhindi',
      // Chinese/Continental
      'manchurian', 'noodles', 'fried rice', 'chowmein', 'momos', 'dim sum',
      // Appetizers
      'starter', 'appetizer', 'snacks'
    ],
    fresh_items: [
      'fresh', 'salad leaves', 'cucumber', 'tomato', 'onion', 'carrot', 'cabbage',
      'spinach', 'lettuce', 'mint', 'coriander', 'green chilli', 'lemon',
      'apple', 'banana', 'orange', 'grapes', 'mango', 'watermelon',
      'raw', 'uncooked'
    ],
    packaged_items: [
      'packet', 'packaged', 'branded', 'biscuit', 'chips', 'wafer', 'namkeen',
      'instant', 'ready to eat', 'preserved', 'canned', 'bottled'
    ],
    beverages: [
      'juice', 'soft drink', 'soda', 'cola', 'pepsi', 'sprite', 'fanta',
      'coffee', 'tea', 'chai', 'latte', 'cappuccino', 'espresso',
      'smoothie', 'shake', 'lassi', 'buttermilk', 'lemonade',
      'water', 'mineral water', 'sparkling water'
    ],
    alcohol: [
      'beer', 'wine', 'whisky', 'rum', 'vodka', 'gin', 'brandy',
      'cocktail', 'mocktail', 'liquor', 'spirit', 'champagne',
      'feni', 'arrack', 'country liquor'
    ],
    sweets: [
      'sweet', 'dessert', 'mithai', 'laddu', 'barfi', 'halwa', 'kheer',
      'gulab jamun', 'rasgulla', 'sandesh', 'kulfi', 'jalebi',
      'cake', 'pastry', 'cookie', 'chocolate', 'candy'
    ],
    ice_cream: [
      'ice cream', 'gelato', 'sorbet', 'kulfi', 'frozen dessert',
      'sundae', 'milkshake with ice cream'
    ]
  };

  /**
   * Automatically detect food category from item name and description
   */
  detectFoodCategory(itemName: string, description?: string): CategoryDetectionResult {
    const text = `${itemName} ${description || ''}`.toLowerCase();

    let bestMatch: CategoryDetectionResult = {
      category: 'cooked_food', // Default to cooked food for restaurants
      confidence: 0.3, // Low confidence for default
      rule: this.FOOD_CATEGORY_RULES.cooked_food
    };

    // Check each category for keyword matches
    for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
      const matchingKeywords = keywords.filter(keyword =>
        text.includes(keyword.toLowerCase())
      );

      if (matchingKeywords.length > 0) {
        // Calculate confidence based on number of matching keywords and specificity
        const confidence = Math.min(
          0.9,
          0.5 + (matchingKeywords.length * 0.2)
        );

        if (confidence > bestMatch.confidence) {
          bestMatch = {
            category: category as FoodCategory,
            confidence,
            rule: this.FOOD_CATEGORY_RULES[category as FoodCategory]
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get GST rate for a food item based on restaurant configuration
   */
  calculateGstRate(
    category: FoodCategory,
    restaurantDefaultGstRate: number,
    restaurantCanClaimITC: boolean
  ): {
    gstRate: number;
    hsnCode: string;
    canClaimITC: boolean;
    exemptFromGst: boolean;
    useStateVat: boolean;
  } {
    const rule = this.FOOD_CATEGORY_RULES[category];

    let gstRate = rule.defaultGstRate;

    // Use restaurant's default rate for cooked food
    if (rule.useRestaurantDefault) {
      gstRate = restaurantDefaultGstRate;
    }

    return {
      gstRate,
      hsnCode: rule.hsnCode,
      canClaimITC: restaurantCanClaimITC && gstRate === 18, // ITC only for 18% GST
      exemptFromGst: rule.exemptFromGst,
      useStateVat: rule.useStateVat
    };
  }

  /**
   * Get all available food categories
   */
  getAllFoodCategories(): FoodCategoryRule[] {
    return Object.values(this.FOOD_CATEGORY_RULES);
  }

  /**
   * Get category rule by name
   */
  getCategoryRule(category: FoodCategory): FoodCategoryRule {
    return this.FOOD_CATEGORY_RULES[category];
  }

  /**
   * Calculate automatic GST rates based on restaurant establishment type
   */
  getRestaurantGstConfiguration(establishmentType: string): {
    defaultGstRate: number;
    canClaimITC: boolean;
  } {
    switch (establishmentType) {
      case 'standalone':
      case 'hotel_under_7500':
        return { defaultGstRate: 5, canClaimITC: false };

      case 'hotel_above_7500':
      case 'catering':
        return { defaultGstRate: 18, canClaimITC: true };

      default:
        return { defaultGstRate: 5, canClaimITC: false };
    }
  }
}