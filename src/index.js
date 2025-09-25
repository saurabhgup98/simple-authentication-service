import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import passport from './config/passport.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import oauthRoutes from './routes/oauth.js';
import adminRoutes from './routes/admin.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database with error handling
connectDB().catch((error) => {
  console.error('Database connection failed:', error);
  // Don't exit in serverless environment
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://food-delivery-app-frontend.vercel.app',
  'https://food-delivery-business-app-sera.vercel.app'
];
console.log('CORS Allowed Origins:', allowedOrigins);
console.log('Environment:', process.env.NODE_ENV);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-app-endpoint'],
}));

// Rate limiting - DISABLED FOR DEVELOPMENT
// Uncomment and configure these for production deployment
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Specific rate limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/', authLimiter);
*/

console.log('Rate limiting DISABLED for development');

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Initialize Passport
app.use(passport.initialize());

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Simple Authentication Service is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL === '1',
    nodeVersion: process.version
  });
});

// Simple test endpoint (no database required)
app.get('/test', (req, res) => {
  res.status(200).json({
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    hasMongoUri: !!process.env.MONGODB_URI,
    hasJwtSecret: !!process.env.JWT_SECRET,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    rateLimiting: 'DISABLED for development',
    oauth: {
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Authentication service is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  });
});

// CORS test endpoint
app.get('/cors-test', (req, res) => {
  res.status(200).json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/admin', adminRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Central Authentication Service API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'POST /api/auth/logout': 'User logout',
        'POST /api/auth/refresh': 'Refresh access token',
        'POST /api/auth/forgot-password': 'Request password reset',
        'POST /api/auth/reset-password': 'Reset password',
        'POST /api/auth/verify-email': 'Verify email address',
        'POST /api/auth/resend-verification': 'Resend verification email'
      },
      user: {
        'GET /api/user/profile': 'Get user profile',
        'PUT /api/user/profile': 'Update user profile',
        'POST /api/user/change-password': 'Change password',
        'DELETE /api/user/account': 'Delete account'
      },
      oauth: {
        'GET /api/oauth/google': 'Google OAuth login',
        'GET /api/oauth/google/callback': 'Google OAuth callback',
        'GET /api/oauth/facebook': 'Facebook OAuth login',
        'GET /api/oauth/facebook/callback': 'Facebook OAuth callback',
        'GET /api/oauth/github': 'GitHub OAuth login',
        'GET /api/oauth/github/callback': 'GitHub OAuth callback'
      },
      admin: {
        'GET /api/admin/users': 'Get all users (Admin only)',
        'GET /api/admin/users/:userId': 'Get user by ID (Admin only)',
        'POST /api/admin/users/:userId/apps': 'Add app access to user (Admin only)',
        'PUT /api/admin/users/:userId/apps/:appIdentifier': 'Update user app role (Admin only)',
        'DELETE /api/admin/users/:userId/apps/:appIdentifier': 'Deactivate user from app (Admin only)',
        'POST /api/admin/users/:userId/apps/:appIdentifier/reactivate': 'Reactivate user in app (Admin only)',
        'GET /api/admin/apps/:appIdentifier/users': 'Get users by app (Admin only)'
      }
    },
    documentation: 'Use Postman to test these endpoints'
  });
});

// Global error handler to prevent crashes
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Authentication service running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
