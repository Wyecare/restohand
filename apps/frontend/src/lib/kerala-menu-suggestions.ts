// Kerala-specific menu categories and items for easy selection

export const KERALA_CATEGORIES = [
  'Breakfast',
  'Rice Items',
  'Curry & Gravy',
  'Vegetarian',
  'Non-Vegetarian',
  'Fish Items',
  'Chicken Items',
  'Mutton Items',
  'Snacks',
  'Sweets',
  'Beverages',
  'Chinese',
  'North Indian',
];

export const KERALA_MENU_ITEMS = {
  'Breakfast': [
    'Puttu',
    'Appam',
    'Idli',
    'Dosa',
    'Vada',
    'Upma',
    'Idiyappam',
    'Pathiri',
    'Pidi',
    'Ela Ada',
    'Palada',
  ],

  'Rice Items': [
    'Meals',
    'Biriyani',
    'Ghee Rice',
    'Lemon Rice',
    'Curd Rice',
    'Coconut Rice',
    'Fish Curry Rice',
    'Chicken Rice',
    'Vegetable Rice',
  ],

  'Curry & Gravy': [
    'Sambar',
    'Rasam',
    'Parippu Curry',
    'Olan',
    'Aviyal',
    'Thoran',
    'Pachadi',
    'Kalan',
    'Erissery',
    'Kootu Curry',
  ],

  'Fish Items': [
    'Fish Curry',
    'Fish Fry',
    'Meen Pollichathu',
    'Fish Molee',
    'Karimeen Fry',
    'Sardine Curry',
    'Mackerel Curry',
    'Pomfret Fry',
  ],

  'Chicken Items': [
    'Chicken Curry',
    'Chicken Fry',
    'Chicken Biriyani',
    'Chicken 65',
    'Butter Chicken',
    'Chicken Tikka',
    'Chicken Roast',
  ],

  'Snacks': [
    'Banana Chips',
    'Mixture',
    'Murukku',
    'Achappam',
    'Unniyappam',
    'Kozhukatta',
    'Sukhiyan',
    'Bonda',
    'Cutlet',
    'Samosa',
  ],

  'Beverages': [
    'Tea',
    'Coffee',
    'Tender Coconut',
    'Lime Juice',
    'Buttermilk',
    'Solkadhi',
    'Fresh Juice',
    'Lassi',
  ],

  'Sweets': [
    'Payasam',
    'Halwa',
    'Laddu',
    'Mysore Pak',
    'Jalebi',
    'Gulab Jamun',
    'Pal Payasam',
    'Ada Pradhaman',
  ]
};

export const COMMON_PRICES = [
  10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100,
  120, 150, 180, 200, 250, 300, 350, 400, 450, 500
];

export const PORTION_SIZES = [
  'Small',
  'Medium',
  'Large',
  'Full',
  'Half',
  'Quarter',
  'Single',
  'Double',
  'Family Pack',
];

// Get suggestions for a category
export const getCategorySuggestions = () => KERALA_CATEGORIES;

// Get menu item suggestions for a specific category
export const getMenuItemSuggestions = (category: string) => {
  // Find exact match first
  if (KERALA_MENU_ITEMS[category as keyof typeof KERALA_MENU_ITEMS]) {
    return KERALA_MENU_ITEMS[category as keyof typeof KERALA_MENU_ITEMS];
  }

  // Find partial match (for Malayalam categories)
  const matchingKey = Object.keys(KERALA_MENU_ITEMS).find(key =>
    category.includes(key) || key.includes(category)
  );

  if (matchingKey) {
    return KERALA_MENU_ITEMS[matchingKey as keyof typeof KERALA_MENU_ITEMS];
  }

  // Return common items if no match
  return [
    'Rice', 'Curry', 'Fry', 'Roast', 'Biriyani', 'Meals'
  ];
};

// Get price suggestions
export const getPriceSuggestions = () => COMMON_PRICES;

// Get portion size suggestions
export const getPortionSuggestions = () => PORTION_SIZES;