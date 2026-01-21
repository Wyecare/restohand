#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/restohand';

async function checkBranches() {
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Check branches collection
    console.log('\n📋 Branches in database:');
    const branches = await db.collection('branches').find({}).toArray();
    console.log(`Found ${branches.length} branches:`);

    branches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name} (${branch.slug})`);
      console.log(`   Restaurant ID: ${branch.restaurantId}`);
      console.log(`   Active: ${branch.isActive}`);
      console.log(`   Main Branch: ${branch.isMainBranch}`);
      console.log('');
    });

    // Check users and their restaurant IDs
    console.log('\n👥 Users in database:');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users:`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || user.email}`);
      console.log(`   Restaurant ID: ${user.restaurantId}`);
      console.log(`   Branch ID: ${user.branchId || 'Not assigned'}`);
      console.log(`   Roles: ${user.roles?.join(', ') || 'No roles'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkBranches().catch(console.error);