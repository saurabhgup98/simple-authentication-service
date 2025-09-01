import passport from 'passport';
import User from '../models/User.js';
import { generateTokenPair } from '../utils/jwt.js';

// @desc    Google OAuth login
// @route   GET /api/oauth/google
// @access  Public
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

// @desc    Google OAuth callback
// @route   GET /api/oauth/google/callback
// @access  Public
export const googleCallback = async (req, res) => {
  try {
    passport.authenticate('google', { session: false }, async (err, profile) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Google authentication failed'
        });
      }

      if (!profile) {
        return res.status(400).json({
          success: false,
          error: 'Google profile not found'
        });
      }

      // Find or create user
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.oauthProvider = 'google';
          user.oauthData = {
            picture: profile.photos[0]?.value,
            oauthEmail: profile.emails[0].value,
            oauthName: profile.displayName,
            oauthVerified: profile.emails[0].verified
          };
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            oauthProvider: 'google',
            emailVerified: profile.emails[0].verified,
            oauthData: {
              picture: profile.photos[0]?.value,
              oauthEmail: profile.emails[0].value,
              oauthName: profile.displayName,
              oauthVerified: profile.emails[0].verified
            }
          });
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokenPair(user._id);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&provider=google`;
      res.redirect(redirectUrl);
    })(req, res);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=google_auth_failed`);
  }
};

// @desc    Facebook OAuth login
// @route   GET /api/oauth/facebook
// @access  Public
export const facebookAuth = passport.authenticate('facebook', {
  scope: ['email']
});

// @desc    Facebook OAuth callback
// @route   GET /api/oauth/facebook/callback
// @access  Public
export const facebookCallback = async (req, res) => {
  try {
    passport.authenticate('facebook', { session: false }, async (err, profile) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Facebook authentication failed'
        });
      }

      if (!profile) {
        return res.status(400).json({
          success: false,
          error: 'Facebook profile not found'
        });
      }

      // Find or create user
      let user = await User.findOne({ facebookId: profile.id });

      if (!user) {
        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link Facebook account to existing user
          user.facebookId = profile.id;
          user.oauthProvider = 'facebook';
          user.oauthData = {
            picture: profile.photos[0]?.value,
            oauthEmail: profile.emails[0].value,
            oauthName: profile.displayName,
            oauthVerified: profile.emails[0].verified
          };
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            facebookId: profile.id,
            oauthProvider: 'facebook',
            emailVerified: profile.emails[0].verified,
            oauthData: {
              picture: profile.photos[0]?.value,
              oauthEmail: profile.emails[0].value,
              oauthName: profile.displayName,
              oauthVerified: profile.emails[0].verified
            }
          });
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokenPair(user._id);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&provider=facebook`;
      res.redirect(redirectUrl);
    })(req, res);
  } catch (error) {
    console.error('Facebook callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=facebook_auth_failed`);
  }
};

// @desc    GitHub OAuth login
// @route   GET /api/oauth/github
// @access  Public
export const githubAuth = passport.authenticate('github', {
  scope: ['user:email']
});

// @desc    GitHub OAuth callback
// @route   GET /api/oauth/github/callback
// @access  Public
export const githubCallback = async (req, res) => {
  try {
    passport.authenticate('github', { session: false }, async (err, profile) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'GitHub authentication failed'
        });
      }

      if (!profile) {
        return res.status(400).json({
          success: false,
          error: 'GitHub profile not found'
        });
      }

      // Find or create user
      let user = await User.findOne({ githubId: profile.id });

      if (!user) {
        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });
        }
        
        if (user) {
          // Link GitHub account to existing user
          user.githubId = profile.id;
          user.oauthProvider = 'github';
          user.oauthData = {
            picture: profile.photos[0]?.value,
            oauthEmail: email,
            oauthName: profile.displayName || profile.username,
            oauthVerified: profile.emails?.[0]?.verified || false
          };
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            name: profile.displayName || profile.username,
            email: email || `${profile.username}@github.com`,
            githubId: profile.id,
            oauthProvider: 'github',
            emailVerified: profile.emails?.[0]?.verified || false,
            oauthData: {
              picture: profile.photos[0]?.value,
              oauthEmail: email,
              oauthName: profile.displayName || profile.username,
              oauthVerified: profile.emails?.[0]?.verified || false
            }
          });
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokenPair(user._id);

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&provider=github`;
      res.redirect(redirectUrl);
    })(req, res);
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=github_auth_failed`);
  }
};
