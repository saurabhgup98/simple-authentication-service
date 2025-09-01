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

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Facebook OAuth routes
router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookCallback);

// GitHub OAuth routes
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

export default router;
