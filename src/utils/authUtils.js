// Common logic for registration and login processes

import User from '../models/User.js';
import { getAppIdentifier, isValidAppEndpoint, isValidRole } from '../config/appMapping.js';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const validateBasicFields = (email, password, appEndpoint) => {
  if (!email || !password || !appEndpoint) {
    return {
      isValid: false,
      error: 'Email, password, and appEndpoint are required'
    };
  }
  return { isValid: true };
};

export const validateAppEndpoint = (appEndpoint) => {
  if (!isValidAppEndpoint(appEndpoint)) {
    return {
      isValid: false,
      error: 'Invalid app endpoint'
    };
  }
  return { isValid: true };
};

export const processRoles = (roles, appIdentifier) => {
  let userRoles = roles;
  
  if (!userRoles) {
    // Default roles based on app
    userRoles = appIdentifier === 'sera-food-business-app' ? ['business-user'] : ['user'];
  } else if (typeof userRoles === 'string') {
    userRoles = [userRoles];
  }
  
  return userRoles;
};

export const validateRoles = (userRoles) => {
  for (const role of userRoles) {
    if (!isValidRole(role)) {
      return {
        isValid: false,
        error: `Invalid role: ${role}`
      };
    }
  }
  return { isValid: true };
};

// ============================================================================
// USER OPERATIONS
// ============================================================================

export const findUserByEmail = async (email) => {
  return await User.findOne({ email: email.toLowerCase().trim() });
};

export const createNewUser = async (userData, appIdentifier, userRoles, password) => {
  return await User.create({
    username: userData.username || null,
    email: userData.email.toLowerCase().trim(),
    appRegistered: [{
      appIdentifier,
      roles: userRoles,
      authMethod: 'email-password',
      password: password,
      isActive: true
    }]
  });
};

export const addAppToExistingUser = async (user, appIdentifier, userRoles, password) => {
  await user.addAppRegistration(appIdentifier, userRoles, 'email-password', password);
  return user;
};

// ============================================================================
// LOGIN UTILITIES
// ============================================================================

export const findAppRegistration = (user, appIdentifier) => {
  return user.appRegistered.find(app => app.appIdentifier === appIdentifier);
};

export const validateAppAccess = (appRegistration) => {
  if (!appRegistration || !appRegistration.isActive) {
    return {
      isValid: false,
      error: 'No access to this app'
    };
  }
  return { isValid: true };
};

export const validateAuthMethod = (appRegistration) => {
  if (appRegistration.authMethod !== 'email-password') {
    return {
      isValid: false,
      error: `Must use ${appRegistration.authMethod} to access this app`
    };
  }
  return { isValid: true };
};

export const validateSelectedRole = (user, appIdentifier, selectedRole, appRegistration) => {
  if (selectedRole && !user.hasRoleForApp(appIdentifier, selectedRole)) {
    return {
      isValid: false,
      error: `User does not have role '${selectedRole}' for this app`,
      availableRoles: appRegistration.roles
    };
  }
  return { isValid: true };
};

export const authenticateUser = async (user, appIdentifier, password) => {
  const isPasswordValid = await user.comparePasswordForApp(appIdentifier, password);
  if (!isPasswordValid) {
    return {
      isValid: false,
      error: 'Invalid credentials'
    };
  }
  return { isValid: true };
};

// ============================================================================
// RESPONSE BUILDING
// ============================================================================

export const buildUserResponse = (user, appRegistration, appIdentifier, selectedRole) => {
  const finalRole = selectedRole || appRegistration.roles[0];
  
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: finalRole,
    availableRoles: appRegistration.roles,
    appIdentifier: appIdentifier,
    authMethod: appRegistration.authMethod
  };
};

export const buildRegistrationResponse = (user) => {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    appRegistered: user.appRegistered
  };
};
