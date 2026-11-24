import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { env } from '../config/env.js';
import {
  COOKIE_NAME,
  clearAuthCookie,
  loadAdminWithPermissions,
  loginLimiter,
  requireAdminAuth,
  setAuthCookie,
  signAdminToken,
} from '../middleware/auth.js';
import { recordAuditLog } from '../services/auditService.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid administrator email.'),
  password: z.string().min(1, 'Password is required.'),
});

const bootstrapSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required.').max(140),
  email: z.string().trim().email('Enter a valid administrator email.').max(180),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

router.get('/status', async (req, res) => {
  try {
    const db = getDb();
    const countRow = await db.queryOne('SELECT COUNT(*) as total FROM administrators');
    const needsBootstrap = (countRow?.total ?? 0) === 0 && !env.adminBootstrapPassword;

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = bearerToken || req.cookies?.[COOKIE_NAME];

    if (token) {
      try {
        const decoded = jwt.verify(token, env.jwtSecret);
        const user = await loadAdminWithPermissions(decoded.id);
        if (user) {
          res.json({ needsBootstrap, authenticated: true, user });
          return;
        }
      } catch {
        // Ignore invalid/expired token on status probe
      }
    }

    res.json({ needsBootstrap, authenticated: false });
  } catch (err) {
    console.error('[AdminAuthStatus]', err);
    res.status(500).json({ error: 'Unable to check authentication status.' });
  }
});

router.post('/bootstrap', loginLimiter, async (req, res) => {
  try {
    if (env.adminBootstrapPassword) {
      res.status(403).json({ error: 'First-run setup is disabled because ADMIN_BOOTSTRAP_PASSWORD is configured.' });
      return;
    }

    const parsed = bootstrapSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid setup fields.' });
      return;
    }

    const db = getDb();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const createdId = await db.transaction(async (tx) => {
      const countRow = await tx.queryOne('SELECT COUNT(*) as total FROM administrators');
      if ((countRow?.total ?? 0) > 0) {
        return null;
      }

      const resInsert = await tx.execute(
        'INSERT INTO administrators (full_name, email, password_hash, is_active) VALUES (?, ?, ?, 1)',
        [parsed.data.fullName, parsed.data.email.toLowerCase(), passwordHash]
      );
      const superRole = await tx.queryOne('SELECT id FROM roles WHERE slug = ?', ['super_admin']);
      if (superRole) {
        await tx.execute('INSERT INTO administrator_role_assignments (administrator_id, role_id) VALUES (?, ?)', [
          resInsert.insertId,
          superRole.id,
        ]);
      }
      return resInsert.insertId;
    });

    if (!createdId) {
      res.status(409).json({ error: 'An administrator account already exists. Please sign in.' });
      return;
    }

    const adminUser = await loadAdminWithPermissions(createdId);
    if (!adminUser) {
      res.status(500).json({ error: 'Failed to load created administrator profile.' });
      return;
    }

    const token = signAdminToken(adminUser);
    setAuthCookie(req, res, token);

    await recordAuditLog({
      administratorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'FIRST_ADMIN_BOOTSTRAPPED',
      entityType: 'administrator',
      entityId: adminUser.id,
      details: 'First Super Administrator account claimed via initial setup.',
      req,
    });

    res.status(201).json({ user: adminUser, token });
  } catch (err) {
    console.error('[AdminBootstrap]', err);
    res.status(500).json({ error: 'Unable to complete administrator setup.' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials.' });
      return;
    }

    const db = getDb();
    const emailLower = parsed.data.email.toLowerCase();
    const admin = await db.queryOne(
      'SELECT id, email, full_name, password_hash, is_active FROM administrators WHERE LOWER(email) = ?',
      [emailLower]
    );

    if (!admin || !admin.is_active) {
      await recordAuditLog({
        actorEmail: emailLower,
        action: 'ADMIN_LOGIN_FAILED',
        entityType: 'administrator',
        details: 'Unknown or inactive administrator email',
        req,
      });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordValid = await bcrypt.compare(parsed.data.password, admin.password_hash);
    if (!passwordValid) {
      await recordAuditLog({
        administratorId: admin.id,
        actorEmail: admin.email,
        action: 'ADMIN_LOGIN_FAILED',
        entityType: 'administrator',
        entityId: admin.id,
        details: 'Incorrect password attempt',
        req,
      });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.execute('UPDATE administrators SET last_login_at = ? WHERE id = ?', [nowIso, admin.id]);

    const adminUser = await loadAdminWithPermissions(admin.id);
    if (!adminUser) {
      res.status(401).json({ error: 'Administrator account is inactive.' });
      return;
    }

    const token = signAdminToken(adminUser);
    setAuthCookie(req, res, token);

    await recordAuditLog({
      administratorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'ADMIN_LOGIN_SUCCESS',
      entityType: 'administrator',
      entityId: adminUser.id,
      req,
    });

    res.json({ user: adminUser, token });
  } catch (err) {
    console.error('[AdminLogin]', err);
    res.status(500).json({ error: 'Sign-in service error.' });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(req, res);
  res.json({ message: 'Signed out successfully.' });
});

router.get('/me', requireAdminAuth, (req, res) => {
  res.json({ user: req.adminUser });
});

export default router;
