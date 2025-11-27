import { getAppIdentifier } from '../config/appMapping.js';
import { ensureConnection } from '../config/database.js';
import {
  validateBasicFields,
  validateAppEndpoint,
  processRoles,
  validateRoles,
  findUserByEmail,
  createNewUser,
  addAppToExistingUser,
  findAppRegistration,
  validateAppAccess,
  validateAuthMethod,
  validateSelectedRole,
  authenticateUser,
  buildUserResponse,
  buildRegistrationResponse
} from '../utils/authUtils.js';

import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendValidationErrorResponse,
  sendUnauthorizedResponse,
  sendInternalServerErrorResponse,
  logRequest,
  logError
} from '../utils/responseHelpers.js';

// Test endpoint
export const test = (req, res) => {
  return sendSuccessResponse(res, {
    timestamp: new Date().toISOString()
  }, 'Basic auth service is working');
};

// Register user
export const register = async (req, res) => {
  try {
    logRequest(req, 'Registration');
    
    // Ensure database connection before proceeding
    await ensureConnection();
    
    const { username, email, password, roles, appEndpoint } = req.body;

    // Basic validation
    const basicValidation = validateBasicFields(email, password, appEndpoint);
    if (!basicValidation.isValid) {
      return sendValidationErrorResponse(res, basicValidation);
    }

    // Validate app endpoint
    const appValidation = validateAppEndpoint(appEndpoint);
    if (!appValidation.isValid) {
      return sendValidationErrorResponse(res, appValidation);
    }

    const appIdentifier = getAppIdentifier(appEndpoint);
    
    // Process and validate roles
    const userRoles = processRoles(roles, appIdentifier);
    const roleValidation = validateRoles(userRoles);
    if (!roleValidation.isValid) {
      return sendValidationErrorResponse(res, roleValidation);
    }

    // Check if user already exists
    let user = await findUserByEmail(email);

    if (user) {
      // User exists, check if they have access to this app
      if (user.hasAccessToApp(appIdentifier)) {
        return sendValidationErrorResponse(res, {
          error: 'User already has access to this app'
        });
      }
      
      // Add app registration to existing user
      user = await addAppToExistingUser(user, appIdentifier, userRoles, password);
    } else {
      // Create new user
      user = await createNewUser({ username, email }, appIdentifier, userRoles, password);
    }

    return sendCreatedResponse(res, {
      user: buildRegistrationResponse(user)
    }, 'User registered successfully');

  } catch (error) {
    logError('Registration', error);
    return sendInternalServerErrorResponse(res, 'Registration failed', error.message);
  }
};

// Login user
export const login = async (req, res) => {
  try {
    logRequest(req, 'Login');
    
    // Ensure database connection before proceeding
    await ensureConnection();
    
    const { email, password, appEndpoint, selectedRole } = req.body;

    // Basic validation
    const basicValidation = validateBasicFields(email, password, appEndpoint);
    if (!basicValidation.isValid) {
      return sendValidationErrorResponse(res, basicValidation);
    }

    // Validate app endpoint
    const appValidation = validateAppEndpoint(appEndpoint);
    if (!appValidation.isValid) {
      return sendValidationErrorResponse(res, appValidation);
    }

    const appIdentifier = getAppIdentifier(appEndpoint);

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return sendUnauthorizedResponse(res, 'Invalid credentials');
    }

    // Check if user has access to this app and get the app registration
    const appRegistration = findAppRegistration(user, appIdentifier);
    const accessValidation = validateAppAccess(appRegistration);
    if (!accessValidation.isValid) {
      return sendValidationErrorResponse(res, accessValidation);
    }

    // Check if the authentication method matches
    const authMethodValidation = validateAuthMethod(appRegistration);
    if (!authMethodValidation.isValid) {
      return sendValidationErrorResponse(res, authMethodValidation);
    }

    // Validate selected role
    const roleValidation = validateSelectedRole(user, appIdentifier, selectedRole, appRegistration);
    if (!roleValidation.isValid) {
      return sendValidationErrorResponse(res, roleValidation);
    }

    // Check app-specific password
    const passwordValidation = await authenticateUser(user, appIdentifier, password);
    if (!passwordValidation.isValid) {
      return sendUnauthorizedResponse(res, passwordValidation.error);
    }

    return sendSuccessResponse(res, {
      user: buildUserResponse(user, appRegistration, appIdentifier, selectedRole)
    }, 'Login successful');

  } catch (error) {
    logError('Login', error);
    return sendInternalServerErrorResponse(res, 'Login failed', error.message);
  }
};