import { getDb } from '../config/db.js';

export async function recordAuditLog(params) {
  try {
    const db = getDb();
    const ipAddress = params.req
      ? (params.req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || params.req.ip || null
      : null;

    await db.execute(
      `INSERT INTO audit_logs (administrator_id, actor_email, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.administratorId ?? null,
        params.actorEmail ?? null,
        params.action,
        params.entityType,
        params.entityId !== undefined && params.entityId !== null ? String(params.entityId) : null,
        params.details ?? null,
        ipAddress,
      ]
    );
  } catch (err) {
    console.error('[AuditLog] Failed to write audit entry:', err);
  }
}
