const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// User Schema (duplicate from TypeScript model for this script)
const UserSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  otp: { 
    type: String,
    default: null
  },
  otpExpiry: { 
    type: Date,
    default: null
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ phone: '08123' });
    if (existingAdmin) {
      console.log('Admin user already exists with phone: 08123');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin', 12);

    // Create admin user
    const admin = new User({
      phone: '08123',
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Phone: 08123');
    console.log('Password: admin');
    console.log('Role: admin');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createAdmin();