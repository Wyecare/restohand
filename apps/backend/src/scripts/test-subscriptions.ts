import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Restaurant } from '../restaurants/schemas/restaurant.schema';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

async function testSubscriptions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const subscriptionsService = app.get(SubscriptionsService);
  const restaurantModel: Model<Restaurant> = app.get(getModelToken(Restaurant.name));

  try {
    console.log('🚀 Testing Subscription System');
    console.log('================================\n');

    // Find a test restaurant or create one for testing
    let testRestaurant = await restaurantModel.findOne();

    if (!testRestaurant) {
      console.log('❌ No restaurants found. Please create a restaurant first.');
      process.exit(1);
    }

    const restaurantId = testRestaurant._id.toString();
    console.log(`📍 Using restaurant: ${testRestaurant.name} (${restaurantId})\n`);

    // Test 1: Initialize hourly test subscription
    console.log('Test 1: Initialize Hourly Test Subscription');
    console.log('--------------------------------------------');

    const hourlyTest = await subscriptionsService.initializeTestSubscription(
      restaurantId,
      'starter',
      'hourly'
    );
    console.log('✅ Hourly subscription initialized:', hourlyTest);
    console.log();

    // Test 2: Check subscription status
    console.log('Test 2: Check Subscription Status');
    console.log('----------------------------------');

    const status = await subscriptionsService.getSubscriptionStatus(restaurantId);
    console.log('✅ Subscription status:', status);
    console.log();

    // Test 3: Initialize daily test subscription
    console.log('Test 3: Initialize Daily Test Subscription');
    console.log('-------------------------------------------');

    const dailyTest = await subscriptionsService.initializeTestSubscription(
      restaurantId,
      'pro',
      'daily'
    );
    console.log('✅ Daily subscription initialized:', dailyTest);
    console.log();

    // Test 4: Check updated status
    console.log('Test 4: Check Updated Status');
    console.log('-----------------------------');

    const updatedStatus = await subscriptionsService.getSubscriptionStatus(restaurantId);
    console.log('✅ Updated subscription status:', updatedStatus);
    console.log();

    // Test 5: Test upgrade plan
    console.log('Test 5: Test Plan Upgrade');
    console.log('--------------------------');

    await subscriptionsService.upgradePlan(restaurantId, 'enterprise', 'hourly');
    const upgradeStatus = await subscriptionsService.getSubscriptionStatus(restaurantId);
    console.log('✅ After upgrade:', upgradeStatus);
    console.log();

    // Test 6: Show pricing for different cycles
    console.log('Test 6: Pricing Overview');
    console.log('-------------------------');

    const planPricing = {
      hourly: {
        starter: 100,    // ₹1 per hour for testing
        pro: 200,        // ₹2 per hour for testing
        enterprise: 500, // ₹5 per hour for testing
      },
      daily: {
        starter: 1000,   // ₹10 per day for testing
        pro: 2000,       // ₹20 per day for testing
        enterprise: 5000, // ₹50 per day for testing
      },
      monthly: {
        starter: 99900,   // ₹999 per month (production)
        pro: 199900,      // ₹1999 per month (production)
        enterprise: 499900, // ₹4999 per month (production)
      },
    };

    console.log('Pricing structure:');
    Object.entries(planPricing).forEach(([cycle, plans]) => {
      console.log(`\n${cycle.toUpperCase()} billing:`);
      Object.entries(plans).forEach(([plan, price]) => {
        console.log(`  ${plan}: ₹${price / 100} per ${cycle.slice(0, -2)}`);
      });
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Key Features Implemented:');
    console.log('• Hourly and daily billing cycles for testing');
    console.log('• No free trial (direct to active subscription)');
    console.log('• Low test prices (₹1/hour, ₹10/day)');
    console.log('• Automatic billing via cron jobs');
    console.log('• Razorpay integration for payments');
    console.log('\n🔧 To test billing:');
    console.log('1. Set subscription to hourly billing');
    console.log('2. Wait 1 hour for automatic billing trigger');
    console.log('3. Check logs for billing notifications');
    console.log('4. Verify Razorpay orders are created');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await app.close();
  }
}

testSubscriptions().catch(console.error);