import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const updateAdminUser = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find existing admin user
    const existingAdmin = await User.findOne({ email: 'saurabhgup98@gmail.com' });
    if (!existingAdmin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('📝 Current admin details:', {
      email: existingAdmin.email,
      name: existingAdmin.name,
      appRegistered: existingAdmin.appRegistered,
      isActive: existingAdmin.isActive
    });

    // Update admin user with new structure
    existingAdmin.appRegistered = [{
      name: 'https://food-delivery-business-app-sera.vercel.app',
      role: 'superadmin'
    }];
    existingAdmin.isActive = true;
    existingAdmin.emailVerified = true;

    await existingAdmin.save();

    console.log('✅ Admin user updated successfully!');
    console.log('Updated admin details:', {
      id: existingAdmin._id,
      email: existingAdmin.email,
      name: existingAdmin.name,
      appRegistered: existingAdmin.appRegistered,
      isActive: existingAdmin.isActive,
      emailVerified: existingAdmin.emailVerified
    });

  } catch (error) {
    console.error('❌ Error updating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
updateAdminUser();
