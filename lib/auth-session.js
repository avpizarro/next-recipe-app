import './server-only';
import { fromNodeHeaders } from 'better-auth/node';
import { getAuth } from './auth';

export async function getSession(req, res) {
  if (!req.headers.cookie) return null;
  const { response: session, headers } = await getAuth().api.getSession({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });
  // Stateless refresh may issue cookies. Forward each cookie separately.
  const cookies = headers.getSetCookie();
  if (cookies.length && res) {
    const existing = res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : existing ? [existing] : []), ...cookies]);
  }
  if (!session || !session.user?.email || !session.user.emailVerified) return null;
  const expiresAt = new Date(session.session?.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  return session;
}
