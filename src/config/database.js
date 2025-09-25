import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_CONFIG = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    heartbeatFrequencyMS: 10000,
};

const CONNECTION_STATES = {
    DISCONNECTED: 0,
    CONNECTED: 1,
    CONNECTING: 2,
    DISCONNECTING: 3,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const isVercelEnvironment = () => process.env.VERCEL === '1';
const getMongoUri = () => process.env.MONGODB_URI;
const isConnected = () => mongoose.connection.readyState === CONNECTION_STATES.CONNECTED;

const waitForConnection = () => {
    return new Promise((resolve, reject) => {
        if (isConnected()) {
            resolve();
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
        }, 30000);

        mongoose.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve();
        });

        mongoose.connection.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
};

// ============================================================================
// EVENT HANDLERS
// ============================================================================

const setupConnectionEvents = () => {
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
    });

    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected');
    });

    // Graceful shutdown
    if (!isVercelEnvironment()) {
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });
    }
};

// ============================================================================
// MAIN CONNECTION FUNCTIONS
// ============================================================================

const connectDB = async () => {
    try {
        // Validate environment
        if (!getMongoUri()) {
            console.error('MONGODB_URI environment variable is not set');
            if (!isVercelEnvironment()) {
                process.exit(1);
            }
            return;
        }

        // Connect to MongoDB
        const conn = await mongoose.connect(getMongoUri(), DB_CONFIG);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Setup event handlers
        setupConnectionEvents();

        return conn;
    } catch (error) {
        console.error('Database connection failed:', error);

        if (!isVercelEnvironment()) {
            process.exit(1);
        }

        console.log('Continuing without database connection in serverless environment');
        throw error;
    }
};

const ensureConnection = async () => {
    if (!isConnected()) {
        console.log('Database not connected, attempting to connect...');
        await connectDB();
        await waitForConnection();
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default connectDB;
export { ensureConnection, isConnected, waitForConnection };