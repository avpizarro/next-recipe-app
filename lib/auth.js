import './server-only';
import { betterAuth } from 'better-auth';
import { isAdmin } from './admin';

// This gate runs before OAuth creates a session, including in stateless mode.
export function validateAdminIdentity({ user, source }) {
  if (
    source?.method !== 'oauth' ||
    source.oauth?.providerId !== 'google' ||
    source.oauth?.profile?.email_verified !== true ||
    user.emailVerified !== true ||
    !isAdmin(user.email)
  ) {
    return { error: 'admin_access_denied', errorDescription: 'This account cannot access recipe management.' };
  }
}

let auth;

/** Initialize on demand: public static pages do not need OAuth credentials. */
export function getAuth() {
  if (auth) return auth;
  const required = ['BETTER_AUTH_URL', 'BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  for (const name of required) {
    if (!process.env[name]?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  }
  if (process.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.');
  }
  const baseURL = new URL(process.env.BETTER_AUTH_URL).origin;
  if (process.env.NODE_ENV === 'production' && !baseURL.startsWith('https://')) {
    throw new Error('BETTER_AUTH_URL must use HTTPS in production.');
  }

  auth = betterAuth({
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [baseURL],
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Only the browser OAuth redirect flow is needed by this app.
        disableIdTokenSignIn: true,
      },
    },
    user: { validateUserInfo: validateAdminIdentity },
    account: { accountLinking: { enabled: false }, storeStateStrategy: 'cookie', storeAccountCookie: true },
    session: {
      cookieCache: { enabled: true, strategy: 'jwe', maxAge: 7 * 24 * 60 * 60, refreshCache: true },
    },
    onAPIError: { errorURL: '/admin/sign-in' },
  });
  return auth;
}
