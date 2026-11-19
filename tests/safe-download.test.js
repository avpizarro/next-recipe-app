import { EventEmitter } from 'node:events';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { beforeEach, expect, it, vi } from 'vitest';
import { download, isPublicAddress, validateSourceUrl } from '../lib/safe-download';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
beforeEach(() => { lookup.mockReset().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]); });

it.each(['127.0.0.1', '10.1.2.3', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', 'fc00::1', '::ffff:127.0.0.1', '224.0.0.1'])('blocks non-public address %s', (address) => {
  expect(isPublicAddress(address)).toBe(false);
});
it.each(['file:///etc/passwd', 'https://user:password@example.com', 'http://example.com:8080'])('rejects unsafe URL %s', (url) => {
  expect(() => validateSourceUrl(url)).toThrow();
});
it('accepts public IPv4 and IPv6 addresses', () => {
  expect(isPublicAddress('8.8.8.8')).toBe(true);
  expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
});
it('blocks private DNS answers before connecting', async () => {
  lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
  const connect = vi.spyOn(https, 'get');
  await expect(download('https://example.com')).rejects.toThrow('public internet');
  expect(connect).not.toHaveBeenCalled();
});

function mockResponse({ statusCode = 200, headers = { 'content-type': 'text/html' }, body = '<html>Recipe</html>' } = {}) {
  return vi.spyOn(https, 'get').mockImplementation((_url, options, callback) => {
    const res = new EventEmitter();
    Object.assign(res, { statusCode, headers, destroy: vi.fn((error) => { if (error) res.emit('error', error); }) });
    const req = new EventEmitter();
    queueMicrotask(() => {
      callback(res);
      res.emit('data', Buffer.from(body));
      res.emit('end');
    });
    return req;
  });
}
it('pins the validated DNS address and downloads bounded HTML', async () => {
  const connect = mockResponse();
  expect((await download('https://example.com')).body.toString()).toContain('Recipe');
  const callback = vi.fn();
  connect.mock.calls[0][1].lookup('example.com', { all: true }, callback);
  expect(callback).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);
});
it('revalidates redirect targets before opening another connection', async () => {
  const connect = mockResponse({ statusCode: 302, headers: { location: 'https://127.0.0.1/secret' } });
  await expect(download('https://example.com')).rejects.toThrow('public internet');
  expect(connect).toHaveBeenCalledOnce();
});
it('rejects oversized HTML and non-image responses', async () => {
  const connect = mockResponse({ body: 'x'.repeat(2 * 1024 * 1024 + 1) });
  await expect(download('https://example.com')).rejects.toThrow('too large');
  connect.mockRestore();
  mockResponse();
  await expect(download('https://example.com/image', 'image')).rejects.toThrow('usable image');
});
