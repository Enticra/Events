// Minimal admin auth: one shared admin password, stateless HMAC-signed tokens.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SECRET = process.env.AUTH_SECRET || randomBytes(32).toString('hex');
const TTL_MS = 1000 * 60 * 60 * 12;

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[auth] ADMIN_PASSWORD not set — using the default "admin123". Set it before deploying.');
}

const sign = (payload) => createHmac('sha256', SECRET).update(payload).digest('base64url');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function login(password) {
  if (!safeEqual(password || '', ADMIN_PASSWORD)) return null;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verify(token) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return data.exp > Date.now() ? data : null;
}

export const isAdmin = (req) => !!verify((req.headers.authorization || '').replace(/^Bearer /, ''));

export function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'Admin login required.' });
}
