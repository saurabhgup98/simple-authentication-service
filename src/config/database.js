import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_CONFIG = {
    serverSelectionTimeoutMS: 10000, // Reduced from 30000 to fail faster
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    heartbeatFrequencyMS: 10000,
    bufferCommands: false, // Disable mongoose buffering; throw an error if not connected
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
// CONNECTION CACHING (for serverless environments)
// ============================================================================

// Cache connection for serverless environments
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

// ============================================================================
// MAIN CONNECTION FUNCTIONS
// ============================================================================

const connectDB = async () => {
    try {
        // Return cached connection if available
        if (cached.conn) {
            console.log('Using cached MongoDB connection');
            return cached.conn;
        }

        // Validate environment
        if (!getMongoUri()) {
            console.error('MONGODB_URI environment variable is not set');
            if (!isVercelEnvironment()) {
                process.exit(1);
            }
            return;
        }

        // Use existing promise if connection is in progress
        if (!cached.promise) {
            console.log('Creating new MongoDB connection...');
            cached.promise = mongoose.connect(getMongoUri(), DB_CONFIG).then((conn) => {
                console.log(`MongoDB Connected: ${conn.connection.host}`);
                setupConnectionEvents();
                return conn;
            }).catch((error) => {
                // Clear promise on error so we can retry
                cached.promise = null;
                throw error;
            });
        }

        // Wait for connection
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        console.error('Database connection failed:', error);
        cached.promise = null;
        cached.conn = null;

        if (!isVercelEnvironment()) {
            process.exit(1);
        }

        throw error;
    }
};

const ensureConnection = async () => {
    // Check if already connected
    if (isConnected()) {
        return;
    }

    // Check if connection is in progress
    if (cached.promise) {
        console.log('Waiting for existing connection...');
        try {
            await cached.promise;
            return;
        } catch (error) {
            // Connection failed, will try to reconnect
            console.log('Previous connection failed, attempting new connection...');
        }
    }

    // Attempt to connect
    console.log('Database not connected, attempting to connect...');
    try {
        await connectDB();
        // Wait a bit to ensure connection is fully established
        if (!isConnected()) {
            await waitForConnection();
        }
    } catch (error) {
        console.error('Failed to ensure connection:', error);
        throw error;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default connectDB;
export { ensureConnection, isConnected, waitForConnection };