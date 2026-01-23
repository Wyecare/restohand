// Script to create test menu data
use('restohand');

const restaurantId = ObjectId('6970dca335ef42831dd10e90');
const branchId = ObjectId('6970dd66939ab24b61da7a0a');

// Create category
console.log('Creating menu category...');
const categoryResult = db.menu_categories.insertOne({
  name: 'Appetizers',
  description: 'Delicious starters',
  restaurantId: restaurantId,
  branchId: branchId,
  displayOrder: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

const categoryId = categoryResult.insertedId;
console.log('Category created with ID:', categoryId);

// Create menu items
console.log('Creating menu items...');
const itemsResult = db.menu_items.insertMany([
  {
    name: 'Chicken Wings',
    description: 'Spicy buffalo wings',
    restaurantId: restaurantId,
    branchId: branchId,
    categoryId: categoryId,
    pricing: { amount: 12.99, currency: 'USD', isTaxInclusive: false },
    isAvailable: true,
    displayOrder: 1,
    tags: ['spicy', 'popular'],
    imageUrls: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Mozzarella Sticks',
    description: 'Crispy cheese sticks with marinara sauce',
    restaurantId: restaurantId,
    branchId: branchId,
    categoryId: categoryId,
    pricing: { amount: 8.99, currency: 'USD', isTaxInclusive: false },
    isAvailable: true,
    displayOrder: 2,
    tags: ['vegetarian', 'cheese'],
    imageUrls: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

console.log('Created', itemsResult.insertedIds.length, 'menu items');
console.log('Menu data setup complete!');

// Verify the data
console.log('\nVerifying data:');
console.log('Categories:', db.menu_categories.countDocuments({restaurantId: restaurantId, branchId: branchId}));
console.log('Items:', db.menu_items.countDocuments({restaurantId: restaurantId, branchId: branchId}));