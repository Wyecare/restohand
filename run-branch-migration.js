#!/usr/bin/env node

/**
 * Branch Migration Script
 *
 * This script creates default branches for all existing restaurants
 * and assigns existing data to those branches.
 *
 * Run this script from the root directory after starting your backend.
 */

const { MongoClient } = require('mongodb');

// MongoDB connection string - adjust if needed
const MONGODB_URL =
  'mongodb+srv://restohand_db_user:wEST6aEZYzMh9aI9@restohand-cluster.id0usb3.mongodb.net/?appName=restohand-cluster';

async function runMigration() {
  console.log('🚀 Starting Branch Migration...');

  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Step 1: Find all restaurants
    console.log('\n📋 Step 1: Finding existing restaurants...');
    const restaurants = await db.collection('restaurants').find({}).toArray();
    console.log(`Found ${restaurants.length} restaurants`);

    if (restaurants.length === 0) {
      console.log('❌ No restaurants found. Please create a restaurant first.');
      return;
    }

    // Step 2: Create default branches for each restaurant
    console.log('\n🏢 Step 2: Creating default branches...');
    const branchIds = {};

    for (const restaurant of restaurants) {
      // Check if branch already exists
      const existingBranch = await db.collection('branches').findOne({
        restaurantId: restaurant._id,
        isMainBranch: true,
      });

      if (existingBranch) {
        console.log(`✅ Branch already exists for ${restaurant.name}`);
        branchIds[restaurant._id.toString()] = existingBranch._id;
        continue;
      }

      // Create default branch
      const defaultBranch = {
        restaurantId: restaurant._id,
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
      branchIds[restaurant._id.toString()] = result.insertedId;

      console.log(`✅ Created branch for ${restaurant.name}`);

      // Update restaurant to enable multi-branch
      await db.collection('restaurants').updateOne(
        { _id: restaurant._id },
        {
          $set: {
            isMultibranchEnabled: true,
            branchCount: 1,
          },
        }
      );
    }

    // Step 3: Update users with branch assignments
    console.log('\n👥 Step 3: Updating users with branch assignments...');
    const users = await db
      .collection('users')
      .find({ branchId: { $exists: false } })
      .toArray();

    for (const user of users) {
      const branchId = branchIds[user.restaurantId.toString()];
      if (branchId) {
        await db
          .collection('users')
          .updateOne({ _id: user._id }, { $set: { branchId } });
        console.log(`✅ Updated user ${user.name || user.email}`);
      }
    }

    // Step 4: Update orders (in batches for performance)
    console.log('\n📦 Step 4: Updating orders with branch assignments...');
    const orderCount = await db
      .collection('orders')
      .countDocuments({ branchId: { $exists: false } });
    console.log(`Found ${orderCount} orders to update`);

    if (orderCount > 0) {
      // Process in batches
      const batchSize = 100;
      let processed = 0;

      while (processed < orderCount) {
        const orders = await db
          .collection('orders')
          .find({ branchId: { $exists: false } })
          .limit(batchSize)
          .toArray();

        if (orders.length === 0) break;

        const bulkOps = orders
          .map((order) => {
            const branchId = branchIds[order.restaurantId.toString()];
            return {
              updateOne: {
                filter: { _id: order._id },
                update: { $set: { branchId } },
              },
            };
          })
          .filter((op) => op.updateOne.update.$set.branchId);

        if (bulkOps.length > 0) {
          await db.collection('orders').bulkWrite(bulkOps);
        }

        processed += orders.length;
        console.log(`📦 Updated ${processed}/${orderCount} orders`);
      }
    }

    // Step 5: Update inventory items
    console.log('\n📦 Step 5: Updating inventory items...');
    const inventoryItems = await db
      .collection('inventory_items')
      .find({ branchId: { $exists: false } })
      .toArray();

    for (const item of inventoryItems) {
      const branchId = branchIds[item.restaurantId.toString()];
      if (branchId) {
        await db
          .collection('inventory_items')
          .updateOne({ _id: item._id }, { $set: { branchId } });
      }
    }
    console.log(`✅ Updated ${inventoryItems.length} inventory items`);

    // Step 6: Update other collections (tables, menu items, etc.)
    console.log('\n🪑 Step 6: Updating tables...');
    const tables = await db
      .collection('restaurant_tables')
      .find({ branchId: { $exists: false } })
      .toArray();

    for (const table of tables) {
      const branchId = branchIds[table.restaurantId.toString()];
      if (branchId) {
        await db
          .collection('restaurant_tables')
          .updateOne({ _id: table._id }, { $set: { branchId } });
      }
    }
    console.log(`✅ Updated ${tables.length} tables`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Restaurants: ${restaurants.length}`);
    console.log(`   • Branches created: ${Object.keys(branchIds).length}`);
    console.log(`   • Users updated: ${users.length}`);
    console.log(`   • Orders updated: ${orderCount}`);
    console.log(`   • Inventory items updated: ${inventoryItems.length}`);
    console.log(`   • Tables updated: ${tables.length}`);

    console.log('\n✅ Your multi-branch system is now ready!');
    console.log('🔄 Please refresh your frontend to see the changes.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run the migration
runMigration().catch(console.error);
