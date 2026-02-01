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
  passwordHash: { type: String, select: false },
  roles: [{ type: String }],
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function debugSuperAdmin() {
  try {
    console.log('🔍 Checking super admin in database...');

    // Find super admin with password
    const admin = await User.findOne({ email: 'admin@restohand.com' }).select('+passwordHash');

    if (!admin) {
      console.log('❌ Admin not found in database');
      return;
    }

    console.log('✅ Found admin:', {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      roles: admin.roles,
      isActive: admin.isActive,
      hasPasswordHash: !!admin.passwordHash,
      passwordHashLength: admin.passwordHash ? admin.passwordHash.length : 0
    });

    // Test password validation
    const testPassword = 'testing@123';
    if (admin.passwordHash) {
      const isValid = await bcrypt.compare(testPassword, admin.passwordHash);
      console.log(`🔐 Password validation for "${testPassword}":`, isValid);

      if (!isValid) {
        console.log('🔨 Creating new hash for comparison...');
        const newHash = await bcrypt.hash(testPassword, 12);
        console.log('Original hash:', admin.passwordHash.substring(0, 30) + '...');
        console.log('New hash:     ', newHash.substring(0, 30) + '...');
      }
    } else {
      console.log('❌ No passwordHash found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  try {
    await connectDB();
    await debugSuperAdmin();
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();