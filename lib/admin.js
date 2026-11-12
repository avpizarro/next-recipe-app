import './server-only';

/** Read on every check so authorization never depends on a stale session role. */
export function isAdmin(email) {
  if (typeof email !== 'string' || !email.trim()) return false;
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
