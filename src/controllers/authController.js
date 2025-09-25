import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { generateTokenPair, revokeRefreshToken, revokeAllRefreshTokens } from '../utils/jwt.js';
import { generateEmailVerificationToken, generatePasswordResetToken } from '../utils/jwt.js';
import { sendEmail } from '../utils/email.js';
import { ensureConnection } from '../config/database.js';
import { getAppIdentifier, isValidAppEndpoint } from '../config/appMapping.js';

// @desc    Test endpoint
// @route   GET /api/auth/test
// @access  Public
export const test = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth service is working',
    timestamp: new Date().toISOString()
  });
};

// @desc    Register user (Simplified for testing)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    console.log('=== REGISTRATION ENDPOINT REACHED ===');
    console.log('Registration attempt:', { name: req.body.name, email: req.body.email });
    console.log('Full request body:', req.body);
    const { name, email, password, appEndpoint, authMethod = 'email-password' } = req.body;

    // Validate auth method
    const validAuthMethods = ['email-password', 'google-oauth', 'facebook-oauth', 'github-oauth'];
    if (!validAuthMethods.includes(authMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid authentication method'
      });
    }

    // Minimal validation - just check if fields are not empty
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Name is required and cannot be empty'
      });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Email is required and cannot be empty'
      });
    }

    // Validate password only for email-password auth method
    if (authMethod === 'email-password' && (!password || password.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'Password is required for email-password authentication'
      });
    }

    // Validate app endpoint
    if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid app endpoint. Must be a valid app URL.'
      });
    }

    const appIdentifier = getAppIdentifier(appEndpoint);
    const role = 'user'; // Default role for new registrations
    
    console.log('App validation:', {
      appEndpoint,
      appIdentifier,
      isValid: isValidAppEndpoint(appEndpoint)
    });

    // Ensure database connection
    await ensureConnection();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Check if user already has access to this app
      if (existingUser.hasAccessToApp(appIdentifier)) {
        return res.status(400).json({
          success: false,
          error: 'User already has access to this app. Please use your existing authentication method to login.'
        });
      }
      
      // Add new app registration to existing user
      await existingUser.addAppRegistration(appIdentifier, role, authMethod, password);
      
      // Generate tokens for existing user
      const { accessToken, refreshToken } = await generateTokenPair(existingUser._id);
      
      return res.status(200).json({
        success: true,
        message: 'App access added to existing account',
        data: {
          user: existingUser.toPublicJSON(),
          tokens: { accessToken, refreshToken }
        }
      });
    }

    // Create new user with app-specific authentication
    console.log('Creating user with data:', {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      oauthProvider: 'local',
      appRegistered: [{ 
        appIdentifier, 
        role,
        authMethod,
        password: authMethod === 'email-password' ? '[HIDDEN]' : null,
        isActive: true,
        activatedAt: new Date()
      }],
      emailVerified: true
    });

    let user;
    try {
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        oauthProvider: 'local', // Set default OAuth provider
        appRegistered: [{ 
          appIdentifier, 
          role,
          authMethod,
          password: authMethod === 'email-password' ? password : null,
          isActive: true,
          activatedAt: new Date()
        }],
        emailVerified: true // Skip email verification for testing
      });
      console.log('User created successfully:', user._id);
    } catch (createError) {
      console.error('User creation failed:', createError);
      throw createError;
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokenPair(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          oauthProvider: user.oauthProvider,
          role: role,
          appEndpoint: appEndpoint,
          appIdentifier: appIdentifier,
          authMethod: authMethod
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      keyValue: error.keyValue,
      errors: error.errors
    });
    
    // Handle specific Mongoose errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`
      });
    }
    
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
    const { email, password, appEndpoint } = req.body;

    // Validate appEndpoint
    if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid app endpoint. Must be a valid app URL.'
      });
    }

    // Get app identifier
    const appIdentifier = getAppIdentifier(appEndpoint);

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user has access to the requested app
    if (!user.hasAccessToApp(appIdentifier)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to access this app.'
      });
    }

    // Check if user has active access to the requested app
    if (!user.hasActiveAccessToApp(appIdentifier)) {
      return res.status(403).json({
        success: false,
        error: 'Access to this application has been deactivated.'
      });
    }

    // Validate authentication method for this app
    const authValidation = user.validateAuthMethodForApp(appIdentifier, 'email-password');
    if (!authValidation.success) {
      return res.status(403).json({
        success: false,
        error: authValidation.error
      });
    }

    // Check if global account is locked
    if (user.isGlobalAccountLocked()) {
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if app-specific account is locked
    if (user.isAppAccountLocked(appIdentifier)) {
      return res.status(401).json({
        success: false,
        error: 'App access is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Verify password for specific app
    const isPasswordValid = await user.comparePasswordForApp(appIdentifier, password);
    if (!isPasswordValid) {
      // Increment app-specific login attempts
      await user.incrementAppLoginAttempts(appIdentifier);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    await user.resetAppLoginAttempts(appIdentifier);

    // Get role for the specific app
    const role = user.getRoleForApp(appIdentifier);
    const authMethod = user.getAuthMethodForApp(appIdentifier);

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokenPair(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          oauthProvider: user.oauthProvider,
          role: role,
          appEndpoint: appEndpoint,
          appIdentifier: appIdentifier,
          authMethod: authMethod
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke the specific refresh token
      await revokeRefreshToken(refreshToken);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const refreshTokenDoc = await RefreshToken.findOne({
      token: refreshToken,
      expiresAt: { $gt: new Date() }
    });

    if (!refreshTokenDoc) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // Check if user still exists and is active
    const user = await User.findById(refreshTokenDoc.userId);
    if (!user || !user.isActive) {
      await revokeRefreshToken(refreshToken);
      return res.status(401).json({
        success: false,
        error: 'User not found or account deactivated'
      });
    }

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(user._id);

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate password reset token
    const passwordResetToken = generatePasswordResetToken();
    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send password reset email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'passwordReset',
        data: {
          name: user.name,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${passwordResetToken}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset request failed'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.passwordChangedAt = new Date();
    await user.save();

    // Revoke all refresh tokens
    await revokeAllRefreshTokens(user._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed'
    });
  }
};

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email verification failed'
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
export const resendVerification = async (req, res) => {
  try {
    const user = req.user;

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    // Generate new verification token
    const emailVerificationToken = generateEmailVerificationToken();
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email',
        template: 'emailVerification',
        data: {
          name: user.name,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email'
    });
  }
};
