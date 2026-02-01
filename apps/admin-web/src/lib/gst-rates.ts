// Predefined GST rates for Indian restaurants

export interface GstRateOption {
  id: string;
  categoryType: string;
  description: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  totalGstRate: number;
  isCommon: boolean;
  examples: string[];
}

export const PREDEFINED_GST_RATES: GstRateOption[] = [
  {
    id: 'food-5',
    categoryType: 'Food',
    description: 'Food Items (Most Common)',
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 5,
    totalGstRate: 5,
    isCommon: true,
    examples: ['Rice', 'Bread', 'Curry', 'Snacks', 'Main Course']
  },
  {
    id: 'beverages-12',
    categoryType: 'Beverages',
    description: 'Non-Alcoholic Beverages',
    cgstRate: 6,
    sgstRate: 6,
    igstRate: 12,
    totalGstRate: 12,
    isCommon: true,
    examples: ['Soft Drinks', 'Juices', 'Tea', 'Coffee', 'Lassi']
  },
  {
    id: 'alcoholic-18',
    categoryType: 'Alcoholic Beverages',
    description: 'Alcoholic Beverages',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    totalGstRate: 18,
    isCommon: false,
    examples: ['Beer', 'Wine', 'Spirits', 'Cocktails']
  },
  {
    id: 'luxury-28',
    categoryType: 'Luxury Items',
    description: 'Luxury/Premium Items',
    cgstRate: 14,
    sgstRate: 14,
    igstRate: 28,
    totalGstRate: 28,
    isCommon: false,
    examples: ['Premium Imported Items', 'Luxury Desserts']
  },
  {
    id: 'desserts-5',
    categoryType: 'Desserts',
    description: 'Desserts & Sweets',
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 5,
    totalGstRate: 5,
    isCommon: true,
    examples: ['Ice Cream', 'Sweets', 'Cakes', 'Pastries']
  },
  {
    id: 'processed-12',
    categoryType: 'Processed Foods',
    description: 'Processed Food Items',
    cgstRate: 6,
    sgstRate: 6,
    igstRate: 12,
    totalGstRate: 12,
    isCommon: false,
    examples: ['Packaged Foods', 'Ready-to-eat Items', 'Preserved Foods']
  }
];

export const COMMON_GST_RATES = PREDEFINED_GST_RATES.filter(rate => rate.isCommon);

export function getGstRateByType(categoryType: string): GstRateOption | undefined {
  return PREDEFINED_GST_RATES.find(rate =>
    rate.categoryType.toLowerCase() === categoryType.toLowerCase()
  );
}

export function getDefaultGstRateForCategory(categoryName: string): GstRateOption {
  const name = categoryName.toLowerCase();

  // Smart categorization based on category name
  if (name.includes('drink') || name.includes('beverage') || name.includes('juice') ||
      name.includes('tea') || name.includes('coffee') || name.includes('lassi')) {
    return PREDEFINED_GST_RATES.find(r => r.id === 'beverages-12')!;
  }

  if (name.includes('alcohol') || name.includes('beer') || name.includes('wine') ||
      name.includes('cocktail') || name.includes('spirit')) {
    return PREDEFINED_GST_RATES.find(r => r.id === 'alcoholic-18')!;
  }

  if (name.includes('dessert') || name.includes('sweet') || name.includes('ice cream') ||
      name.includes('cake') || name.includes('pastry')) {
    return PREDEFINED_GST_RATES.find(r => r.id === 'desserts-5')!;
  }

  // Default to Food 5% for everything else
  return PREDEFINED_GST_RATES.find(r => r.id === 'food-5')!;
}

export function formatGstRate(rate: GstRateOption): string {
  return `${rate.totalGstRate}% (${rate.description})`;
}

export function formatGstBreakdown(rate: GstRateOption, isInterstate: boolean = false): string {
  if (isInterstate) {
    return `IGST ${rate.igstRate}%`;
  } else {
    return `CGST ${rate.cgstRate}% + SGST ${rate.sgstRate}%`;
  }
}