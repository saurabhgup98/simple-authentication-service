import User from '../models/User.js';
import { getAppIdentifier, isValidAppEndpoint, isValidRole } from '../config/appMapping.js';

// Test endpoint
export const test = (req, res) => {
  res.json({ 
    success: true, 
    message: 'Basic auth service is working',
    timestamp: new Date().toISOString()
  });
};

// Register user
export const register = async (req, res) => {
  try {
    console.log('Registration request:', req.body);
    
    const { username, email, password, roles, appEndpoint } = req.body;

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
    
    // Handle roles - if single role provided, convert to array
    let userRoles = roles;
    if (!userRoles) {
      // Default roles based on app
      userRoles = appIdentifier === 'sera-food-business-app' ? ['business-user'] : ['user'];
    } else if (typeof userRoles === 'string') {
      userRoles = [userRoles];
    }
    
    // Validate all roles
    for (const role of userRoles) {
      if (!isValidRole(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role: ${role}`
        });
      }
    }

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
      
            // Add app registration to existing user with app-specific password
            await user.addAppRegistration(appIdentifier, userRoles, 'email-password', password);
    } else {
      // Create new user
      user = await User.create({
        username: username || null,
        email: email.toLowerCase().trim(),
        appRegistered: [{
          appIdentifier,
          roles: userRoles,
          authMethod: 'email-password',
          password: password,
          isActive: true
        }]
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          appRegistered: user.appRegistered
        }
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

// Login user
export const login = async (req, res) => {
  try {
    console.log('Login request:', req.body);
    
        const { email, password, appEndpoint, selectedRole } = req.body;

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

    // Check if user has access to this app and get the app registration
    const appRegistration = user.appRegistered.find(app => app.appIdentifier === appIdentifier);
    if (!appRegistration || !appRegistration.isActive) {
      return res.status(403).json({
        success: false,
        error: 'No access to this app'
      });
    }

    // Check if the authentication method matches
    if (appRegistration.authMethod !== 'email-password') {
      return res.status(403).json({
        success: false,
        error: `Must use ${appRegistration.authMethod} to access this app`
      });
    }

    // Validate selected role
    if (selectedRole && !user.hasRoleForApp(appIdentifier, selectedRole)) {
      return res.status(403).json({
        success: false,
        error: `User does not have role '${selectedRole}' for this app`,
        availableRoles: appRegistration.roles
      });
    }

    // Check app-specific password
    const isPasswordValid = await user.comparePasswordForApp(appIdentifier, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Determine the role to return (selected role or first available role)
    const finalRole = selectedRole || appRegistration.roles[0];

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: finalRole,
          availableRoles: appRegistration.roles,
          appIdentifier: appIdentifier,
          authMethod: appRegistration.authMethod
        }
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