import passport from 'passport';
import User from '../models/User.js';
import { generateTokenPair } from '../utils/jwt.js';
import { getAppIdentifier, isValidAppEndpoint } from '../config/appMapping.js';

// @desc    Google OAuth login
// @route   GET /api/oauth/google?appEndpoint=<app_url>
// @access  Public
export const googleAuth = (req, res, next) => {
  const { appEndpoint } = req.query;
  
  // Validate app endpoint
  if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid app endpoint. Must be a valid app URL.'
    });
  }
  
  // Store app endpoint in session for callback
  req.session.oauthAppEndpoint = appEndpoint;
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: appEndpoint // Pass app endpoint as state
  })(req, res, next);
};

// @desc    Google OAuth callback
// @route   GET /api/oauth/google/callback
// @access  Public
export const googleCallback = async (req, res) => {
  try {
    // Get app endpoint from state parameter or session
    const appEndpoint = req.query.state || req.session?.oauthAppEndpoint;
    
    if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
      return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=invalid_app_endpoint`);
    }

    const appIdentifier = getAppIdentifier(appEndpoint);
    const defaultRole = 'user'; // Default role for OAuth users

    passport.authenticate('google', { session: false }, async (err, profile) => {
      if (err) {
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=google_auth_failed`);
      }

      if (!profile) {
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=google_profile_not_found`);
      }

      try {
        // Find or create user
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if user exists with same email
          user = await User.findOne({ email: profile.emails[0].value });
          
          if (user) {
            // Check if user already has access to this app
            if (user.hasAccessToApp(appIdentifier)) {
              return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=account_already_exists_use_existing_auth`);
            }
            
            // Link Google account to existing user
            user.googleId = profile.id;
            user.oauthProvider = 'google';
            user.oauthData = {
              picture: profile.photos[0]?.value,
              oauthEmail: profile.emails[0].value,
              oauthName: profile.displayName,
              oauthVerified: profile.emails[0].verified
            };
            
            // Add app registration with Google OAuth auth method
            await user.addAppRegistration(appIdentifier, defaultRole, 'google-oauth');
            
            await user.save();
          } else {
            // Create new user with app registration
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
              },
              appRegistered: [{
                appIdentifier,
                role: defaultRole,
                authMethod: 'google-oauth',
                isActive: true,
                activatedAt: new Date()
              }]
            });
          }
        } else {
          // User exists, check if they have access to this app
          if (!user.hasAccessToApp(appIdentifier)) {
            return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=app_access_denied`);
          }
          
          // Validate authentication method for this app
          const authValidation = user.validateAuthMethodForApp(appIdentifier, 'google-oauth');
          if (!authValidation.success) {
            return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=google_oauth_not_allowed_for_app`);
          }
        }

        // Check if user has active access to the app
        if (!user.hasActiveAccessToApp(appIdentifier)) {
          return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=app_access_deactivated`);
        }

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokenPair(user._id);

        // Get user role for the specific app
        const role = user.getRoleForApp(appIdentifier);

        // Redirect to frontend with tokens and app info
        const redirectUrl = `${appEndpoint}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&provider=google&role=${role}&appIdentifier=${appIdentifier}`;
        res.redirect(redirectUrl);
      } catch (userError) {
        console.error('User creation/update error:', userError);
        res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=user_creation_failed`);
      }
    })(req, res);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=google_callback_failed`);
  }
};

// @desc    Facebook OAuth login
// @route   GET /api/oauth/facebook?appEndpoint=<app_url>
// @access  Public
export const facebookAuth = (req, res, next) => {
  const { appEndpoint } = req.query;
  
  // Validate app endpoint
  if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid app endpoint. Must be a valid app URL.'
    });
  }
  
  // Store app endpoint in session for callback
  req.session.oauthAppEndpoint = appEndpoint;
  
  passport.authenticate('facebook', {
    scope: ['email'],
    state: appEndpoint // Pass app endpoint as state
  })(req, res, next);
};

// @desc    Facebook OAuth callback
// @route   GET /api/oauth/facebook/callback
// @access  Public
export const facebookCallback = async (req, res) => {
  try {
    // Get app endpoint from state parameter or session
    const appEndpoint = req.query.state || req.session?.oauthAppEndpoint;
    
    if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
      return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=invalid_app_endpoint`);
    }

    const appIdentifier = getAppIdentifier(appEndpoint);
    const defaultRole = 'user'; // Default role for OAuth users

    passport.authenticate('facebook', { session: false }, async (err, profile) => {
      if (err) {
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=facebook_auth_failed`);
      }

      if (!profile) {
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=facebook_profile_not_found`);
      }

      try {
        // Find or create user
        let user = await User.findOne({ facebookId: profile.id });

        if (!user) {
          // Check if user exists with same email
          user = await User.findOne({ email: profile.emails[0].value });
          
          if (user) {
            // Check if user already has access to this app
            if (user.hasAccessToApp(appIdentifier)) {
              return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=account_already_exists_use_existing_auth`);
            }
            
            // Link Facebook account to existing user
            user.facebookId = profile.id;
            user.oauthProvider = 'facebook';
            user.oauthData = {
              picture: profile.photos[0]?.value,
              oauthEmail: profile.emails[0].value,
              oauthName: profile.displayName,
              oauthVerified: profile.emails[0].verified
            };
            
            // Add app registration with Facebook OAuth auth method
            await user.addAppRegistration(appIdentifier, defaultRole, 'facebook-oauth');
            
            await user.save();
          } else {
            // Create new user with app registration
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
              },
              appRegistered: [{
                appIdentifier,
                role: defaultRole,
                authMethod: 'facebook-oauth',
                isActive: true,
                activatedAt: new Date()
              }]
            });
          }
        } else {
          // User exists, check if they have access to this app
          if (!user.hasAccessToApp(appIdentifier)) {
            return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=app_access_denied`);
          }
          
          // Validate authentication method for this app
          const authValidation = user.validateAuthMethodForApp(appIdentifier, 'facebook-oauth');
          if (!authValidation.success) {
            return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=facebook_oauth_not_allowed_for_app`);
          }
        }

        // Check if user has active access to the app
        if (!user.hasActiveAccessToApp(appIdentifier)) {
          return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=app_access_deactivated`);
        }

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokenPair(user._id);

        // Get user role for the specific app
        const role = user.getRoleForApp(appIdentifier);

        // Redirect to frontend with tokens and app info
        const redirectUrl = `${appEndpoint}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&provider=facebook&role=${role}&appIdentifier=${appIdentifier}`;
        res.redirect(redirectUrl);
      } catch (userError) {
        console.error('User creation/update error:', userError);
        res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=user_creation_failed`);
      }
    })(req, res);
  } catch (error) {
    console.error('Facebook callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=facebook_callback_failed`);
  }
};

