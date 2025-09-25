import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getAppIdentifier, isValidAppEndpoint } from '../config/appMapping.js';

export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user still exists
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      // Check if user changed password after token was issued
      if (user.passwordChangedAt) {
        const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
        if (decoded.iat < changedTimestamp) {
          return res.status(401).json({
            success: false,
            error: 'User recently changed password! Please log in again'
          });
        }
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.log('Invalid token in optional auth:', error.message);
    }
  }

  next();
};

// App-aware authentication middleware
export const protectWithApp = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user still exists
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      // Get app endpoint from headers or query
      const appEndpoint = req.headers['x-app-endpoint'] || req.query.appEndpoint;
      
      if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid app endpoint. Must be a valid app URL.'
        });
      }

      const appIdentifier = getAppIdentifier(appEndpoint);

      // Check if user has access to the app
      if (!user.hasAccessToApp(appIdentifier)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You do not have permission to access this app.'
        });
      }

      // Check if user has active access to the app
      if (!user.hasActiveAccessToApp(appIdentifier)) {
        return res.status(403).json({
          success: false,
          error: 'Access to this application has been deactivated.'
        });
      }

      // Get user role and auth method for the specific app
      const role = user.getRoleForApp(appIdentifier);
      const authMethod = user.getAuthMethodForApp(appIdentifier);

      req.user = user;
      req.appEndpoint = appEndpoint;
      req.appIdentifier = appIdentifier;
      req.userRole = role;
      req.userAuthMethod = authMethod;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        error: 'User role not found. Please use protectWithApp middleware first.'
      });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.userRole}`
      });
    }

    next();
  };
};

// Admin-only middleware
export const requireAdmin = (req, res, next) => {
  if (!req.userRole) {
    return res.status(403).json({
      success: false,
      error: 'User role not found. Please use protectWithApp middleware first.'
    });
  }

  if (!['admin', 'superadmin'].includes(req.userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Super admin only middleware
export const requireSuperAdmin = (req, res, next) => {
  if (!req.userRole) {
    return res.status(403).json({
      success: false,
      error: 'User role not found. Please use protectWithApp middleware first.'
    });
  }

  if (req.userRole !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Super admin privileges required.'
    });
  }

  next();
};

// Authentication method validation middleware
export const validateAuthMethod = (requiredAuthMethod) => {
  return (req, res, next) => {
    if (!req.userAuthMethod) {
      return res.status(403).json({
        success: false,
        error: 'User auth method not found. Please use protectWithApp middleware first.'
      });
    }

    if (req.userAuthMethod !== requiredAuthMethod) {
      return res.status(403).json({
        success: false,
        error: `Access denied. This endpoint requires ${requiredAuthMethod} authentication. Your current auth method: ${req.userAuthMethod}`
      });
    }

    next();
  };
};

// Email-password only middleware
export const requireEmailPassword = validateAuthMethod('email-password');

// OAuth only middleware
export const requireOAuth = (req, res, next) => {
  if (!req.userAuthMethod) {
    return res.status(403).json({
      success: false,
      error: 'User auth method not found. Please use protectWithApp middleware first.'
    });
  }

  const oauthMethods = ['google-oauth', 'facebook-oauth', 'github-oauth'];
  if (!oauthMethods.includes(req.userAuthMethod)) {
    return res.status(403).json({
      success: false,
      error: `Access denied. This endpoint requires OAuth authentication. Your current auth method: ${req.userAuthMethod}`
    });
  }

  next();
};
