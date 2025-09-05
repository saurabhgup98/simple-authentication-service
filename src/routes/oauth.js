import express from 'express';
import {
  googleAuth,
  googleCallback,
  facebookAuth,
  facebookCallback,
  githubAuth,
  githubCallback
} from '../controllers/oauthController.js';

const router = express.Router();

// OAuth not configured handler
const oauthNotConfigured = (req, res) => {
  res.status(400).json({
    success: false,
    error: 'OAuth not configured',
    message: 'This OAuth provider is not configured on the server'
  });
};

// Google OAuth routes (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', googleAuth);
  router.get('/google/callback', googleCallback);
} else {
  router.get('/google', oauthNotConfigured);
  router.get('/google/callback', oauthNotConfigured);
}

// Facebook OAuth routes (only if configured)
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  router.get('/facebook', facebookAuth);
  router.get('/facebook/callback', facebookCallback);
} else {
  router.get('/facebook', oauthNotConfigured);
  router.get('/facebook/callback', oauthNotConfigured);
}

// GitHub OAuth routes (only if configured)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  router.get('/github', githubAuth);
  router.get('/github/callback', githubCallback);
} else {
  router.get('/github', oauthNotConfigured);
  router.get('/github/callback', oauthNotConfigured);
}

export default router;
