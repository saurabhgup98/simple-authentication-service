import passport from 'passport';

// Google OAuth login
export const googleLogin = (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      error: 'Google OAuth is not configured'
    });
  }
  
  const { appEndpoint } = req.query;
  
  console.log('Google OAuth login request:', { appEndpoint });
  
  // Store appEndpoint in state for callback
  const state = appEndpoint || '';
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state
  })(req, res, next);
};

// Google OAuth callback
export const googleCallback = (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent('Google OAuth is not configured')}`);
  }
  
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      console.error('Google OAuth callback error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent('Authentication failed')}`);
    }
    
    if (!user) {
      console.error('No user returned from Google OAuth');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?message=${encodeURIComponent('Authentication failed')}`);
    }
    
    console.log('Google OAuth successful for user:', user.email);
    
    // Get app endpoint from state
    const appEndpoint = req.query.state || '';
    
    // Redirect to frontend with success
    const redirectUrl = appEndpoint 
      ? `${appEndpoint}/auth/success?email=${encodeURIComponent(user.email)}&method=google`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?email=${encodeURIComponent(user.email)}&method=google`;
    
    res.redirect(redirectUrl);
    
  })(req, res, next);
};

// Get Google OAuth URL
export const getGoogleAuthUrl = (req, res) => {
  try {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({
        success: false,
        error: 'Google OAuth is not configured'
      });
    }
    
    const { appEndpoint } = req.query;
    
    if (!appEndpoint) {
      return res.status(400).json({
        success: false,
        error: 'appEndpoint is required'
      });
    }
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback')}&` +
      `scope=profile email&` +
      `response_type=code&` +
      `state=${encodeURIComponent(appEndpoint)}`;
    
    res.json({
      success: true,
      authUrl
    });
    
  } catch (error) {
    console.error('Get Google auth URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL'
    });
  }
};
