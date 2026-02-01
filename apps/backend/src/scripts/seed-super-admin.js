const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/restohand';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  roles: [{ type: String }],
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seedSuperAdmins() {
  const superAdmins = [
    {
      email: 'admin@restohand.com',
      name: 'Super Admin',
      password: 'testing@123',
      roles: ['super_admin']
    },
    {
      email: 'anandhu@restohand.com',
      name: 'Anandhu Satheesh',
      password: 'testing@123',
      roles: ['super_admin']
    }
  ];

  for (const adminData of superAdmins) {
    try {
      // Check if admin already exists
      const existingAdmin = await User.findOne({ email: adminData.email });

      if (existingAdmin) {
        console.log(`Super admin already exists: ${adminData.email}`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 12);

      // Create super admin directly with insertOne to bypass validations
      await User.collection.insertOne({
        email: adminData.email,
        name: adminData.name,
        roles: adminData.roles,
        passwordHash: hashedPassword,
        restaurantId: null,
        isActive: true,
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Super admin created: ${adminData.email}`);

    } catch (error) {
      console.error(`❌ Failed to create super admin ${adminData.email}:`, error.message);
    }
  }

  console.log('Super admin seeding completed');
}

async function main() {
  try {
    console.log('🌱 Starting super admin seeding...');
    await connectDB();

    // First, remove existing super admins to fix password field issue
    console.log('🗑️ Removing existing super admins...');
    const deleteResult = await User.deleteMany({
      roles: { $in: ['super_admin'] }
    });
    console.log(`Removed ${deleteResult.deletedCount} existing super admins`);

    await seedSuperAdmins();
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();