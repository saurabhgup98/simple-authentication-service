import express from 'express';
import { 
  googleLogin, googleCallback, getGoogleAuthUrl,
  facebookLogin, facebookCallback, getFacebookAuthUrl,
  githubLogin, githubCallback, getGitHubAuthUrl
} from '../controllers/oauthController.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);
router.get('/google/url', getGoogleAuthUrl);

// Facebook OAuth routes
router.get('/facebook', facebookLogin);
router.get('/facebook/callback', facebookCallback);
router.get('/facebook/url', getFacebookAuthUrl);

// GitHub OAuth routes
router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.get('/github/url', getGitHubAuthUrl);

export default router;
