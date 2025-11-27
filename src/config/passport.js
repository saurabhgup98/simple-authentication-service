import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import {
    handleGoogleOAuth,
    handleFacebookOAuth,
    handleGitHubOAuth
} from './oauthHandlers.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OAUTH_CONFIG = {
    google: {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
    },
    facebook: {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || "/api/auth/facebook/callback"
    },
    github: {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || "/api/auth/github/callback"
    }
};

const isOAuthConfigured = (provider) => {
    return OAUTH_CONFIG[provider].clientID && OAUTH_CONFIG[provider].clientSecret;
};

// ============================================================================
// COMMON STRATEGY CONFIGURATION
// ============================================================================

const configureOAuthStrategy = (provider, StrategyClass, handler) => {
    if (isOAuthConfigured(provider)) {
        passport.use(new StrategyClass(OAUTH_CONFIG[provider], handler));
        console.log(`${provider} OAuth strategy configured`);
    } else {
        console.log(`${provider} OAuth not configured - missing environment variables`);
    }
};

// ============================================================================
// PROVIDER-SPECIFIC CONFIGURATIONS (Simplified)
// ============================================================================

const configureGoogleStrategy = () => {
    configureOAuthStrategy('google', GoogleStrategy, handleGoogleOAuth);
};

const configureFacebookStrategy = () => {
    configureOAuthStrategy('facebook', FacebookStrategy, handleFacebookOAuth);
};

const configureGitHubStrategy = () => {
    configureOAuthStrategy('github', GitHubStrategy, handleGitHubOAuth);
};

const configureSerialization = () => {
    // Serialize user for session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            // Ensure database connection before querying
            const { ensureConnection } = await import('./database.js');
            await ensureConnection();
            
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};

// ============================================================================
// INITIALIZATION
// ============================================================================

const initializePassport = () => {
    configureGoogleStrategy();
    configureFacebookStrategy();
    configureGitHubStrategy();
    configureSerialization();
};

// Initialize Passport
initializePassport();

// ============================================================================
// EXPORTS
// ============================================================================

export default passport;
export { isOAuthConfigured, OAUTH_CONFIG };