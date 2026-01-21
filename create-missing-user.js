#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/restohand';

async function createMissingUser() {
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    const correctRestaurantId = '696aabfdd984f368464c1280';
    const missingUserId = '696bfdfb157c940c7c415f97';

    // Get the main branch
    const mainBranch = await db.collection('branches').findOne({
      restaurantId: new ObjectId(correctRestaurantId),
      isMainBranch: true
    });

    if (!mainBranch) {
      console.log('❌ Main branch not found');
      return;
    }

    // Create the missing user
    const newUser = {
      _id: new ObjectId(missingUserId),
      restaurantId: new ObjectId(correctRestaurantId),
      branchId: mainBranch._id,
      name: 'Anandhu Satheesh',
      email: 'admin@wyecaresolutions.com',
      roles: ['manager'],
      isActive: true,
      isPrimaryOwner: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('users').insertOne(newUser);
    console.log('✅ Created missing user');
    console.log(`   User ID: ${missingUserId}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Restaurant: ${correctRestaurantId}`);
    console.log(`   Branch: ${mainBranch._id}`);

    console.log('\n🎉 User created successfully!');
    console.log('🔄 Please refresh your frontend to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

createMissingUser().catch(console.error);