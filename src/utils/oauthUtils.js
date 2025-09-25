// Common logic for OAuth authentication across all providers

import passport from 'passport';
import {
    OAUTH_PROVIDERS,
    OAUTH_ERRORS,
    OAUTH_SUCCESS,
    isOAuthConfigured,
    getOAuthConfig,
    buildAuthUrl,
    buildSuccessRedirectUrl,
    buildErrorRedirectUrl
} from '../config/oauthConstants.js';
import {
    sendErrorResponse,
    sendSuccessResponse,
    logRequest,
    logError
} from './responseHelpers.js';

// ============================================================================
// OAUTH VALIDATION
// ============================================================================

export const validateOAuthProvider = (provider) => {
    if (!OAUTH_PROVIDERS[provider]) {
        return {
            isValid: false,
            error: `Unsupported OAuth provider: ${provider}`
        };
    }
    return { isValid: true };
};

export const validateOAuthConfiguration = (provider) => {
    if (!isOAuthConfigured(provider)) {
        return {
            isValid: false,
            error: `${OAUTH_PROVIDERS[provider].name} OAuth is not configured`
        };
    }
    return { isValid: true };
};

export const validateAppEndpoint = (appEndpoint) => {
    if (!appEndpoint) {
        return {
            isValid: false,
            error: OAUTH_ERRORS.MISSING_APP_ENDPOINT
        };
    }
    return { isValid: true };
};

// ============================================================================
// OAUTH AUTHENTICATION
// ============================================================================

export const initiateOAuthLogin = (provider, req, res, next) => {
    const config = getOAuthConfig(provider);
    const { appEndpoint } = req.query;

    logRequest(req, `${config.name} OAuth login`);

    // Store appEndpoint in state for callback
    const state = appEndpoint || '';

    passport.authenticate(config.strategy, {
        scope: config.scope,
        state: state
    })(req, res, next);
};

export const processOAuthCallback = (provider, req, res, next) => {
    const config = getOAuthConfig(provider);

    passport.authenticate(config.strategy, (err, user, info) => {
        if (err) {
            logError(`${config.name} OAuth callback`, err);
            return res.redirect(buildErrorRedirectUrl(OAUTH_ERRORS.AUTH_FAILED));
        }

        if (!user) {
            logError(`${config.name} OAuth callback`, new Error(OAUTH_ERRORS.NO_USER));
            return res.redirect(buildErrorRedirectUrl(OAUTH_ERRORS.AUTH_FAILED));
        }

        console.log(`${config.name} OAuth successful for user:`, user.email);

        // Get app endpoint from state
        const appEndpoint = req.query.state || '';

        // Redirect to frontend with success
        const redirectUrl = buildSuccessRedirectUrl(appEndpoint, user.email, provider);
        res.redirect(redirectUrl);

    })(req, res, next);
};

// ============================================================================
// OAUTH URL GENERATION
// ============================================================================

export const generateOAuthUrl = (provider, appEndpoint) => {
    const config = getOAuthConfig(provider);

    if (!isOAuthConfigured(provider)) {
        return {
            success: false,
            error: `${config.name} OAuth is not configured`
        };
    }

    const authUrl = buildAuthUrl(provider, appEndpoint);

    if (!authUrl) {
        return {
            success: false,
            error: OAUTH_ERRORS.URL_GENERATION_FAILED
        };
    }

    return {
        success: true,
        authUrl
    };
};

// ============================================================================
// OAUTH CONTROLLER HELPERS
// ============================================================================

export const handleOAuthLogin = (provider) => {
    return (req, res, next) => {
        // Validate provider
        const providerValidation = validateOAuthProvider(provider);
        if (!providerValidation.isValid) {
            return sendErrorResponse(res, providerValidation.error, 400);
        }

        // Validate configuration
        const configValidation = validateOAuthConfiguration(provider);
        if (!configValidation.isValid) {
            return sendErrorResponse(res, configValidation.error, 503);
        }

        // Initiate OAuth login
        return initiateOAuthLogin(provider, req, res, next);
    };
};

export const handleOAuthCallback = (provider) => {
    return (req, res, next) => {
        // Validate provider
        const providerValidation = validateOAuthProvider(provider);
        if (!providerValidation.isValid) {
            return res.redirect(buildErrorRedirectUrl(providerValidation.error));
        }

        // Validate configuration
        const configValidation = validateOAuthConfiguration(provider);
        if (!configValidation.isValid) {
            return res.redirect(buildErrorRedirectUrl(configValidation.error));
        }

        // Handle OAuth callback
        return processOAuthCallback(provider, req, res, next);
    };
};

export const handleGetOAuthUrl = (provider) => {
    return (req, res) => {
        try {
            // Validate provider
            const providerValidation = validateOAuthProvider(provider);
            if (!providerValidation.isValid) {
                return sendErrorResponse(res, providerValidation.error, 400);
            }

            // Validate configuration
            const configValidation = validateOAuthConfiguration(provider);
            if (!configValidation.isValid) {
                return sendErrorResponse(res, configValidation.error, 503);
            }

            const { appEndpoint } = req.query;

            // Validate app endpoint
            const endpointValidation = validateAppEndpoint(appEndpoint);
            if (!endpointValidation.isValid) {
                return sendErrorResponse(res, endpointValidation.error, 400);
            }

            // Generate OAuth URL
            const result = generateOAuthUrl(provider, appEndpoint);

            if (result.success) {
                return sendSuccessResponse(res, { authUrl: result.authUrl });
            } else {
                return sendErrorResponse(res, result.error, 500);
            }

        } catch (error) {
            logError(`Get ${OAUTH_PROVIDERS[provider].name} auth URL`, error);
            return sendErrorResponse(res, OAUTH_ERRORS.URL_GENERATION_FAILED, 500);
        }
    };
};