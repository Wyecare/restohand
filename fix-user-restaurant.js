#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URL = process.env.MONGODB_URI;

async function fixUserRestaurant() {
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    const currentUserId = '696bfdfb157c940c7c415f97';
    const correctRestaurantId = '696aabfdd984f368464c1280'; // The one with branches

    console.log('🔧 Fixing user restaurant assignment...');

    // Check if user exists
    const user = await db.collection('users').findOne({
      _id: new ObjectId(currentUserId),
    });

    if (!user) {
      console.log(
        '❌ Current user not found, let me check what users exist...'
      );
      const allUsers = await db.collection('users').find({}).toArray();
      console.log('\n👥 All users in database:');
      allUsers.forEach((u, index) => {
        console.log(`${index + 1}. ${u.name || u.email} (ID: ${u._id})`);
        console.log(`   Restaurant: ${u.restaurantId}`);
      });
      return;
    }

    console.log(`👤 Found user: ${user.name || user.email}`);
    console.log(`   Current restaurant: ${user.restaurantId}`);

    // Get the main branch for the correct restaurant
    const mainBranch = await db.collection('branches').findOne({
      restaurantId: new ObjectId(correctRestaurantId),
      isMainBranch: true,
    });

    if (!mainBranch) {
      console.log('❌ Main branch not found for correct restaurant');
      return;
    }

    // Update user to belong to the correct restaurant and branch
    const updateResult = await db.collection('users').updateOne(
      { _id: new ObjectId(currentUserId) },
      {
        $set: {
          restaurantId: new ObjectId(correctRestaurantId),
          branchId: mainBranch._id,
        },
      }
    );

    console.log(`✅ Updated user restaurant assignment`);
    console.log(`   New restaurant ID: ${correctRestaurantId}`);
    console.log(`   New branch ID: ${mainBranch._id}`);

    console.log('\n🎉 User restaurant assignment fixed!');
    console.log('🔄 Please log out and log back in to get a fresh JWT token.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixUserRestaurant().catch(console.error);
