import express from 'express';
import { googleLogin, googleCallback, getGoogleAuthUrl } from '../controllers/oauthController.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);
router.get('/google/url', getGoogleAuthUrl);

export default router;
