import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth profile:', profile);
    
    // Extract app endpoint from state parameter
    const appEndpoint = profile.state || null;
    
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // User exists, check if they have access to the requested app
      if (appEndpoint) {
        const { getAppIdentifier, isValidAppEndpoint } = await import('./appMapping.js');
        
        if (isValidAppEndpoint(appEndpoint)) {
          const appIdentifier = getAppIdentifier(appEndpoint);
          
          if (!user.hasAccessToApp(appIdentifier)) {
            // Add app registration
            let role = 'user';
            if (appIdentifier === 'sera-food-business-app') {
              role = 'business-user';
            }
            await user.addAppRegistration(appIdentifier, role, 'google-oauth');
          }
        }
      }
      return done(null, user);
    }
    
    // Check if user exists with same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      await user.save();
      
      // Add app registration if needed
      if (appEndpoint) {
        const { getAppIdentifier, isValidAppEndpoint } = await import('./appMapping.js');
        
        if (isValidAppEndpoint(appEndpoint)) {
          const appIdentifier = getAppIdentifier(appEndpoint);
          
          if (!user.hasAccessToApp(appIdentifier)) {
            let role = 'user';
            if (appIdentifier === 'sera-food-business-app') {
              role = 'business-user';
            }
            await user.addAppRegistration(appIdentifier, role, 'google-oauth');
          }
        }
      }
      
      return done(null, user);
    }
    
    // Create new user
    const newUser = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      username: profile.displayName,
      appRegistered: []
    });
    
    // Add app registration if appEndpoint provided
    if (appEndpoint) {
      const { getAppIdentifier, isValidAppEndpoint } = await import('./appMapping.js');
      
      if (isValidAppEndpoint(appEndpoint)) {
        const appIdentifier = getAppIdentifier(appEndpoint);
        let role = 'user';
        if (appIdentifier === 'sera-food-business-app') {
          role = 'business-user';
        }
        newUser.appRegistered.push({
          appIdentifier,
          role,
          authMethod: 'google-oauth',
          isActive: true
        });
      }
    }
    
    await newUser.save();
    return done(null, newUser);
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
