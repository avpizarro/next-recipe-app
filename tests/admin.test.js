import { describe, expect, it, vi } from 'vitest';
import { isAdmin } from '../lib/admin';
import { safeReturnTo } from '../lib/auth-redirect';

describe('admin allowlist', () => {
  it('matches whole normalized addresses and reads changes immediately', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Owner@Example.com, second@example.com, ,');
    expect(isAdmin(' owner@example.COM ')).toBe(true);
    expect(isAdmin('second@example.com')).toBe(true);
    for (const value of ['example.com', 'owner', 'owner@example.com.evil', '', null, undefined]) {
      expect(isAdmin(value)).toBe(false);
    }
    vi.stubEnv('ADMIN_EMAILS', 'second@example.com');
    expect(isAdmin('owner@example.com')).toBe(false);
  });
  it.each([undefined, '', ' ,  , '])('denies everyone for missing/empty configuration (%s)', (value) => {
    vi.stubEnv('ADMIN_EMAILS', value);
    expect(isAdmin('owner@example.com')).toBe(false);
  });
});

describe('return destinations', () => {
  it('preserves local paths and query strings', () => {
    expect(safeReturnTo('/review?status=pending#recipe')).toBe('/review?status=pending#recipe');
  });
  it.each([undefined, ['/review'], 'https://evil.example', '//evil.example', '/\\evil.example', '/%2fevil.example', '/%5cevil.example', '/%0a/evil.example', '/bad%', '/api/auth/sign-out', '/admin/sign-in', '/../admin/sign-in', '/foo/..//evil.example'])('rejects unsafe or looping destinations: %s', (value) => {
    expect(safeReturnTo(value)).toBe('/');
  });
});
