import User from '../models/User.js';
import { revokeAllRefreshTokens } from '../utils/jwt.js';
import { getAppIdentifier, isValidAppEndpoint } from '../config/appMapping.js';

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          oauthProvider: user.oauthProvider,
          oauthData: user.oauthData,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email is already taken'
        });
      }
      
      // If email is changed, mark as unverified
      user.email = email.toLowerCase();
      user.emailVerified = false;
    }

    // Update name if provided
    if (name) {
      user.name = name;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          oauthProvider: user.oauthProvider,
          oauthData: user.oauthData,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

// @desc    Change password for specific app
// @route   POST /api/user/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, appEndpoint } = req.body;
    const user = req.user;

    // Validate app endpoint
    if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid app endpoint. Must be a valid app URL.'
      });
    }

    const appIdentifier = getAppIdentifier(appEndpoint);

    // Check if user has access to this app
    if (!user.hasAccessToApp(appIdentifier)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to access this app.'
      });
    }

    // Check if user's auth method for this app is email-password
    const authMethod = user.getAuthMethodForApp(appIdentifier);
    if (authMethod !== 'email-password') {
      return res.status(400).json({
        success: false,
        error: 'Password change is only available for email-password authentication'
      });
    }

    // Verify current password for this app
    const isCurrentPasswordValid = await user.comparePasswordForApp(appIdentifier, currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password for this app
    const app = user.appRegistered.find(app => app.appIdentifier === appIdentifier);
    if (app) {
      app.password = newPassword;
      app.passwordChangedAt = new Date();
      await user.save();
    }

    // Revoke all refresh tokens
    await revokeAllRefreshTokens(user._id);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully for this app'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
};

// @desc    Delete account
// @route   DELETE /api/user/account
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Revoke all refresh tokens
    await revokeAllRefreshTokens(user._id);

    // Delete user
    await User.findByIdAndDelete(user._id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
};

// ==================== ADMIN ENDPOINTS ====================

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, appIdentifier } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    // Filter by app if specified
    if (appIdentifier) {
      query['appRegistered.appIdentifier'] = appIdentifier;
    }

    const users = await User.find(query)
      .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires -loginAttempts -accountLockedUntil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/admin/users/:userId
// @access  Private (Admin)
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires -loginAttempts -accountLockedUntil');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
};

// @desc    Add app access to user (Admin only)
// @route   POST /api/admin/users/:userId/apps
// @access  Private (Admin)
export const addUserAppAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { appEndpoint, role, authMethod = 'email-password', password } = req.body;

    // Validate app endpoint
    if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid app endpoint. Must be a valid app URL.'
      });
    }

    const appIdentifier = getAppIdentifier(appEndpoint);

    // Validate role
    const validRoles = ['user', 'business-user', 'admin', 'superadmin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Validate auth method
    const validAuthMethods = ['email-password', 'google-oauth', 'facebook-oauth', 'github-oauth'];
    if (!validAuthMethods.includes(authMethod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid auth method. Must be one of: ${validAuthMethods.join(', ')}`
      });
    }

    // Validate password for email-password auth method
    if (authMethod === 'email-password' && (!password || password.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'Password is required for email-password authentication'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user already has access
    if (user.hasAccessToApp(appIdentifier)) {
      return res.status(400).json({
        success: false,
        error: 'User already has access to this app'
      });
    }

    // Add app registration with specified auth method
    await user.addAppRegistration(appIdentifier, role, authMethod, password);

    res.status(200).json({
      success: true,
      message: 'App access added successfully',
      data: {
        user: user.toPublicJSON(),
        appAccess: {
          appIdentifier,
          role,
          authMethod,
          isActive: true
        }
      }
    });
  } catch (error) {
    console.error('Add user app access error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add app access'
    });
  }
};

// @desc    Update user app role (Admin only)
// @route   PUT /api/admin/users/:userId/apps/:appIdentifier
// @access  Private (Admin)
export const updateUserAppRole = async (req, res) => {
  try {
    const { userId, appIdentifier } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['user', 'business-user', 'admin', 'superadmin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user has access to the app
    if (!user.hasAccessToApp(appIdentifier)) {
      return res.status(400).json({
        success: false,
        error: 'User does not have access to this app'
      });
    }

    // Update app registration
    await user.addAppRegistration(appIdentifier, role);

    res.status(200).json({
      success: true,
      message: 'User app role updated successfully',
      data: {
        user: user.toPublicJSON(),
        appAccess: {
          appIdentifier,
          role,
          isActive: true
        }
      }
    });
  } catch (error) {
    console.error('Update user app role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update app role'
    });
  }
};

// @desc    Deactivate user from app (Admin only)
// @route   DELETE /api/admin/users/:userId/apps/:appIdentifier
// @access  Private (Admin)
export const deactivateUserFromApp = async (req, res) => {
  try {
    const { userId, appIdentifier } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user has access to the app
    if (!user.hasAccessToApp(appIdentifier)) {
      return res.status(400).json({
        success: false,
        error: 'User does not have access to this app'
      });
    }

    // Deactivate user from app
    await user.deactivateFromApp(appIdentifier, req.user._id, reason);

    res.status(200).json({
      success: true,
      message: 'User deactivated from app successfully',
      data: {
        user: user.toPublicJSON(),
        deactivation: {
          appIdentifier,
          reason,
          deactivatedAt: new Date(),
          deactivatedBy: req.user._id
        }
      }
    });
  } catch (error) {
    console.error('Deactivate user from app error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user from app'
    });
  }
};

// @desc    Reactivate user in app (Admin only)
// @route   POST /api/admin/users/:userId/apps/:appIdentifier/reactivate
// @access  Private (Admin)
export const reactivateUserInApp = async (req, res) => {
  try {
    const { userId, appIdentifier } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user has access to the app
    if (!user.hasAccessToApp(appIdentifier)) {
      return res.status(400).json({
        success: false,
        error: 'User does not have access to this app'
      });
    }

    // Reactivate user in app
    await user.reactivateInApp(appIdentifier);

    res.status(200).json({
      success: true,
      message: 'User reactivated in app successfully',
      data: {
        user: user.toPublicJSON(),
        reactivation: {
          appIdentifier,
          reactivatedAt: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Reactivate user in app error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate user in app'
    });
  }
};

// @desc    Get users by app (Admin only)
// @route   GET /api/admin/apps/:appIdentifier/users
// @access  Private (Admin)
export const getUsersByApp = async (req, res) => {
  try {
    const { appIdentifier } = req.params;
    const { page = 1, limit = 10, role, isActive } = req.query;
    const skip = (page - 1) * limit;

    let query = { 'appRegistered.appIdentifier': appIdentifier };
    
    // Filter by role if specified
    if (role) {
      query['appRegistered.role'] = role;
    }
    
    // Filter by active status if specified
    if (isActive !== undefined) {
      query['appRegistered.isActive'] = isActive === 'true';
    }

    const users = await User.find(query)
      .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires -loginAttempts -accountLockedUntil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        appIdentifier,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users by app error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users by app'
    });
  }
};
