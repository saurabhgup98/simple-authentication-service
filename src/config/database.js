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
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
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

export default connectDB;
