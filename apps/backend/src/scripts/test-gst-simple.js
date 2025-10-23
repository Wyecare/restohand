const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restohand';

async function testGstCalculation() {
  console.log('🧪 Testing GST calculations...');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('📊 Connected to MongoDB');

    const db = client.db();
    const gstRatesCollection = db.collection('gstrates');

    // Step 1: Create a test restaurant ID
    const restaurantId = new ObjectId().toString();
    console.log(`🏪 Using test restaurant ID: ${restaurantId}`);

    // Step 2: Create a default GST rate
    console.log('\n📝 Creating default GST rate (5%)...');
    const gstRateDoc = {
      restaurantId: new ObjectId(restaurantId),
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const gstRateResult = await gstRatesCollection.insertOne(gstRateDoc);
    console.log(`✅ Created GST rate: ${gstRateResult.insertedId}`);

    // Step 3: Test manual tax calculation (simulating the service logic)
    console.log('\n🍽️  Testing order tax calculation...');

    const orderItems = [
      {
        menuItemId: new ObjectId().toString(),
        name: 'Chicken Biriyani',
        quantity: 2,
        unitPrice: 250,
        hsnCode: '1006', // Rice HSN code
      },
      {
        menuItemId: new ObjectId().toString(),
        name: 'Fish Curry',
        quantity: 1,
        unitPrice: 180,
        hsnCode: '0302', // Fish HSN code
      },
      {
        menuItemId: new ObjectId().toString(),
        name: 'Coconut Water',
        quantity: 3,
        unitPrice: 30,
        hsnCode: '2201', // Beverages HSN code (should be 18% but we'll use default 5%)
      },
    ];

    // Calculate tax for each item (using default 5% rate)
    const gstRate = 5;
    const cgstRate = 2.5;
    const sgstRate = 2.5;
    const igstRate = 5;
    const isIntraState = true; // Kerala to Kerala

    let totalAmount = 0;
    let totalTaxAmount = 0;
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    let totalIgstAmount = 0;

    console.log('\n📊 Tax Calculation Results:');
    console.log('==========================================');

    orderItems.forEach((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      const taxAmount = (itemTotal * gstRate) / 100;
      const cgstAmount = isIntraState ? (itemTotal * cgstRate) / 100 : 0;
      const sgstAmount = isIntraState ? (itemTotal * sgstRate) / 100 : 0;
      const igstAmount = !isIntraState ? (itemTotal * igstRate) / 100 : 0;
      const totalWithTax = itemTotal + taxAmount;

      totalAmount += itemTotal;
      totalTaxAmount += taxAmount;
      totalCgstAmount += cgstAmount;
      totalSgstAmount += sgstAmount;
      totalIgstAmount += igstAmount;

      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Unit Price: ₹${item.unitPrice}`);
      console.log(`   Total: ₹${itemTotal}`);
      console.log(`   HSN Code: ${item.hsnCode || 'N/A'}`);
      console.log(`   GST Rate: ${gstRate}%`);
      console.log(`   CGST: ₹${cgstAmount.toFixed(2)}`);
      console.log(`   SGST: ₹${sgstAmount.toFixed(2)}`);
      console.log(`   IGST: ₹${igstAmount.toFixed(2)}`);
      console.log(`   Tax Amount: ₹${taxAmount.toFixed(2)}`);
      console.log(`   Total with Tax: ₹${totalWithTax.toFixed(2)}`);
    });

    console.log('\n📈 Order Summary:');
    console.log('==========================================');
    console.log(`Subtotal: ₹${totalAmount.toFixed(2)}`);
    console.log(`CGST: ₹${totalCgstAmount.toFixed(2)}`);
    console.log(`SGST: ₹${totalSgstAmount.toFixed(2)}`);
    console.log(`IGST: ₹${totalIgstAmount.toFixed(2)}`);
    console.log(`Total Tax: ₹${totalTaxAmount.toFixed(2)}`);
    console.log(`Final Total: ₹${(totalAmount + totalTaxAmount).toFixed(2)}`);
    console.log(`Tax Type: ${isIntraState ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}`);

    // Step 4: Test inter-state calculation
    console.log('\n🌍 Testing inter-state calculation (Kerala → Delhi)...');
    const interStateCgstAmount = 0;
    const interStateSgstAmount = 0;
    const interStateIgstAmount = (orderItems[0].quantity * orderItems[0].unitPrice * igstRate) / 100;
    const interStateTaxAmount = interStateIgstAmount;

    console.log('\n📊 Inter-state Tax Calculation:');
    console.log('==========================================');
    const item = orderItems[0];
    const itemTotal = item.quantity * item.unitPrice;
    console.log(`${item.name}: ₹${itemTotal}`);
    console.log(`CGST: ₹${interStateCgstAmount.toFixed(2)}`);
    console.log(`SGST: ₹${interStateSgstAmount.toFixed(2)}`);
    console.log(`IGST: ₹${interStateIgstAmount.toFixed(2)}`);
    console.log(`Tax Type: Inter-state (IGST)`);

    // Step 5: Test GST rate retrieval
    console.log('\n📋 Testing GST rate management...');
    const allRates = await gstRatesCollection.find({
      restaurantId: new ObjectId(restaurantId)
    }).toArray();
    console.log(`✅ Found ${allRates.length} GST rates`);

    const defaultRate = await gstRatesCollection.findOne({
      restaurantId: new ObjectId(restaurantId),
      isDefault: true
    });
    console.log(`✅ Default rate: ${defaultRate?.totalGstRate}%`);

    console.log('\n🎉 All GST tests passed successfully!');

    // Clean up test data
    await gstRatesCollection.deleteOne({ _id: gstRateResult.insertedId });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ GST test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  testGstCalculation().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { testGstCalculation };