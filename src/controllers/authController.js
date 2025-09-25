import User from '../models/User.js';
import { getAppIdentifier, isValidAppEndpoint } from '../config/appMapping.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    console.log('=== REGISTRATION REQUEST ===');
    console.log('Request body:', req.body);
    
    const { username, email, password, role, appEndpoint } = req.body;

    // Basic validation
    if (!email || !password || !appEndpoint) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and appEndpoint are required'
      });
    }

    // Validate app endpoint
    if (!isValidAppEndpoint(appEndpoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid app endpoint'
      });
    }

    const appIdentifier = getAppIdentifier(appEndpoint);
    
    // Set default role if not provided
    let userRole = role || 'user';
    if (appIdentifier === 'sera-food-business-app' && !role) {
      userRole = 'business-user';
    }

    console.log('Processing registration:', {
      email,
      appEndpoint,
      appIdentifier,
      role: userRole
    });

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      // User exists, check if they have access to this app
      if (user.hasAccessToApp(appIdentifier)) {
        return res.status(400).json({
          success: false,
          error: 'User already has access to this app'
        });
      }
      
      // Add app registration to existing user
      await user.addAppRegistration(appIdentifier, userRole);
      console.log('Added app registration to existing user');
    } else {
      // Create new user
      user = await User.create({
        username: username || null,
        email: email.toLowerCase().trim(),
        password,
        appRegistered: [{
          appIdentifier,
          role: userRole,
          isActive: true,
          activatedAt: new Date()
        }],
        emailVerified: true // Skip email verification for now
      });
      console.log('Created new user:', user._id);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toPublicJSON()
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    console.log('=== LOGIN REQUEST ===');
    console.log('Request body:', req.body);
    
    const { email, password, appEndpoint } = req.body;

    // Basic validation
    if (!email || !password || !appEndpoint) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and appEndpoint are required'
      });
    }

    // Validate app endpoint
    if (!isValidAppEndpoint(appEndpoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid app endpoint'
      });
    }

    const appIdentifier = getAppIdentifier(appEndpoint);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user has access to this app
    if (!user.hasAccessToApp(appIdentifier)) {
      return res.status(403).json({
        success: false,
        error: 'No access to this app'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Get user role for this app
    const role = user.getRoleForApp(appIdentifier);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toPublicJSON(),
        role,
        appIdentifier
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message
    });
  }
};

// @desc    Test endpoint
// @route   GET /api/auth/test
// @access  Public
export const test = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Simple auth service is working',
    timestamp: new Date().toISOString()
  });
};