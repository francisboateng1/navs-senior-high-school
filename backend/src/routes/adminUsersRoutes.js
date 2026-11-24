import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { requireAdminAuth, requirePermission } from '../middleware/auth.js';
import { recordAuditLog } from '../services/auditService.js';

const router = Router();
router.use(requireAdminAuth);
router.use(requirePermission('users:manage'));

router.get('/', async (_req, res) => {
  try {
    const db = getDb();
    const [admins, roles, assignments] = await Promise.all([
      db.query('SELECT id, full_name, email, is_active, last_login_at, created_at FROM administrators ORDER BY id ASC'),
      db.query('SELECT * FROM roles ORDER BY id ASC'),
      db.query(
        `SELECT ara.administrator_id, ara.role_id, r.slug, r.name
         FROM administrator_role_assignments ara
         INNER JOIN roles r ON r.id = ara.role_id`
      ),
    ]);

    const enrichedAdmins = admins.map((a) => ({
      ...a,
      roles: assignments.filter((asg) => asg.administrator_id === a.id),
    }));

    res.json({ administrators: enrichedAdmins, roles });
  } catch (err) {
    console.error('[AdminUsersList]', err);
    res.status(500).json({ error: 'Unable to load administrators.' });
  }
});

const createAdminSchema = z.object({
  fullName: z.string().trim().min(2).max(140),
  email: z.string().trim().email().max(180),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  roleSlug: z.enum(['super_admin', 'admissions_officer', 'content_editor']),
});

router.post('/', async (req, res) => {
  try {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid administrator input.' });
      return;
    }

    const db = getDb();
    const emailLower = parsed.data.email.toLowerCase();
    const existing = await db.queryOne('SELECT id FROM administrators WHERE LOWER(email) = ?', [emailLower]);
    if (existing) {
      res.status(409).json({ error: 'An administrator account with that email already exists.' });
      return;
    }

    const role = await db.queryOne('SELECT id FROM roles WHERE slug = ?', [parsed.data.roleSlug]);
    if (!role) {
      res.status(400).json({ error: 'Selected role does not exist.' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const createdId = await db.transaction(async (tx) => {
      const resInsert = await tx.execute(
        'INSERT INTO administrators (full_name, email, password_hash, is_active) VALUES (?, ?, ?, 1)',
        [parsed.data.fullName, emailLower, passwordHash]
      );
      await tx.execute('INSERT INTO administrator_role_assignments (administrator_id, role_id) VALUES (?, ?)', [
        resInsert.insertId,
        role.id,
      ]);
      return resInsert.insertId;
    });

    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'CREATE_ADMINISTRATOR',
      entityType: 'administrator',
      entityId: createdId,
      details: `${emailLower} assigned role ${parsed.data.roleSlug}`,
      req,
    });

    res.status(201).json({ id: createdId, message: 'Administrator account created.' });
  } catch (err) {
    console.error('[AdminUsersCreate]', err);
    res.status(500).json({ error: 'Unable to create administrator.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const { is_active, roleSlug } = req.body || {};
    const db = getDb();

    if (targetId === req.adminUser?.id && is_active === false) {
      res.status(400).json({ error: 'You cannot deactivate your own active administrator account.' });
      return;
    }

    await db.transaction(async (tx) => {
      if (typeof is_active === 'boolean') {
        await tx.execute('UPDATE administrators SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, targetId]);
      }
      if (typeof roleSlug === 'string') {
        const role = await tx.queryOne('SELECT id FROM roles WHERE slug = ?', [roleSlug]);
        if (role) {
          await tx.execute('DELETE FROM administrator_role_assignments WHERE administrator_id = ?', [targetId]);
          await tx.execute('INSERT INTO administrator_role_assignments (administrator_id, role_id) VALUES (?, ?)', [
            targetId,
            role.id,
          ]);
        }
      }
    });

    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'UPDATE_ADMINISTRATOR',
      entityType: 'administrator',
      entityId: targetId,
      details: `active=${String(is_active)} role=${String(roleSlug)}`,
      req,
    });

    res.json({ message: 'Administrator updated.' });
  } catch (err) {
    console.error('[AdminUsersUpdate]', err);
    res.status(500).json({ error: 'Unable to update administrator.' });
  }
});

router.get('/audit-logs', async (_req, res) => {
  const db = getDb();
  const logs = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 150');
  res.json({ logs });
});

router.get('/notifications', async (_req, res) => {
  const db = getDb();
  const notifications = await db.query('SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT 100');
  res.json({ notifications });
});

export default router;
