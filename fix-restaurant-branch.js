#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/restohand';

async function fixRestaurantBranch() {
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // The restaurant ID from your JWT token
    const targetRestaurantId = '696bfe0b157c940c7c415f9a';

    // Check if this restaurant exists
    console.log(`🔍 Checking for restaurant ${targetRestaurantId}...`);
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(targetRestaurantId)
    });

    if (!restaurant) {
      console.log('❌ Restaurant not found in database!');
      return;
    }

    console.log(`✅ Found restaurant: ${restaurant.name}`);

    // Check if branch already exists for this restaurant
    const existingBranch = await db.collection('branches').findOne({
      restaurantId: new ObjectId(targetRestaurantId),
    });

    if (existingBranch) {
      console.log('✅ Branch already exists for this restaurant');
      console.log(`   Branch: ${existingBranch.name}`);
      return;
    }

    // Create default branch for this restaurant
    console.log('🏢 Creating default branch...');
    const defaultBranch = {
      restaurantId: new ObjectId(targetRestaurantId),
      name: 'Main Branch',
      slug: 'main',
      description: `Main branch of ${restaurant.name}`,
      address: restaurant.address || {
        line1: 'Main Location',
        city: 'City',
        state: 'State',
        postalCode: '000000',
        country: 'IN',
      },
      contactPhone: restaurant.contactPhone || null,
      contactEmail: restaurant.contactEmail || null,
      isMainBranch: true,
      isActive: true,
      settings: {
        orderNumberPrefix: restaurant.settings?.orderNumberPrefix || 'ORD',
        enableTakeout: true,
        enableDineIn: true,
        enableDelivery: false,
        deliveryRadius: 0,
        deliveryFee: 0,
        minimumOrderValue: 0,
        operatingDays: [0, 1, 2, 3, 4, 5, 6],
      },
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('branches').insertOne(defaultBranch);
    console.log(`✅ Created branch with ID: ${result.insertedId}`);

    // Update restaurant to enable multi-branch
    await db.collection('restaurants').updateOne(
      { _id: new ObjectId(targetRestaurantId) },
      {
        $set: {
          isMultibranchEnabled: true,
          branchCount: 1,
        }
      }
    );

    // Update current user with branch assignment
    const currentUserId = '696bfdfb157c940c7c415f97';
    await db.collection('users').updateOne(
      { _id: new ObjectId(currentUserId) },
      { $set: { branchId: result.insertedId } }
    );

    console.log(`✅ Assigned current user to the branch`);

    // Update any other users for this restaurant
    const otherUsers = await db.collection('users').find({
      restaurantId: new ObjectId(targetRestaurantId),
      _id: { $ne: new ObjectId(currentUserId) }
    }).toArray();

    for (const user of otherUsers) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { branchId: result.insertedId } }
      );
      console.log(`✅ Updated user: ${user.name || user.email}`);
    }

    console.log('\n🎉 Branch setup completed successfully!');
    console.log('🔄 Please refresh your frontend to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixRestaurantBranch().catch(console.error);