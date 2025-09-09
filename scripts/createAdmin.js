import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'saurabhgup98@gmail.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      console.log('Admin details:', {
        email: existingAdmin.email,
        name: existingAdmin.name,
        appRegistered: existingAdmin.appRegistered,
        isActive: existingAdmin.isActive
      });
      return;
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash('Arju@0562', saltRounds);

    // Create admin user
    const adminUser = await User.create({
      name: 'Saurabh Gupta',
      email: 'saurabhgup98@gmail.com',
      password: hashedPassword,
      appRegistered: [{
        name: 'https://food-delivery-business-app-sera.vercel.app',
        role: 'superadmin'
      }],
      isActive: true,
      emailVerified: true, // Admin doesn't need email verification
      oauthProvider: 'local'
    });

    console.log('✅ Admin user created successfully!');
    console.log('Admin details:', {
      id: adminUser._id,
      email: adminUser.email,
      name: adminUser.name,
      appRegistered: adminUser.appRegistered,
      isActive: adminUser.isActive,
      emailVerified: adminUser.emailVerified
    });

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
createAdminUser();
