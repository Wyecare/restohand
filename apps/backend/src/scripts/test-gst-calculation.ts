import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { GstService } from '../gst/gst.service';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Restaurant, RestaurantDocument } from '../restaurants/schemas/restaurant.schema';

async function testGstCalculations() {
  console.log('🧪 Testing GST calculations...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const gstService = app.get(GstService);
  let restaurantModel: Model<RestaurantDocument> | null = null;
  let restaurantId: string | null = null;

  try {
    // Create a temporary restaurant for testing
    restaurantModel = app.get<Model<RestaurantDocument>>(getModelToken(Restaurant.name));
    const restaurant = await restaurantModel.create({
      name: 'GST Test Restaurant',
      slug: `gst-test-${Date.now()}`,
      address: {
        line1: '123 Test Street',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682001',
        country: 'IN',
      },
      upi: {
        vpa: 'gsttest@upi',
        displayName: 'GST Test Restaurant',
        mode: 'static',
      },
      settings: {
        orderNumberPrefix: 'GST',
        currency: 'INR',
        locale: 'en-IN',
        enableTax: true,
      },
      languages: ['en'],
      gstin: '32ABCDE1234F1Z5',
    });

    restaurantId = restaurant._id.toString();

    // Step 1: Create a default GST rate
    console.log('\n📝 Creating default GST rate (5%)...');
    const gstRate = await gstService.createGstRate(restaurantId, {
      categoryName: 'Food Items',
      description: 'Standard GST rate for food items',
      cgstRate: 2.5,
      sgstRate: 2.5,
      igstRate: 5,
      totalGstRate: 5,
      isActive: true,
      isDefault: true,
      effectiveFrom: new Date().toISOString(),
      notes: 'Test GST rate for food items',
    });
    console.log('✅ Created GST rate:', gstRate.id);

    // Step 2: Test order calculation
    console.log('\n🍽️  Testing order tax calculation...');
    const orderItems = [
      {
        menuItemId: new Types.ObjectId().toString(),
        name: 'Chicken Biriyani',
        quantity: 2,
        unitPrice: 250,
        hsnCode: '1006', // Rice HSN code
      },
      {
        menuItemId: new Types.ObjectId().toString(),
        name: 'Fish Curry',
        quantity: 1,
        unitPrice: 180,
        hsnCode: '0302', // Fish HSN code
      },
      {
        menuItemId: new Types.ObjectId().toString(),
        name: 'Coconut Water',
        quantity: 3,
        unitPrice: 30,
        hsnCode: '2201', // Beverages HSN code
      },
    ];

    const calculation = await gstService.calculateOrderTax(
      restaurantId,
      orderItems,
      'Kerala' // Same state - intra-state transaction
    );

    console.log('\n📊 Tax Calculation Results:');
    console.log('==========================================');

    calculation.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Unit Price: ₹${item.unitPrice}`);
      console.log(`   Gross Amount: ₹${item.grossAmount.toFixed(2)}`);
      console.log(`   Discount: ₹${item.discountAmount.toFixed(2)}`);
      console.log(`   Taxable Amount: ₹${item.taxableAmount.toFixed(2)}`);
      console.log(`   HSN Code: ${item.hsnCode || 'N/A'}`);
      console.log(`   GST Rate: ${item.gstRate}%`);
      console.log(`   CGST: ₹${item.cgstAmount.toFixed(2)}`);
      console.log(`   SGST: ₹${item.sgstAmount.toFixed(2)}`);
      console.log(`   IGST: ₹${item.igstAmount.toFixed(2)}`);
      console.log(`   Tax Amount: ₹${item.totalTaxAmount.toFixed(2)}`);
      console.log(`   Total with Tax: ₹${item.totalWithTax.toFixed(2)}`);
      console.log(`   Tax Inclusive: ${item.isTaxInclusive ? 'Yes' : 'No'}`);
    });

    console.log('\n📈 Order Summary:');
    console.log('==========================================');
    console.log(`Gross Amount: ₹${calculation.summary.grossAmount.toFixed(2)}`);
    console.log(`Discount: ₹${calculation.summary.discountAmount.toFixed(2)}`);
    console.log(`Taxable Amount: ₹${calculation.summary.subtotal.toFixed(2)}`);
    console.log(`CGST: ₹${calculation.summary.cgstAmount.toFixed(2)}`);
    console.log(`SGST: ₹${calculation.summary.sgstAmount.toFixed(2)}`);
    console.log(`IGST: ₹${calculation.summary.igstAmount.toFixed(2)}`);
    console.log(`Total Tax: ₹${calculation.summary.totalTaxAmount.toFixed(2)}`);
    console.log(`Final Total: ₹${calculation.summary.totalAmount.toFixed(2)}`);
    console.log(`Tax Type: ${calculation.summary.taxType}`);

    // Step 3: Test inter-state calculation
    console.log('\n🌍 Testing inter-state calculation (Kerala → Delhi)...');
    const interStateCalculation = await gstService.calculateOrderTax(
      restaurantId,
      [orderItems[0]], // Just one item for simplicity
      'Delhi' // Different state - inter-state transaction
    );

    console.log('\n📊 Inter-state Tax Calculation:');
    console.log('==========================================');
    const item = interStateCalculation.items[0];
    console.log(`${item.name}: Gross ₹${item.grossAmount.toFixed(2)} | Taxable ₹${item.taxableAmount.toFixed(2)}`);
    console.log(`CGST: ₹${item.cgstAmount.toFixed(2)}`);
    console.log(`SGST: ₹${item.sgstAmount.toFixed(2)}`);
    console.log(`IGST: ₹${item.igstAmount.toFixed(2)}`);
    console.log(`Tax Type: ${interStateCalculation.summary.taxType}`);

    // Step 4: Test GST rate retrieval
    console.log('\n📋 Testing GST rate management...');
    const allRates = await gstService.findGstRates(restaurantId);
    console.log(`✅ Found ${allRates.total} GST rates`);

    const defaultRate = await gstService.getDefaultGstRate(restaurantId);
    console.log(`✅ Default rate: ${defaultRate?.totalGstRate}%`);

    console.log('\n🎉 All GST tests passed successfully!');

  } catch (error) {
    console.error('❌ GST test failed:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : '');
    process.exit(1);
  } finally {
    if (restaurantModel && restaurantId) {
      await restaurantModel.deleteOne({ _id: restaurantId });
    }
    await app.close();
  }
}

if (require.main === module) {
  testGstCalculations().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { testGstCalculations };
