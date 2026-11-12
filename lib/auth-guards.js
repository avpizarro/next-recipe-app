import './server-only';
import { isAdmin } from './admin';
import { getSession } from './auth-session';
import { safeReturnTo } from './auth-redirect';

export function withAdminPage(loadProps = async () => ({ props: {} })) {
  return async (context) => {
    context.res.setHeader('Cache-Control', 'private, no-store');
    const session = await getSession(context.req, context.res);
    if (!session) {
      return { redirect: { destination: `/admin/sign-in?returnTo=${encodeURIComponent(safeReturnTo(context.resolvedUrl))}`, permanent: false } };
    }
    if (!isAdmin(session.user.email)) {
      return { redirect: { destination: '/admin/sign-in?error=admin_access_denied', permanent: false } };
    }
    return loadProps(context, session);
  };
}

export function withAdminApi(handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const session = await getSession(req, res);
    if (!session) return res.status(401).json({ error: 'Authentication required.' });
    if (!isAdmin(session.user.email)) return res.status(403).json({ error: 'Admin access required.' });
    // Cookie authentication alone does not protect mutations against CSRF.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!req.headers.origin || req.headers.origin !== new URL(process.env.BETTER_AUTH_URL).origin) {
        return res.status(403).json({ error: 'Invalid request origin.' });
      }
    }
    return handler(req, res, session);
  };
}
