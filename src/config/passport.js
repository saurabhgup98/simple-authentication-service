import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/oauth/google/callback`,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
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

    return done(null, user);
  } catch (error) {
    console.error('Google Strategy error:', error);
    return done(error, null);
  }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/oauth/facebook/callback`,
  profileFields: ['id', 'displayName', 'photos', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
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

    return done(null, user);
  } catch (error) {
    console.error('Facebook Strategy error:', error);
    return done(error, null);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/oauth/github/callback`,
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
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

    return done(null, user);
  } catch (error) {
    console.error('GitHub Strategy error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
