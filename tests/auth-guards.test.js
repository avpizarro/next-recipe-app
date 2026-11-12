import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withAdminApi, withAdminPage } from '../lib/auth-guards';
import { getSession } from '../lib/auth-session';

vi.mock('../lib/auth-session', () => ({ getSession: vi.fn() }));

function response() {
  return { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
}

beforeEach(() => {
  vi.stubEnv('ADMIN_EMAILS', 'owner@example.com');
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');
  getSession.mockReset();
});

describe('protected APIs', () => {
  it.each([[null, 401], [{ user: { email: 'outsider@example.com' } }, 403]])('stops unauthorized requests', async (session, status) => {
    getSession.mockResolvedValue(session);
    const handler = vi.fn();
    const res = response();
    await withAdminApi(handler)({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(handler).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });
  it('passes the validated session and denies access after allowlist removal', async () => {
    const session = { user: { email: 'owner@example.com' } };
    getSession.mockResolvedValue(session);
    const handler = vi.fn();
    const guarded = withAdminApi(handler);
    const req = { method: 'GET', headers: {} };
    const res = response();
    await guarded(req, res);
    expect(handler).toHaveBeenCalledWith(req, res, session);
    handler.mockClear();
    vi.stubEnv('ADMIN_EMAILS', '');
    await guarded(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it.each([undefined, 'https://evil.example', 'null'])('rejects mutations from an untrusted origin: %s', async (origin) => {
    getSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    const handler = vi.fn();
    const res = response();
    await withAdminApi(handler)({ method: 'POST', headers: { origin } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it('allows an authenticated same-origin mutation', async () => {
    getSession.mockResolvedValue({ user: { email: 'owner@example.com' } });
    const handler = vi.fn();
    await withAdminApi(handler)({ method: 'POST', headers: { origin: 'http://localhost:3000' } }, response());
    expect(handler).toHaveBeenCalledOnce();
  });
  it('does not run the handler if session verification fails unexpectedly', async () => {
    getSession.mockRejectedValue(new Error('Auth unavailable'));
    const handler = vi.fn();
    await expect(withAdminApi(handler)({ headers: {} }, response())).rejects.toThrow('Auth unavailable');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('protected pages', () => {
  it('redirects anonymous visitors without loading protected data', async () => {
    getSession.mockResolvedValue(null);
    const load = vi.fn();
    const result = await withAdminPage(load)({ req: {}, res: response(), resolvedUrl: '/review?status=pending' });
    expect(result.redirect.destination).toBe('/admin/sign-in?returnTo=%2Freview%3Fstatus%3Dpending');
    expect(load).not.toHaveBeenCalled();
  });
  it('redirects a removed admin to an access-denied message', async () => {
    getSession.mockResolvedValue({ user: { email: 'removed@example.com' } });
    const load = vi.fn();
    const result = await withAdminPage(load)({ req: {}, res: response() });
    expect(result.redirect.destination).toBe('/admin/sign-in?error=admin_access_denied');
    expect(load).not.toHaveBeenCalled();
  });
  it('makes the session available to the page loader', async () => {
    const session = { user: { email: 'owner@example.com' } };
    getSession.mockResolvedValue(session);
    const load = vi.fn(async (_context, value) => ({ props: { email: value.user.email } }));
    const context = { req: {}, res: response() };
    expect(await withAdminPage(load)(context)).toEqual({ props: { email: 'owner@example.com' } });
    expect(load).toHaveBeenCalledWith(context, session);
  });
});
