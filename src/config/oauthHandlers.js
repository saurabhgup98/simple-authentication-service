import User from '../models/User.js';
import { getAppIdentifier, isValidAppEndpoint } from './appMapping.js';
import { ensureConnection } from './database.js';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getDefaultRole = (appIdentifier) => {
    return appIdentifier === 'sera-food-business-app' ? 'business-user' : 'user';
};

const addAppRegistrationIfNeeded = async (user, appEndpoint, authMethod) => {
    if (!appEndpoint || !isValidAppEndpoint(appEndpoint)) {
        return;
    }

    const appIdentifier = getAppIdentifier(appEndpoint);

    if (!user.hasAccessToApp(appIdentifier)) {
        const role = getDefaultRole(appIdentifier);
        await user.addAppRegistration(appIdentifier, [role], authMethod);
    }
};

// ============================================================================
// COMMON OAUTH HANDLER
// ============================================================================

const handleOAuth = async (provider, accessToken, refreshToken, profile, done) => {
    try {
        // Ensure database connection before proceeding
        await ensureConnection();
        
        console.log(`${provider} OAuth profile:`, profile);

        const appEndpoint = profile.state || null;
        const providerIdField = `${provider}Id`; // 'googleId', 'facebookId', 'githubId'
        const authMethod = `${provider}-oauth`; // 'google-oauth', 'facebook-oauth', 'github-oauth'

        // 1. Check if user exists with provider ID
        let user = await User.findOne({ [providerIdField]: profile.id });

        if (user) {
            await addAppRegistrationIfNeeded(user, appEndpoint, authMethod);
            return done(null, user);
        }

        // 2. Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Link provider account to existing user
            user[providerIdField] = profile.id;
            await user.save();
            await addAppRegistrationIfNeeded(user, appEndpoint, authMethod);
            return done(null, user);
        }

        // 3. Create new user
        const newUser = new User({
            [providerIdField]: profile.id,
            email: profile.emails[0].value,
            username: profile.displayName || profile.username, // GitHub uses username if displayName not available
            appRegistered: []
        });

        // Add app registration if needed
        if (appEndpoint && isValidAppEndpoint(appEndpoint)) {
            const appIdentifier = getAppIdentifier(appEndpoint);
            const role = getDefaultRole(appIdentifier);

            newUser.appRegistered.push({
                appIdentifier,
                roles: [role],
                authMethod: authMethod,
                isActive: true
            });
        }

        await newUser.save();
        return done(null, newUser);

    } catch (error) {
        console.error(`${provider} OAuth error:`, error);
        return done(error, null);
    }
};

// ============================================================================
// PROVIDER-SPECIFIC HANDLERS (Simplified)
// ============================================================================

const handleGoogleOAuth = (accessToken, refreshToken, profile, done) => {
    return handleOAuth('google', accessToken, refreshToken, profile, done);
};

const handleFacebookOAuth = (accessToken, refreshToken, profile, done) => {
    return handleOAuth('facebook', accessToken, refreshToken, profile, done);
};

const handleGitHubOAuth = (accessToken, refreshToken, profile, done) => {
    return handleOAuth('github', accessToken, refreshToken, profile, done);
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    handleOAuth,
    handleGoogleOAuth,
    handleFacebookOAuth,
    handleGitHubOAuth,
    getDefaultRole,
    addAppRegistrationIfNeeded
};
