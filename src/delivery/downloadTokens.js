/**
 * LexForge™ signed, expiring download tokens.
 * Token = base64url(JSON{f,exp}) "." base64url(HMAC-SHA256). `f` is a path relative to the
 * delivered directory. Raw file paths are never exposed (spec §9).
 */

import crypto from 'crypto';
import path from 'path';
import { config } from '../config/index.js';

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function sig(payloadB64) {
  return crypto.createHmac('sha256', config.download.secret).update(payloadB64).digest('base64url');
}

export function issueToken(relFile, ttlSeconds = config.download.ttlSeconds, now = Date.now()) {
  if (!config.download.secret) throw new Error('DOWNLOAD_SIGNING_SECRET is not configured');
  const payload = b64(JSON.stringify({ f: relFile, exp: Math.floor(now / 1000) + ttlSeconds }));
  return `${payload}.${sig(payload)}`;
}

/** Returns the relative file path, or throws Error with .code = 'BAD_TOKEN' | 'EXPIRED'. */
export function verifyToken(token, now = Date.now()) {
  const fail = (code) => Object.assign(new Error(code), { code });
  if (typeof token !== 'string' || token.length > 1024) throw fail('BAD_TOKEN');
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra !== undefined) throw fail('BAD_TOKEN');
  const expected = Buffer.from(sig(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) throw fail('BAD_TOKEN');
  let body;
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw fail('BAD_TOKEN');
  }
  if (typeof body.f !== 'string' || !Number.isFinite(body.exp)) throw fail('BAD_TOKEN');
  if (body.exp * 1000 < now) throw fail('EXPIRED');
  const norm = path.posix.normalize(body.f);
  if (norm.startsWith('..') || path.posix.isAbsolute(norm) || norm.includes('\0')) throw fail('BAD_TOKEN');
  return norm;
}
