import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { getDb } from '../config/db.js';

export const COOKIE_NAME = 'navs_admin_token';

export function signAdminToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function setAuthCookie(req, res, token) {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    env.appUrl.startsWith('https://');

  if (isHttps) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
  } else {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
  }
}

export function clearAuthCookie(req, res) {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    env.appUrl.startsWith('https://');

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  });
}

export async function loadAdminWithPermissions(adminId) {
  const db = getDb();
  const admin = await db.queryOne(
    'SELECT id, email, full_name, is_active FROM administrators WHERE id = ?',
    [adminId]
  );
  if (!admin || !admin.is_active) return null;

  const roles = await db.query(
    `SELECT r.slug FROM roles r
     INNER JOIN administrator_role_assignments ara ON ara.role_id = r.id
     WHERE ara.administrator_id = ?`,
    [admin.id]
  );

  const perms = await db.query(
    `SELECT DISTINCT p.code FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     INNER JOIN administrator_role_assignments ara ON ara.role_id = rp.role_id
     WHERE ara.administrator_id = ?`,
    [admin.id]
  );

  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.full_name,
    roles: roles.map((r) => r.slug),
    permissions: perms.map((p) => p.code),
  };
}

export async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }

    if (!bearerToken && cookieToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.headers.origin;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const hasCustomHeader = req.headers['x-requested-with'] === 'XMLHttpRequest';
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host && !hasCustomHeader) {
            res.status(403).json({ error: 'CSRF validation failed for cross-origin request.' });
            return;
          }
        } catch {
          res.status(403).json({ error: 'Invalid request origin.' });
          return;
        }
      } else if (!hasCustomHeader) {
        res.status(403).json({ error: 'Missing required X-Requested-With header.' });
        return;
      }
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const freshUser = await loadAdminWithPermissions(decoded.id);
    if (!freshUser) {
      res.status(401).json({ error: 'Administrator session is invalid or inactive.' });
      return;
    }

    req.adminUser = freshUser;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}

export function requirePermission(...required) {
  return (req, res, next) => {
    const user = req.adminUser;
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (user.roles.includes('super_admin')) {
      next();
      return;
    }
    const hasAll = required.every((perm) => user.permissions.includes(perm));
    if (!hasAll) {
      res.status(403).json({ error: 'Insufficient role permissions for this action.' });
      return;
    }
    next();
  };
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
});

export const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this client. Please try again later.' },
});
