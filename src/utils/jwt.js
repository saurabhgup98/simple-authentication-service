import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';

// Generate access token
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

// Generate refresh token
export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Generate token pair (access + refresh)
export const generateTokenPair = async (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken();

  // Store refresh token in database
  await RefreshToken.create({
    userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  return {
    accessToken,
    refreshToken
  };
};

// Verify access token
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

// Verify refresh token
export const verifyRefreshToken = async (token) => {
  const refreshTokenDoc = await RefreshToken.findOne({
    token,
    expiresAt: { $gt: new Date() }
  });

  if (!refreshTokenDoc) {
    throw new Error('Invalid or expired refresh token');
  }

  return refreshTokenDoc;
};

// Revoke refresh token
export const revokeRefreshToken = async (token) => {
  await RefreshToken.deleteOne({ token });
};

// Revoke all refresh tokens for a user
export const revokeAllRefreshTokens = async (userId) => {
  await RefreshToken.deleteMany({ userId });
};

// Generate email verification token
export const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate password reset token
export const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Check if token was issued before password change
export const isTokenIssuedBeforePasswordChange = (decoded, passwordChangedAt) => {
  if (!passwordChangedAt) {
    return false;
  }

  const changedTimestamp = parseInt(passwordChangedAt.getTime() / 1000, 10);
  return decoded.iat < changedTimestamp;
};