// @desc    GitHub OAuth login
// @route   GET /api/oauth/github?appEndpoint=<app_url>
// @access  Public
export const githubAuth = (req, res, next) => {
  const { appEndpoint } = req.query;
  
  // Validate app endpoint
  if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid app endpoint. Must be a valid app URL.'
    });
  }
  
  // Store app endpoint in session for callback
  req.session.oauthAppEndpoint = appEndpoint;
  
  passport.authenticate('github', {
    scope: ['user:email'],
    state: appEndpoint // Pass app endpoint as state
  })(req, res, next);
};

// @desc    GitHub OAuth callback
// @route   GET /api/oauth/github/callback
// @access  Public
export const githubCallback = async (req, res) => {
  try {
    // Get app endpoint from state parameter or session
    const appEndpoint = req.query.state || req.session?.oauthAppEndpoint;
    
    if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
      return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=invalid_app_endpoint`);
    }

    const appIdentifier = getAppIdentifier(appEndpoint);
    const defaultRole = 'user'; // Default role for OAuth users

    passport.authenticate('github', { session: false }, async (err, profile) => {
      if (err) {
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=github_auth_failed`);
      }

      if (!profile) {
        return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=github_profile_not_found`);
      }

      try {
        // Find or create user
        let user = await User.findOne({ githubId: profile.id });

        if (!user) {
          // Check if user exists with same email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email });
          }
          
          if (user) {
            // Check if user already has access to this app
            if (user.hasAccessToApp(appIdentifier)) {
              return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=account_already_exists_use_existing_auth`);
            }
            
            // Link GitHub account to existing user
            user.githubId = profile.id;
            user.oauthProvider = 'github';
            user.oauthData = {
              picture: profile.photos[0]?.value,
              oauthEmail: email,
              oauthName: profile.displayName || profile.username,
              oauthVerified: profile.emails?.[0]?.verified || false
            };
            
            // Add app registration with GitHub OAuth auth method
            await user.addAppRegistration(appIdentifier, defaultRole, 'github-oauth');
            
            await user.save();
          } else {
            // Create new user with app registration
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
              },
              appRegistered: [{
                appIdentifier,
                role: defaultRole,
                authMethod: 'github-oauth',
                isActive: true,
                activatedAt: new Date()
              }]
            });
          }
        } else {
          // User exists, check if they have access to this app
          if (!user.hasAccessToApp(appIdentifier)) {
            return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=app_access_denied`);
          }
          
          // Validate authentication method for this app
          const authValidation = user.validateAuthMethodForApp(appIdentifier, 'github-oauth');
          if (!authValidation.success) {
            return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=github_oauth_not_allowed_for_app`);
          }
        }

        // Check if user has active access to the app
        if (!user.hasActiveAccessToApp(appIdentifier)) {
          return res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=app_access_deactivated`);
        }

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokenPair(user._id);

        // Get user role for the specific app
        const role = user.getRoleForApp(appIdentifier);

        // Redirect to frontend with tokens and app info
        const redirectUrl = `${appEndpoint}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&provider=github&role=${role}&appIdentifier=${appIdentifier}`;
        res.redirect(redirectUrl);
      } catch (userError) {
        console.error('User creation/update error:', userError);
        res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=user_creation_failed`);
      }
    })(req, res);
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-error?error=github_callback_failed`);
  }
};
