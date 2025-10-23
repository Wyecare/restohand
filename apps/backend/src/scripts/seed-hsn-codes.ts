import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { GstService } from '../gst/gst.service';

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
    code: '0201',
    description: 'Meat of bovine animals, fresh or chilled',
    chapter: '02',
    heading: 'Meat and edible meat offal',
    defaultGstRate: 5,
    keywords: ['beef', 'meat', 'fresh meat'],
    category: 'food',
    isPopular: false,
  },
  {
    code: '0203',
    description: 'Meat of swine, fresh, chilled or frozen',
    chapter: '02',
    heading: 'Meat and edible meat offal',
    defaultGstRate: 5,
    keywords: ['pork', 'bacon', 'ham'],
    category: 'food',
    isPopular: false,
  },
  {
    code: '0207',
    description: 'Meat and edible offal of poultry',
    chapter: '02',
    heading: 'Meat and edible meat offal',
    defaultGstRate: 5,
    keywords: ['chicken', 'poultry', 'duck', 'turkey', 'bird'],
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
    code: '0306',
    description: 'Crustaceans',
    chapter: '03',
    heading: 'Fish and crustaceans',
    defaultGstRate: 5,
    keywords: ['prawns', 'shrimp', 'crab', 'lobster', 'shellfish'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0401',
    description: 'Milk and cream',
    chapter: '04',
    heading: 'Dairy produce',
    defaultGstRate: 5,
    keywords: ['milk', 'cream', 'dairy'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0406',
    description: 'Cheese and curd',
    chapter: '04',
    heading: 'Dairy produce',
    defaultGstRate: 5,
    keywords: ['cheese', 'paneer', 'curd', 'cottage cheese'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0701',
    description: 'Potatoes, fresh or chilled',
    chapter: '07',
    heading: 'Edible vegetables',
    defaultGstRate: 5,
    keywords: ['potato', 'aloo', 'vegetables'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0702',
    description: 'Tomatoes, fresh or chilled',
    chapter: '07',
    heading: 'Edible vegetables',
    defaultGstRate: 5,
    keywords: ['tomato', 'tomatoes', 'vegetables'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0703',
    description: 'Onions, shallots, garlic, leeks',
    chapter: '07',
    heading: 'Edible vegetables',
    defaultGstRate: 5,
    keywords: ['onion', 'garlic', 'shallots', 'vegetables'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0709',
    description: 'Other vegetables, fresh or chilled',
    chapter: '07',
    heading: 'Edible vegetables',
    defaultGstRate: 5,
    keywords: ['vegetables', 'green vegetables', 'mixed vegetables'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0801',
    description: 'Coconuts, Brazil nuts and cashew nuts',
    chapter: '08',
    heading: 'Edible fruit and nuts',
    defaultGstRate: 5,
    keywords: ['coconut', 'cashew', 'nuts', 'kerala coconut'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0803',
    description: 'Bananas',
    chapter: '08',
    heading: 'Edible fruit and nuts',
    defaultGstRate: 5,
    keywords: ['banana', 'plantain', 'fruit'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0909',
    description: 'Seeds of anise, badian, fennel, coriander',
    chapter: '09',
    heading: 'Coffee, tea, mate and spices',
    defaultGstRate: 5,
    keywords: ['spices', 'coriander', 'fennel', 'anise'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '0910',
    description: 'Ginger, saffron, turmeric, thyme, bay leaves',
    chapter: '09',
    heading: 'Coffee, tea, mate and spices',
    defaultGstRate: 5,
    keywords: ['ginger', 'turmeric', 'saffron', 'spices', 'kerala spices'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '1517',
    description: 'Margarine and other edible fats',
    chapter: '15',
    heading: 'Animal or vegetable fats and oils',
    defaultGstRate: 5,
    keywords: ['oil', 'coconut oil', 'cooking oil', 'edible oil'],
    category: 'food',
    isPopular: true,
  },

  // Prepared Food Items (Higher GST)
  {
    code: '1905',
    description: 'Bread, pastry, cakes, biscuits',
    chapter: '19',
    heading: 'Preparations of cereals, flour, starch or milk',
    defaultGstRate: 18,
    keywords: ['bread', 'cake', 'pastry', 'biscuits', 'bakery'],
    category: 'food',
    isPopular: true,
  },
  {
    code: '2106',
    description: 'Food preparations not elsewhere specified',
    chapter: '21',
    heading: 'Miscellaneous edible preparations',
    defaultGstRate: 18,
    keywords: ['prepared food', 'ready to eat', 'processed food', 'mixed preparations'],
    category: 'food',
    isPopular: true,
  },

  // Beverages
  {
    code: '2201',
    description: 'Waters, including natural or artificial mineral waters',
    chapter: '22',
    heading: 'Beverages, spirits and vinegar',
    defaultGstRate: 18,
    keywords: ['water', 'mineral water', 'bottled water'],
    category: 'beverage',
    isPopular: true,
  },
  {
    code: '2202',
    description: 'Waters, flavoured beverages',
    chapter: '22',
    heading: 'Beverages, spirits and vinegar',
    defaultGstRate: 28,
    keywords: ['soft drinks', 'cola', 'flavoured water', 'carbonated drinks'],
    category: 'beverage',
    isPopular: true,
  },
  {
    code: '2009',
    description: 'Fruit juices',
    chapter: '20',
    heading: 'Preparations of vegetables, fruit, nuts',
    defaultGstRate: 12,
    keywords: ['juice', 'fruit juice', 'fresh juice', 'orange juice'],
    category: 'beverage',
    isPopular: true,
  },
  {
    code: '0901',
    description: 'Coffee',
    chapter: '09',
    heading: 'Coffee, tea, mate and spices',
    defaultGstRate: 5,
    keywords: ['coffee', 'black coffee', 'espresso', 'cappuccino'],
    category: 'beverage',
    isPopular: true,
  },
  {
    code: '0902',
    description: 'Tea',
    chapter: '09',
    heading: 'Coffee, tea, mate and spices',
    defaultGstRate: 5,
    keywords: ['tea', 'black tea', 'green tea', 'chai'],
    category: 'beverage',
    isPopular: true,
  },

  // Restaurant Services
  {
    code: '9963',
    description: 'Restaurant and catering services',
    chapter: '99',
    heading: 'Services',
    defaultGstRate: 5,
    keywords: ['restaurant service', 'catering', 'food service', 'dining'],
    category: 'other',
    isPopular: true,
  },
] as const;

async function seedHsnCodes() {
  console.log('🌱 Starting HSN codes seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const gstService = app.get(GstService);

  try {
    let created = 0;
    let skipped = 0;

    for (const hsnData of commonRestaurantHsnCodes) {
      try {
        const existing = await gstService.findHsnCodeByCode(hsnData.code);
        if (existing) {
          console.log(`⏭️  HSN code ${hsnData.code} already exists, skipping...`);
          skipped++;
          continue;
        }

        await gstService.createHsnCode({
          ...hsnData,
          keywords: [...hsnData.keywords]
        });
        console.log(`✅ Created HSN code ${hsnData.code} - ${hsnData.description}`);
        created++;
      } catch (error) {
        console.error(`❌ Failed to create HSN code ${hsnData.code}:`, error instanceof Error ? error.message : error);
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
    await app.close();
  }
}

if (require.main === module) {
  seedHsnCodes().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { seedHsnCodes };