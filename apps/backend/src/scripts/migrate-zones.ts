import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { ZoneManagementService } from '../restaurant-tables/zone-management.service';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';

async function migrateZones() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const zoneService = app.get(ZoneManagementService);
  const restaurantModel = app.get<Model<any>>(getModelToken(Restaurant.name));

  try {
    console.log('Starting zone migration...');

    // Get all active restaurants
    const restaurants = await restaurantModel.find({ isActive: true }).exec();
    console.log(`Found ${restaurants.length} active restaurants`);

    for (const restaurant of restaurants) {
      console.log(`Processing restaurant: ${restaurant.name} (${restaurant._id})`);

      try {
        // Create default zones if they don't exist
        const defaultZones = ['Main Dining', 'VIP', 'Outdoor'];

        for (const zoneName of defaultZones) {
          try {
            await zoneService.createZone(restaurant._id.toString(), { name: zoneName });
            console.log(`  ✅ Created zone: ${zoneName}`);
          } catch (error) {
            if (error.message?.includes('already exists')) {
              console.log(`  ⏭️ Zone already exists: ${zoneName}`);
            } else {
              console.log(`  ❌ Error creating zone ${zoneName}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`❌ Error processing restaurant ${restaurant.name}: ${error.message}`);
      }
    }

    console.log('Zone migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await app.close();
  }
}

// Run the migration
migrateZones().catch(console.error);