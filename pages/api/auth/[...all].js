import { toNodeHandler } from 'better-auth/node';
import { getAuth } from '../../../lib/auth';

export const config = { api: { bodyParser: false } };

export default async function authHandler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  return toNodeHandler(getAuth().handler)(req, res);
}
