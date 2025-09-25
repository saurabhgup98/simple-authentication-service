// OAuth Controller
// Handles OAuth authentication for Google, Facebook, and GitHub

import {
    handleOAuthLogin,
    handleOAuthCallback,
    handleGetOAuthUrl
} from '../utils/oauthUtils.js';

// ============================================================================
// GOOGLE OAUTH
// ============================================================================

export const googleLogin = handleOAuthLogin('google');
export const googleCallback = handleOAuthCallback('google');
export const getGoogleAuthUrl = handleGetOAuthUrl('google');

// ============================================================================
// FACEBOOK OAUTH
// ============================================================================

export const facebookLogin = handleOAuthLogin('facebook');
export const facebookCallback = handleOAuthCallback('facebook');
export const getFacebookAuthUrl = handleGetOAuthUrl('facebook');

// ============================================================================
// GITHUB OAUTH
// ============================================================================

export const githubLogin = handleOAuthLogin('github');
export const githubCallback = handleOAuthCallback('github');
export const getGitHubAuthUrl = handleGetOAuthUrl('github');
