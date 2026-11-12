import { generateKeyPairSync, sign } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuth, validateAdminIdentity } from '../lib/auth';
import { getSession } from '../lib/auth-session';

const origin = 'http://localhost:3000';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

function cookieHeader(response) {
  return response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
}

// Only Google's network boundary is simulated. Better Auth runs its real OAuth
// state checks, admission hook, cookie encryption, session lookup, and sign-out.
async function googleLogin(email = 'owner@example.com', verified = true) {
  const auth = getAuth();
  const start = await auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ provider: 'google', callbackURL: '/review', errorCallbackURL: '/admin/sign-in' }),
  }));
  expect(start.status).toBe(200);
  const authorizationURL = new URL((await start.json()).url);
  const state = authorizationURL.searchParams.get('state');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: 'https://accounts.google.com', aud: 'test-client', sub: 'google-test-user',
    email, email_verified: verified, name: 'Test Admin', iat: now, exp: now + 3600,
    nonce: authorizationURL.searchParams.get('nonce') || undefined,
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const token = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url')}`;
  vi.stubGlobal('fetch', vi.fn(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url === 'https://oauth2.googleapis.com/token') {
      return Response.json({ access_token: 'test-access-token', token_type: 'Bearer', expires_in: 3600, id_token: token });
    }
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') {
      return Response.json({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' }] });
    }
    throw new Error(`Unexpected network request in auth test: ${url}`);
  }));
  return auth.handler(new Request(`${origin}/api/auth/callback/google?code=test-code&state=${encodeURIComponent(state)}`, {
    headers: { cookie: cookieHeader(start) },
  }));
}

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_URL', origin);
  vi.stubEnv('BETTER_AUTH_SECRET', 'local-test-secret-9cf5d82b6a0e4f71b823');
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
  vi.stubEnv('ADMIN_EMAILS', 'owner@example.com');
});

describe('Google admission and stateless sessions', () => {
  it('signs in an allowlisted Google admin and exposes their session to server callers', async () => {
    const callback = await googleLogin();
    expect(callback.status).toBe(302);
    expect(new URL(callback.headers.get('location'), origin).href).toBe(`${origin}/review`);
    const cookie = cookieHeader(callback);
    expect(cookie).not.toContain('owner@example.com');
    const session = await getSession({ headers: { cookie } });
    expect(session.user.email).toBe('owner@example.com');
    expect(session.user.emailVerified).toBe(true);
    const reloaded = await getAuth().handler(new Request(`${origin}/api/auth/get-session`, { headers: { cookie } }));
    expect((await reloaded.json()).user.email).toBe('owner@example.com');
    const signedOut = await getAuth().handler(new Request(`${origin}/api/auth/sign-out`, {
      method: 'POST', headers: { cookie, origin },
    }));
    expect(signedOut.status).toBe(200);
    expect(signedOut.headers.getSetCookie().some((value) => value.includes('session_data=;') && value.includes('Max-Age=0'))).toBe(true);
    expect(await getSession({ headers: {} })).toBeNull();
  });
  it.each([
    ['outsider@example.com', true],
    ['owner@example.com', false],
  ])('does not issue a usable session for %s (verified: %s)', async (email, verified) => {
    const callback = await googleLogin(email, verified);
    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toContain('error=admin_access_denied');
    expect(await getSession({ headers: { cookie: cookieHeader(callback) } })).toBeNull();
  });
  it('rejects OAuth sign-in when the allowlist is empty', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    const callback = await googleLogin();
    expect(callback.headers.get('location')).toContain('error=admin_access_denied');
    expect(await getSession({ headers: { cookie: cookieHeader(callback) } })).toBeNull();
  });
  it('rejects malformed and expired session cookies', async () => {
    expect(await getSession({ headers: { cookie: 'better-auth.session_data=tampered; better-auth.session_token=forged' } })).toBeNull();
    const callback = await googleLogin();
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);
      expect(await getSession({ headers: { cookie: cookieHeader(callback) } })).toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it('refreshes cookies through the server helper without discarding existing cookies', async () => {
    const callback = await googleLogin();
    const cookie = cookieHeader(callback);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(Date.now() + 6 * 24 * 60 * 60 * 1000);
      const res = { getHeader: () => ['existing=value'], setHeader: vi.fn() };
      const session = await getSession({ headers: { cookie } }, res);
      expect(session.user.email).toBe('owner@example.com');
      const cookies = res.setHeader.mock.calls.find(([name]) => name === 'Set-Cookie')[1];
      expect(cookies).toContain('existing=value');
      expect(cookies.some((value) => value.startsWith('better-auth.session_data='))).toBe(true);
    } finally { vi.useRealTimers(); }
  });
  it('rejects a callback without OAuth state and blocks direct ID-token sign-in', async () => {
    const auth = getAuth();
    const callback = await auth.handler(new Request(`${origin}/api/auth/callback/google?code=forged&state=forged`));
    expect(callback.headers.get('location')).toContain('error=');
    expect(await getSession({ headers: { cookie: cookieHeader(callback) } })).toBeNull();
    const direct = await auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
      method: 'POST', headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'google', idToken: { token: 'forged' } }),
    }));
    expect(direct.status).toBeGreaterThanOrEqual(400);
    expect(await getSession({ headers: { cookie: cookieHeader(direct) } })).toBeNull();
  });
  it('denies identities from other methods or without a verified provider claim', () => {
    expect(validateAdminIdentity({ user: { email: 'owner@example.com', emailVerified: true }, source: { method: 'email-password' } })).toHaveProperty('error');
    expect(validateAdminIdentity({ user: { email: 'owner@example.com', emailVerified: true }, source: { method: 'oauth', oauth: { providerId: 'google', profile: {} } } })).toHaveProperty('error');
  });
});
