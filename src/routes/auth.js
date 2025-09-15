import express from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification
} from '../controllers/authController.js';

import {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateRefreshToken
} from '../middleware/validation.js';

import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register); // Removed validation for testing
router.post('/login', validateLogin, login);
router.post('/refresh', validateRefreshToken, refreshToken);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/verify-email', validateEmailVerification, verifyEmail);
router.post('/resend-verification', protect, resendVerification);

// Protected routes
router.post('/logout', protect, logout);

export default router;
