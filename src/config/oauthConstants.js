// Centralized configuration for all OAuth providers

// ============================================================================
// OAUTH PROVIDER CONFIGURATION
// ============================================================================

export const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    strategy: 'google',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    callbackUrlEnv: 'GOOGLE_CALLBACK_URL',
    defaultCallbackUrl: '/api/auth/google/callback',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: ['profile', 'email'],
    responseType: 'code'
  },
  facebook: {
    name: 'Facebook',
    strategy: 'facebook',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
    callbackUrlEnv: 'FACEBOOK_CALLBACK_URL',
    defaultCallbackUrl: '/api/auth/facebook/callback',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scope: ['email', 'public_profile'],
    responseType: 'code'
  },
  github: {
    name: 'GitHub',
    strategy: 'github',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
    callbackUrlEnv: 'GITHUB_CALLBACK_URL',
    defaultCallbackUrl: '/api/auth/github/callback',
    authUrl: 'https://github.com/login/oauth/authorize',
    scope: ['user:email'],
    responseType: 'code'
  }
};

// ============================================================================
// OAUTH SCOPES
// ============================================================================

export const OAUTH_SCOPES = {
  google: 'profile email',
  facebook: 'email public_profile',
  github: 'user:email'
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const OAUTH_ERRORS = {
  NOT_CONFIGURED: 'OAuth is not configured',
  AUTH_FAILED: 'Authentication failed',
  NO_USER: 'No user returned from OAuth',
  MISSING_APP_ENDPOINT: 'appEndpoint is required',
  URL_GENERATION_FAILED: 'Failed to generate auth URL'
};

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const OAUTH_SUCCESS = {
  AUTH_SUCCESSFUL: 'OAuth authentication successful'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const isOAuthConfigured = (provider) => {
  const config = OAUTH_PROVIDERS[provider];
  if (!config) return false;

  return !!(process.env[config.clientIdEnv] && process.env[config.clientSecretEnv]);
};

export const getOAuthConfig = (provider) => {
  return OAUTH_PROVIDERS[provider] || null;
};

export const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};

export const buildAuthUrl = (provider, appEndpoint) => {
  const config = getOAuthConfig(provider);
  if (!config) return null;

  const clientId = process.env[config.clientIdEnv];
  const callbackUrl = process.env[config.callbackUrlEnv] || config.defaultCallbackUrl;
  const scope = config.scope.join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: scope,
    response_type: config.responseType,
    state: appEndpoint || ''
  });

  return `${config.authUrl}?${params.toString()}`;
};

export const buildSuccessRedirectUrl = (appEndpoint, userEmail, method) => {
  const baseUrl = appEndpoint || getFrontendUrl();
  const params = new URLSearchParams({
    email: userEmail,
    method: method
  });

  return `${baseUrl}/auth/success?${params.toString()}`;
};

export const buildErrorRedirectUrl = (message) => {
  const baseUrl = getFrontendUrl();
  const params = new URLSearchParams({
    message: message
  });

  return `${baseUrl}/auth/error?${params.toString()}`;
};
