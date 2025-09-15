import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Check if MongoDB URI is provided
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      if (process.env.VERCEL !== '1') {
        process.exit(1);
      }
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout to 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown (only in non-serverless environments)
    if (process.env.VERCEL !== '1') {
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      });
    }

  } catch (error) {
    console.error('Database connection failed:', error);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    // In serverless environment, just log the error and continue
    console.log('Continuing without database connection in serverless environment');
  }
};

// Ensure database connection before operations
export const ensureConnection = async () => {
  if (mongoose.connection.readyState !== 1) {
    console.log('Database not connected, attempting to connect...');
    await connectDB();
  }
};

export default connectDB;
