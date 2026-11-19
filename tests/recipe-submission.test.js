import { beforeEach, expect, it, vi } from 'vitest';
import handler from '../pages/api/admin/recipes';
import { getSession } from '../lib/auth-session';
import { importRecipe } from '../lib/import-recipe';
import { ImportError } from '../lib/import-error';

vi.mock('../lib/auth-session', () => ({ getSession: vi.fn() }));
vi.mock('../lib/import-recipe', () => ({ importRecipe: vi.fn() }));
const response = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() });
const request = () => ({ method: 'POST', headers: { origin: 'http://localhost:3000' }, body: { url: 'https://example.com/recipe', submittedBy: 'spoofed' } });
beforeEach(() => {
  vi.stubEnv('ADMIN_EMAILS', 'owner@example.com');
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');
  getSession.mockReset().mockResolvedValue({ user: { id: 'admin', email: 'owner@example.com' } });
  importRecipe.mockReset().mockResolvedValue({ id: 'recipe', status: 'pending' });
});
it.each([[null, 401], [{ user: { email: 'outsider@example.com' } }, 403]])('blocks unauthorized imports before any extraction or writes', async (session, status) => {
  getSession.mockResolvedValue(session);
  const res = response();
  await handler(request(), res);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(importRecipe).not.toHaveBeenCalled();
});
it('uses the authenticated submitter and returns a pending result', async () => {
  const res = response();
  await handler(request(), res);
  expect(importRecipe).toHaveBeenCalledWith('https://example.com/recipe', { id: 'admin', email: 'owner@example.com' });
  expect(res.status).toHaveBeenCalledWith(201);
});
it.each([{ method: 'GET' }, { body: { url: 'file:///etc/passwd' } }, { headers: { origin: 'https://evil.example' } }])('rejects invalid requests before import', async (override) => {
  const res = response();
  await handler({ ...request(), ...override }, res);
  expect(importRecipe).not.toHaveBeenCalled();
  expect(res.status.mock.calls[0][0]).toBeGreaterThanOrEqual(400);
});
it('returns actionable extraction errors without leaking internal errors', async () => {
  const res = response();
  importRecipe.mockRejectedValueOnce(new ImportError('No complete Recipe JSON-LD was found.'));
  await handler(request(), res);
  expect(res.status).toHaveBeenCalledWith(422);
  importRecipe.mockRejectedValueOnce(new Error('secret token'));
  await handler(request(), res);
  expect(res.json).toHaveBeenLastCalledWith({ error: 'Could not save the recipe. Please try again or check the server configuration.' });
});
