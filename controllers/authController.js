import { createUser, userExists } from '../services/userService.js';
import { authenticateUser } from '../services/authService.js';
import { validateRegistration, validateLogin } from '../utils/validation.js';
import { successResponse, errorResponse, formatUserData } from '../utils/response.js';

// Register user
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate input
    const validation = validateRegistration(username, email, password, role);
    if (!validation.valid) {
      return errorResponse(res, 400, validation.message);
    }

    // Check if user already exists
    const existingUser = await userExists(email, username);
    if (existingUser) {
      return errorResponse(res, 400, 'User with this email or username already exists');
    }

    // Create new user
    const user = await createUser({ username, email, password, role });

    return successResponse(res, 201, 'User registered successfully', {
      user: formatUserData(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(res, 500, 'Registration failed', error.message);
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validation = validateLogin(email, password);
    if (!validation.valid) {
      return errorResponse(res, 400, validation.message);
    }

    // Authenticate user
    const authResult = await authenticateUser(email, password);
    if (!authResult.success) {
      return errorResponse(res, 401, authResult.message);
    }

    return successResponse(res, 200, 'Login successful', {
      user: formatUserData(authResult.user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 500, 'Login failed', error.message);
  }
};
