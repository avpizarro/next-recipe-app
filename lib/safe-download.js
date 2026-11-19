import './server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import { ImportError } from './import-error';

export function validateSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 4096) throw new ImportError('Enter a valid URL of at most 4096 characters.', 400);
  let url;
  try { url = new URL(value); } catch { throw new ImportError('Enter a valid recipe URL.', 400); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port))) {
    throw new ImportError('Use an HTTP or HTTPS URL without credentials or custom ports.', 400);
  }
  return url;
}

export function isPublicAddress(address) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}

async function publicAddress(url) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new ImportError('The URL must point to a public internet address.', 400);
  }
  return addresses[0];
}

// Pin the validated DNS result to the connection to prevent DNS rebinding.
function request(url, address, { signal, maxBytes, kind }) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.get(url, {
      signal, agent: false,
      lookup: (_hostname, options, callback) => options.all
        ? callback(null, [address]) : callback(null, address.address, address.family),
      headers: { 'User-Agent': 'RecipeImporter/1.0', 'Accept-Encoding': 'identity' },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.destroy();
        return resolve({ redirect: res.headers.location });
      }
      const contentType = (res.headers['content-type'] || '').split(';')[0].toLowerCase();
      const validType = kind === 'image'
        ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(contentType)
        : ['text/html', 'application/xhtml+xml'].includes(contentType);
      if (res.statusCode < 200 || res.statusCode >= 300 || !validType) {
        res.destroy();
        return reject(new ImportError(`The source did not return a usable ${kind}.`));
      }
      let size = 0;
      const chunks = [];
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > maxBytes) res.destroy(new ImportError(`The ${kind} is too large to import.`));
        else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve({ body: Buffer.concat(chunks), contentType, url: url.href }));
    });
    req.on('error', reject);
  });
}

export async function download(source, kind = 'html') {
  const signal = AbortSignal.timeout(15000);
  try {
    let url = validateSourceUrl(source);
    for (let redirects = 0; redirects <= 3; redirects++) {
      // DNS resolution is included in the overall deadline.
      const address = await Promise.race([
        publicAddress(url),
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Download timed out')), { once: true });
          if (signal.aborted) reject(new Error('Download timed out'));
        }),
      ]);
      const result = await request(url, address, { signal, kind, maxBytes: kind === 'image' ? 8 * 1024 * 1024 : 2 * 1024 * 1024 });
      if (result.body) return result;
      if (!result.redirect) throw new ImportError('The source returned an invalid redirect.');
      url = validateSourceUrl(new URL(result.redirect, url).href);
    }
    throw new ImportError('The source redirected too many times.');
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError(`Could not download the ${kind}. Check the URL and try again.`, 502);
  }
}
