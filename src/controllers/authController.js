import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { generateTokenPair, revokeRefreshToken, revokeAllRefreshTokens } from '../utils/jwt.js';
import { generateEmailVerificationToken, generatePasswordResetToken } from '../utils/jwt.js';
import { sendEmail } from '../utils/email.js';

// @desc    Register user (Simplified for testing)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

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

    if (!password || password.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Password is required and cannot be empty'
      });
    }

    // Set default values for testing
    const appName = 'https://food-delivery-app-frontend.vercel.app';
    const role = 'user';

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // If user exists, add new app registration
      if (!existingUser.hasAccessToApp(appName)) {
        await existingUser.addAppRegistration(appName, role);
        
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
      } else {
        return res.status(400).json({
          success: false,
          error: 'User already has access to this app'
        });
      }
    }

    // Create new user (simplified - no email verification)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      appRegistered: [{ name: appName, role }],
      isEmailVerified: true // Skip email verification for testing
    });

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
          emailVerified: user.emailVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
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
    const validApps = [
      'https://food-delivery-app-frontend.vercel.app',
      'https://food-delivery-business-app-sera.vercel.app'
    ];

    if (!appEndpoint || !validApps.includes(appEndpoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid app endpoint. Must be a valid app URL.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user has access to the requested app
    if (!user.hasAccessToApp(appEndpoint)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to access this app.'
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Get role for the specific app
    const role = user.getRoleForApp(appEndpoint);

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
          appEndpoint: appEndpoint
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
