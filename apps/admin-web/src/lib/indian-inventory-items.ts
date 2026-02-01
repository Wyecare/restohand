// Common inventory items for Indian restaurants with smart defaults
export interface InventoryItemTemplate {
  name: string;
  category: string;
  unit: string;
  estimatedCostPerUnit: number; // In INR
  minimumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  tags: string[];
  description?: string;
}

export const indianInventoryItems: InventoryItemTemplate[] = [
  // Vegetables
  {
    name: "Onion",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 30,
    minimumStock: 10,
    reorderPoint: 15,
    reorderQuantity: 50,
    tags: ["fresh", "perishable", "essential"],
    description: "Fresh onions for cooking"
  },
  {
    name: "Tomato",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 40,
    minimumStock: 5,
    reorderPoint: 10,
    reorderQuantity: 25,
    tags: ["fresh", "perishable"],
    description: "Fresh tomatoes"
  },
  {
    name: "Potato",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 25,
    minimumStock: 15,
    reorderPoint: 20,
    reorderQuantity: 50,
    tags: ["fresh", "essential"],
    description: "Fresh potatoes"
  },
  {
    name: "Ginger",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 80,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["fresh", "spice", "essential"],
    description: "Fresh ginger"
  },
  {
    name: "Garlic",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 120,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["fresh", "spice", "essential"],
    description: "Fresh garlic"
  },
  {
    name: "Green Chilli",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 60,
    minimumStock: 1,
    reorderPoint: 2,
    reorderQuantity: 5,
    tags: ["fresh", "spice", "hot"],
    description: "Fresh green chillies"
  },
  {
    name: "Coriander Leaves",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 40,
    minimumStock: 1,
    reorderPoint: 2,
    reorderQuantity: 5,
    tags: ["fresh", "herb", "garnish"],
    description: "Fresh coriander leaves"
  },
  {
    name: "Mint Leaves",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 50,
    minimumStock: 0.5,
    reorderPoint: 1,
    reorderQuantity: 3,
    tags: ["fresh", "herb", "garnish"],
    description: "Fresh mint leaves"
  },
  {
    name: "Curry Leaves",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 100,
    minimumStock: 0.5,
    reorderPoint: 1,
    reorderQuantity: 2,
    tags: ["fresh", "herb", "south-indian"],
    description: "Fresh curry leaves"
  },
  {
    name: "Cauliflower",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 35,
    minimumStock: 3,
    reorderPoint: 5,
    reorderQuantity: 15,
    tags: ["fresh", "perishable"],
    description: "Fresh cauliflower"
  },
  {
    name: "Cabbage",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 20,
    minimumStock: 3,
    reorderPoint: 5,
    reorderQuantity: 15,
    tags: ["fresh", "perishable"],
    description: "Fresh cabbage"
  },
  {
    name: "Capsicum",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 60,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["fresh", "perishable"],
    description: "Fresh bell peppers/capsicum"
  },
  {
    name: "Okra (Bhindi)",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 50,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["fresh", "perishable"],
    description: "Fresh okra/ladyfinger"
  },
  {
    name: "Eggplant (Brinjal)",
    category: "vegetables",
    unit: "kg",
    estimatedCostPerUnit: 40,
    minimumStock: 3,
    reorderPoint: 5,
    reorderQuantity: 15,
    tags: ["fresh", "perishable"],
    description: "Fresh eggplant/brinjal"
  },

  // Spices & Seasonings
  {
    name: "Turmeric Powder",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 200,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["spice", "essential", "powder"],
    description: "Pure turmeric powder"
  },
  {
    name: "Red Chilli Powder",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 300,
    minimumStock: 3,
    reorderPoint: 5,
    reorderQuantity: 15,
    tags: ["spice", "essential", "hot", "powder"],
    description: "Red chilli powder"
  },
  {
    name: "Coriander Powder",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 250,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["spice", "essential", "powder"],
    description: "Coriander seed powder"
  },
  {
    name: "Cumin Powder",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 400,
    minimumStock: 1,
    reorderPoint: 2,
    reorderQuantity: 5,
    tags: ["spice", "essential", "powder"],
    description: "Cumin seed powder"
  },
  {
    name: "Garam Masala",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 600,
    minimumStock: 1,
    reorderPoint: 2,
    reorderQuantity: 5,
    tags: ["spice", "essential", "blend"],
    description: "Garam masala spice blend"
  },
  {
    name: "Cumin Seeds",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 350,
    minimumStock: 1,
    reorderPoint: 2,
    reorderQuantity: 5,
    tags: ["spice", "whole", "tempering"],
    description: "Whole cumin seeds"
  },
  {
    name: "Mustard Seeds",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 200,
    minimumStock: 0.5,
    reorderPoint: 1,
    reorderQuantity: 3,
    tags: ["spice", "whole", "tempering", "south-indian"],
    description: "Black mustard seeds"
  },
  {
    name: "Fenugreek Seeds",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 150,
    minimumStock: 0.5,
    reorderPoint: 1,
    reorderQuantity: 3,
    tags: ["spice", "whole", "bitter"],
    description: "Fenugreek seeds (methi)"
  },
  {
    name: "Cardamom",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 2000,
    minimumStock: 0.25,
    reorderPoint: 0.5,
    reorderQuantity: 1,
    tags: ["spice", "whole", "aromatic", "expensive"],
    description: "Green cardamom pods"
  },
  {
    name: "Cinnamon",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 800,
    minimumStock: 0.25,
    reorderPoint: 0.5,
    reorderQuantity: 1,
    tags: ["spice", "whole", "aromatic"],
    description: "Cinnamon sticks"
  },
  {
    name: "Bay Leaves",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 400,
    minimumStock: 0.25,
    reorderPoint: 0.5,
    reorderQuantity: 1,
    tags: ["spice", "whole", "aromatic"],
    description: "Dried bay leaves"
  },
  {
    name: "Black Pepper",
    category: "spices",
    unit: "kg",
    estimatedCostPerUnit: 1200,
    minimumStock: 0.5,
    reorderPoint: 1,
    reorderQuantity: 2,
    tags: ["spice", "whole", "hot"],
    description: "Black pepper corns"
  },

  // Grains & Pulses
  {
    name: "Basmati Rice",
    category: "grains",
    unit: "kg",
    estimatedCostPerUnit: 120,
    minimumStock: 25,
    reorderPoint: 50,
    reorderQuantity: 100,
    tags: ["grain", "premium", "essential"],
    description: "Premium basmati rice"
  },
  {
    name: "Regular Rice",
    category: "grains",
    unit: "kg",
    estimatedCostPerUnit: 50,
    minimumStock: 50,
    reorderPoint: 100,
    reorderQuantity: 200,
    tags: ["grain", "essential", "bulk"],
    description: "Regular white rice"
  },
  {
    name: "Wheat Flour (Atta)",
    category: "grains",
    unit: "kg",
    estimatedCostPerUnit: 35,
    minimumStock: 25,
    reorderPoint: 50,
    reorderQuantity: 100,
    tags: ["grain", "essential", "roti"],
    description: "Whole wheat flour"
  },
  {
    name: "All Purpose Flour (Maida)",
    category: "grains",
    unit: "kg",
    estimatedCostPerUnit: 40,
    minimumStock: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    tags: ["grain", "refined", "baking"],
    description: "Refined white flour"
  },
  {
    name: "Toor Dal",
    category: "grains",
    unit: "kg",
    estimatedCostPerUnit: 120,
    minimumStock: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    tags: ["pulse", "dal", "protein"],
    description: "Pigeon pea lentils"
  },
  {
    name: "Moong Dal",
    category: "grains",
    unit: "kg",
    estimatedCostPerUnit: 140,
    minimumStock: 5,
    reorderPoint: 10,
    reorderQuantity: 25,
    tags: ["pulse", "dal", "protein"],
    description: "Yellow mung lentils"
  },
  {
    name: "Chana Dal",
    category: "grains",
    unit: "kg",
    estimatedCostPerUnit: 100,
    minimumStock: 5,
    reorderPoint: 10,
    reorderQuantity: 25,
    tags: ["pulse", "dal", "protein"],
    description: "Split chickpea lentils"
  },
  {
    name: "Masoor Dal",
    category: "grains",
    unit: "kg",
    estimatedCostPerUnit: 110,
    minimumStock: 5,
    reorderPoint: 10,
    reorderQuantity: 25,
    tags: ["pulse", "dal", "protein"],
    description: "Red lentils"
  },

  // Dairy & Proteins
  {
    name: "Milk",
    category: "dairy",
    unit: "liters",
    estimatedCostPerUnit: 55,
    minimumStock: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    tags: ["dairy", "fresh", "perishable"],
    description: "Fresh milk"
  },
  {
    name: "Paneer",
    category: "dairy",
    unit: "kg",
    estimatedCostPerUnit: 300,
    minimumStock: 2,
    reorderPoint: 5,
    reorderQuantity: 10,
    tags: ["dairy", "protein", "perishable", "vegetarian"],
    description: "Fresh cottage cheese"
  },
  {
    name: "Yogurt (Curd)",
    category: "dairy",
    unit: "kg",
    estimatedCostPerUnit: 80,
    minimumStock: 3,
    reorderPoint: 5,
    reorderQuantity: 15,
    tags: ["dairy", "fresh", "perishable"],
    description: "Fresh yogurt/curd"
  },
  {
    name: "Butter",
    category: "dairy",
    unit: "kg",
    estimatedCostPerUnit: 400,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["dairy", "fat", "cooking"],
    description: "Fresh butter"
  },
  {
    name: "Ghee",
    category: "dairy",
    unit: "kg",
    estimatedCostPerUnit: 500,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["dairy", "clarified-butter", "premium"],
    description: "Pure ghee (clarified butter)"
  },
  {
    name: "Chicken",
    category: "meat",
    unit: "kg",
    estimatedCostPerUnit: 200,
    minimumStock: 5,
    reorderPoint: 10,
    reorderQuantity: 25,
    tags: ["meat", "protein", "perishable", "non-veg"],
    description: "Fresh chicken"
  },
  {
    name: "Mutton",
    category: "meat",
    unit: "kg",
    estimatedCostPerUnit: 600,
    minimumStock: 3,
    reorderPoint: 5,
    reorderQuantity: 15,
    tags: ["meat", "protein", "perishable", "non-veg", "premium"],
    description: "Fresh mutton/goat meat"
  },
  {
    name: "Fish",
    category: "seafood",
    unit: "kg",
    estimatedCostPerUnit: 300,
    minimumStock: 2,
    reorderPoint: 5,
    reorderQuantity: 10,
    tags: ["seafood", "protein", "perishable", "non-veg"],
    description: "Fresh fish"
  },
  {
    name: "Prawns",
    category: "seafood",
    unit: "kg",
    estimatedCostPerUnit: 500,
    minimumStock: 1,
    reorderPoint: 2,
    reorderQuantity: 5,
    tags: ["seafood", "protein", "perishable", "non-veg", "premium"],
    description: "Fresh prawns/shrimp"
  },

  // Oils & Cooking Mediums
  {
    name: "Cooking Oil",
    category: "oils",
    unit: "liters",
    estimatedCostPerUnit: 120,
    minimumStock: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    tags: ["oil", "essential", "cooking"],
    description: "Refined cooking oil"
  },
  {
    name: "Coconut Oil",
    category: "oils",
    unit: "liters",
    estimatedCostPerUnit: 200,
    minimumStock: 2,
    reorderPoint: 5,
    reorderQuantity: 10,
    tags: ["oil", "coconut", "south-indian"],
    description: "Pure coconut oil"
  },
  {
    name: "Mustard Oil",
    category: "oils",
    unit: "liters",
    estimatedCostPerUnit: 150,
    minimumStock: 2,
    reorderPoint: 5,
    reorderQuantity: 10,
    tags: ["oil", "mustard", "bengali", "north-indian"],
    description: "Pure mustard oil"
  },

  // Beverages & Essentials
  {
    name: "Tea Leaves",
    category: "beverages",
    unit: "kg",
    estimatedCostPerUnit: 300,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["beverage", "tea", "essential"],
    description: "Black tea leaves"
  },
  {
    name: "Coffee Powder",
    category: "beverages",
    unit: "kg",
    estimatedCostPerUnit: 400,
    minimumStock: 1,
    reorderPoint: 2,
    reorderQuantity: 5,
    tags: ["beverage", "coffee"],
    description: "Ground coffee powder"
  },
  {
    name: "Sugar",
    category: "condiments",
    unit: "kg",
    estimatedCostPerUnit: 45,
    minimumStock: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    tags: ["sweetener", "essential"],
    description: "White sugar"
  },
  {
    name: "Salt",
    category: "condiments",
    unit: "kg",
    estimatedCostPerUnit: 20,
    minimumStock: 5,
    reorderPoint: 10,
    reorderQuantity: 25,
    tags: ["essential", "seasoning"],
    description: "Common salt"
  },
  {
    name: "Tamarind",
    category: "condiments",
    unit: "kg",
    estimatedCostPerUnit: 120,
    minimumStock: 1,
    reorderPoint: 2,
    reorderQuantity: 5,
    tags: ["souring", "south-indian", "tangy"],
    description: "Tamarind paste/pulp"
  },
  {
    name: "Lemon",
    category: "fruits",
    unit: "kg",
    estimatedCostPerUnit: 80,
    minimumStock: 2,
    reorderPoint: 3,
    reorderQuantity: 10,
    tags: ["citrus", "fresh", "garnish", "tangy"],
    description: "Fresh lemons"
  },

  // Packaging & Cleaning
  {
    name: "Aluminum Foil",
    category: "packaging",
    unit: "pieces",
    estimatedCostPerUnit: 150,
    minimumStock: 5,
    reorderPoint: 10,
    reorderQuantity: 25,
    tags: ["packaging", "wrapping"],
    description: "Food grade aluminum foil rolls"
  },
  {
    name: "Food Containers",
    category: "packaging",
    unit: "pieces",
    estimatedCostPerUnit: 10,
    minimumStock: 100,
    reorderPoint: 200,
    reorderQuantity: 500,
    tags: ["packaging", "takeaway", "containers"],
    description: "Food delivery containers"
  },
  {
    name: "Dish Soap",
    category: "cleaning",
    unit: "liters",
    estimatedCostPerUnit: 100,
    minimumStock: 5,
    reorderPoint: 10,
    reorderQuantity: 20,
    tags: ["cleaning", "hygiene", "essential"],
    description: "Dish washing liquid"
  },
  {
    name: "Paper Towels",
    category: "cleaning",
    unit: "pieces",
    estimatedCostPerUnit: 50,
    minimumStock: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    tags: ["cleaning", "hygiene", "disposable"],
    description: "Kitchen paper towels"
  }
];

// Search function for inventory items
export const searchInventoryItems = (query: string): InventoryItemTemplate[] => {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return indianInventoryItems.slice(0, 10); // Return first 10 items if no query

  return indianInventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm) ||
    item.category.toLowerCase().includes(searchTerm) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
    item.description?.toLowerCase().includes(searchTerm)
  ).slice(0, 15); // Return top 15 matches
};