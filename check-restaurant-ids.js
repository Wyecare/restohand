#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/restohand';

async function checkRestaurantIds() {
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Get restaurants
    console.log('\n🏪 Restaurants in database:');
    const restaurants = await db.collection('restaurants').find({}).toArray();
    restaurants.forEach((restaurant, index) => {
      console.log(`${index + 1}. ${restaurant.name}`);
      console.log(`   ID: ${restaurant._id}`);
      console.log('');
    });

    // Get users and their restaurant assignments
    console.log('👥 Users and their restaurant assignments:');
    const users = await db.collection('users').find({}).toArray();

    for (const user of users) {
      console.log(`\n👤 User: ${user.name || user.email}`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Restaurant ID: ${user.restaurantId}`);

      // Check if user's restaurant exists
      const restaurant = await db.collection('restaurants').findOne({ _id: new ObjectId(user.restaurantId) });
      if (restaurant) {
        console.log(`   ✅ Restaurant found: ${restaurant.name}`);
      } else {
        console.log(`   ❌ Restaurant NOT found!`);
      }

      // Check branches for this restaurant ID
      const branches = await db.collection('branches').find({ restaurantId: new ObjectId(user.restaurantId) }).toArray();
      console.log(`   🏢 Branches for this restaurant: ${branches.length}`);
      branches.forEach(branch => {
        console.log(`      - ${branch.name} (${branch.isMainBranch ? 'Main' : 'Branch'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkRestaurantIds().catch(console.error);