#!/usr/bin/env node

import { connect, model, Schema, Types } from 'mongoose';

async function migrateOrderCounters() {
  // Connect directly to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restohand';
  await connect(mongoUri);
  console.log(`Connected to MongoDB: ${mongoUri}`);

  // Define minimal schemas for migration
  const restaurantSchema = new Schema({
    name: String,
    slug: String
  });

  const orderSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    orderNumber: String
  });

  const counterSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', unique: true },
    lastOrderNumber: { type: Number, default: 0 }
  });

  const orderModel = model('Order', orderSchema);
  const counterModel = model('OrderCounter', counterSchema);
  const restaurantModel = model('Restaurant', restaurantSchema);

  try {
    console.log('Starting order counter migration...');

    // Get all restaurants
    const restaurants = await restaurantModel.find().lean();

    for (const restaurant of restaurants) {
      console.log(`Processing restaurant: ${restaurant.name} (${restaurant._id})`);

      // Count existing orders for this restaurant
      const orderCount = await orderModel.countDocuments({
        restaurantId: restaurant._id
      });

      console.log(`Found ${orderCount} existing orders for ${restaurant.name}`);

      // Create or update counter
      await counterModel.findOneAndUpdate(
        { restaurantId: restaurant._id },
        {
          restaurantId: restaurant._id,
          lastOrderNumber: orderCount
        },
        {
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

      console.log(`Set counter for ${restaurant.name} to ${orderCount}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await (await import('mongoose')).disconnect();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateOrderCounters();
}

export { migrateOrderCounters };