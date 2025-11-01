import 'reflect-metadata';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import {
  Restaurant,
  RestaurantSchema,
} from '../restaurants/schemas/restaurant.schema';
import {
  MenuCategory,
  MenuCategorySchema,
} from '../menu-categories/schemas/menu-category.schema';
import {
  MenuItem,
  MenuItemSchema,
} from '../menu-items/schemas/menu-item.schema';

config({ path: '.env' });

const PLACEHOLDER_RESTAURANT_ID = '6904beecad643b41632ab2eb';

const categories = [
  {
    name: 'Breakfast Classics',
    description: 'Morning staples to start the day right',
    displayOrder: 1,
  },
  {
    name: 'All-day Beverages',
    description: 'Coffee, tea, and cold refreshers',
    displayOrder: 2,
  },
  {
    name: 'Chef Specials',
    description: 'Curated signature dishes from the kitchen',
    displayOrder: 3,
  },
  {
    name: 'Desserts',
    description: 'Sweet endings to every meal',
    displayOrder: 4,
  },
];

const items = [
  {
    categoryName: 'Breakfast Classics',
    name: 'Masala Dosa',
    pricing: { amount: 89, currency: 'INR', isTaxInclusive: true },
    description:
      'Crispy dosa stuffed with spiced potatoes, served with chutney.',
    tags: ['south-indian', 'vegetarian'],
    displayOrder: 1,
  },
  {
    categoryName: 'Breakfast Classics',
    name: 'Idli & Vada Platter',
    pricing: { amount: 75, currency: 'INR', isTaxInclusive: true },
    description: 'Two fluffy idlis paired with crisp medu vada and sambar.',
    tags: ['south-indian', 'vegetarian'],
    displayOrder: 2,
  },
  {
    categoryName: 'All-day Beverages',
    name: 'Filter Coffee',
    pricing: { amount: 45, currency: 'INR', isTaxInclusive: true },
    description: 'Traditional brass-tumbler filter coffee with rich decoction.',
    tags: ['beverage', 'coffee'],
    displayOrder: 1,
  },
  {
    categoryName: 'All-day Beverages',
    name: 'Iced Masala Chai',
    pricing: { amount: 60, currency: 'INR', isTaxInclusive: true },
    description: 'Chilled take on spiced Indian tea, served over ice.',
    tags: ['beverage', 'tea'],
    displayOrder: 2,
  },
  {
    categoryName: 'Chef Specials',
    name: 'Paneer Butter Kulcha',
    pricing: { amount: 155, currency: 'INR', isTaxInclusive: true },
    description:
      'Char-grilled kulcha with creamy paneer butter masala filling.',
    tags: ['chef-special', 'vegetarian'],
    displayOrder: 1,
  },
  {
    categoryName: 'Chef Specials',
    name: 'Malabar Chicken Curry',
    pricing: { amount: 185, currency: 'INR', isTaxInclusive: true },
    description: 'Slow-cooked coconut chicken curry with Malabar spices.',
    tags: ['chef-special', 'non-veg'],
    displayOrder: 2,
  },
  {
    categoryName: 'Desserts',
    name: 'Elaneer Pudding',
    pricing: { amount: 95, currency: 'INR', isTaxInclusive: true },
    description: 'Tender coconut pudding topped with caramel drizzle.',
    tags: ['dessert'],
    displayOrder: 1,
  },
  {
    categoryName: 'Desserts',
    name: 'Jaggery Cheesecake',
    pricing: { amount: 120, currency: 'INR', isTaxInclusive: true },
    description: 'New York-style cheesecake sweetened with palm jaggery.',
    tags: ['dessert'],
    displayOrder: 2,
  },
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI in environment');
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME ?? 'restohand',
  });

  const RestaurantModel = mongoose.model(Restaurant.name, RestaurantSchema);
  const CategoryModel = mongoose.model(MenuCategory.name, MenuCategorySchema);
  const ItemModel = mongoose.model(MenuItem.name, MenuItemSchema);

  console.log('[seed-menu] Connected to MongoDB');

  const restaurantId = new mongoose.Types.ObjectId(PLACEHOLDER_RESTAURANT_ID);
  const restaurant = await RestaurantModel.findById(restaurantId);
  if (!restaurant) {
    console.warn(
      `[seed-menu] Restaurant ${PLACEHOLDER_RESTAURANT_ID} not found. Seed will insert categories/items but ensure the ID exists.`
    );
  }

  await CategoryModel.deleteMany({ restaurantId });
  await ItemModel.deleteMany({ restaurantId });

  console.log('[seed-menu] Existing menu data cleared for restaurant');

  const insertedCategories = await CategoryModel.create(
    categories.map((category) => ({
      ...category,
      restaurantId,
      isActive: true,
    }))
  );

  const categoryLookup = new Map(
    insertedCategories.map((cat) => [cat.name, cat._id.toString()])
  );

  await ItemModel.create(
    items.map((item) => ({
      ...item,
      restaurantId,
      categoryId: categoryLookup.get(item.categoryName),
      isAvailable: true,
      imageUrls: [],
    }))
  );

  console.log('[seed-menu] Seed data inserted successfully');
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('[seed-menu] Seed failed', error);
  process.exit(1);
});
