const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restohand';

const commonRestaurantHsnCodes = [
  // Food Items
  {
    code: '1006',
    description: 'Rice',
    chapter: '10',
    heading: 'Cereals',
    defaultGstRate: 5,
    keywords: ['rice', 'basmati', 'biryani', 'pulao', 'grain'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '1001',
    description: 'Wheat and meslin',
    chapter: '10',
    heading: 'Cereals',
    defaultGstRate: 5,
    keywords: ['wheat', 'flour', 'atta', 'bread', 'roti', 'chapati'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0713',
    description: 'Dried leguminous vegetables',
    chapter: '07',
    heading: 'Edible vegetables',
    defaultGstRate: 5,
    keywords: ['dal', 'lentils', 'beans', 'chickpeas', 'pulses'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0207',
    description: 'Meat and edible offal of poultry',
    chapter: '02',
    heading: 'Meat and edible meat offal',
    defaultGstRate: 5,
    keywords: ['chicken', 'poultry', 'meat', 'fresh meat'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0302',
    description: 'Fish, fresh or chilled',
    chapter: '03',
    heading: 'Fish and crustaceans',
    defaultGstRate: 5,
    keywords: ['fish', 'seafood', 'fresh fish', 'kerala fish'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0902',
    description: 'Tea',
    chapter: '09',
    heading: 'Coffee, tea, maté and spices',
    defaultGstRate: 5,
    keywords: ['tea', 'chai', 'black tea', 'green tea'],
    category: 'beverage',
    isPopular: true,
  },
  {
    code: '2201',
    description: 'Waters, including natural or artificial mineral waters and aerated waters',
    chapter: '22',
    heading: 'Beverages, spirits and vinegar',
    defaultGstRate: 18,
    keywords: ['water', 'mineral water', 'aerated water', 'sparkling water'],
    category: 'beverage',
    isPopular: true,
  },
  {
    code: '2202',
    description: 'Waters with added sweetening or flavoring matter',
    chapter: '22',
    heading: 'Beverages, spirits and vinegar',
    defaultGstRate: 28,
    keywords: ['soft drinks', 'soda', 'cola', 'fruit drinks', 'energy drinks'],
    category: 'beverage',
    isPopular: true,
  },
  {
    code: '1511',
    description: 'Palm oil and its fractions',
    chapter: '15',
    heading: 'Animal or vegetable fats and oils',
    defaultGstRate: 5,
    keywords: ['palm oil', 'cooking oil'],
    category: 'food',
    isPopular: false,
  },
  {
    code: '1513',
    description: 'Coconut oil and its fractions',
    chapter: '15',
    heading: 'Animal or vegetable fats and oils',
    defaultGstRate: 5,
    keywords: ['coconut oil', 'kerala oil', 'cooking oil'],
    category: 'food',
    isPopular: true,
  }
];

async function seedHsnCodes() {
  console.log('🌱 Starting HSN codes seeding...');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('📊 Connected to MongoDB');

    const db = client.db();
    const hsnCollection = db.collection('hsncodes');

    let created = 0;
    let skipped = 0;

    for (const hsnData of commonRestaurantHsnCodes) {
      try {
        const existing = await hsnCollection.findOne({ code: hsnData.code });
        if (existing) {
          console.log(`⏭️  HSN code ${hsnData.code} already exists, skipping...`);
          skipped++;
          continue;
        }

        const result = await hsnCollection.insertOne({
          ...hsnData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Created HSN code ${hsnData.code} - ${hsnData.description}`);
        created++;
      } catch (error) {
        console.error(`❌ Failed to create HSN code ${hsnData.code}:`, error.message);
      }
    }

    console.log(`\n🎉 HSN codes seeding completed!`);
    console.log(`📊 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📝 Total processed: ${commonRestaurantHsnCodes.length}`);

  } catch (error) {
    console.error('❌ Error during HSN codes seeding:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  seedHsnCodes().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { seedHsnCodes };