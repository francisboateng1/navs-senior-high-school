import fs from 'fs';
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { env, isSmtpConfigured } from '../config/env.js';
import { requireAdminAuth, requirePermission } from '../middleware/auth.js';
import { resolveSafeStoragePath } from '../middleware/upload.js';
import {
  ADMISSION_STATUSES,
  buildAdmissionsCsv,
  isValidAdmissionStatus,
  renderEmailTemplate,
} from '../utils/admissions.js';
import { sendOrQueueNotification } from '../services/emailService.js';
import { recordAuditLog } from '../services/auditService.js';

const router = Router();
router.use(requireAdminAuth);

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

router.get('/stats', async (req, res) => {
  try {
    const db = getDb();
    const statusCounts = await db.query('SELECT status, COUNT(*) as count FROM admission_applications GROUP BY status');
    const countMap = Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.count)]));
    const total = Object.values(countMap).reduce((sum, n) => sum + n, 0);

    const recentApplications = await db.query(
      `SELECT aa.id, aa.reference_number, aa.status, aa.submitted_at,
              ap.full_name as applicant_name, p.name as programme_name, ay.label as academic_year_label
       FROM admission_applications aa
       INNER JOIN applicants ap ON ap.id = aa.applicant_id
       INNER JOIN admission_programmes p ON p.id = aa.programme_id
       INNER JOIN academic_years ay ON ay.id = aa.academic_year_id
       ORDER BY aa.submitted_at DESC, aa.id DESC LIMIT 8`
    );

    const recentActivity = await db.query(
      'SELECT id, actor_email, action, entity_type, entity_id, details, created_at FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 10'
    );

    const enquiryCountRow = await db.queryOne(
      "SELECT COUNT(*) as total FROM contact_enquiries WHERE status = 'New'"
    );

    const canReadAdmissions =
      req.adminUser?.roles.includes('super_admin') || req.adminUser?.permissions.includes('admissions:read');

    res.json({
      stats: {
        total,
        submitted: countMap['Submitted'] || 0,
        underReview: countMap['Under Review'] || 0,
        additionalInfo: countMap['Additional Information Required'] || 0,
        shortlisted: countMap['Shortlisted'] || 0,
        accepted: countMap['Accepted'] || 0,
        waitlisted: countMap['Waitlisted'] || 0,
        rejected: countMap['Rejected'] || 0,
        withdrawn: countMap['Withdrawn'] || 0,
        newEnquiries: Number(enquiryCountRow?.total || 0),
      },
      recentApplications: canReadAdmissions ? recentApplications : [],
      recentActivity,
      smtpConfigured: isSmtpConfigured(),
    });
  } catch (err) {
    console.error('[AdminStats]', err);
    res.status(500).json({ error: 'Unable to load dashboard statistics.' });
  }
});

router.get('/', requirePermission('admissions:read'), async (req, res) => {
  try {
    const db = getDb();
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId.trim() : '';
    const programmeId = typeof req.query.programmeId === 'string' ? req.query.programmeId.trim() : '';

    let sql = `
      SELECT aa.id, aa.reference_number, aa.status, aa.boarding_preference, aa.admission_category,
             aa.submitted_at, aa.decision_date,
             ap.full_name as applicant_name, ap.date_of_birth, ap.gender, ap.nationality,
             ap.residential_location, ap.previous_school, ap.bece_index_number, ap.exam_year,
             g.full_name as guardian_name, g.relationship_to_applicant as guardian_relationship,
             g.telephone as guardian_telephone, g.email as guardian_email,
             p.id as programme_id, p.name as programme_name, p.code as programme_code,
             ay.id as academic_year_id, ay.label as academic_year_label
      FROM admission_applications aa
      INNER JOIN applicants ap ON ap.id = aa.applicant_id
      INNER JOIN guardians g ON g.id = aa.guardian_id
      INNER JOIN admission_programmes p ON p.id = aa.programme_id
      INNER JOIN academic_years ay ON ay.id = aa.academic_year_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (aa.reference_number LIKE ? OR ap.full_name LIKE ? OR g.email LIKE ? OR ap.bece_index_number LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (status && status !== 'All') {
      sql += ' AND aa.status = ?';
      params.push(status);
    }
    if (academicYearId && academicYearId !== 'All') {
      sql += ' AND aa.academic_year_id = ?';
      params.push(Number(academicYearId));
    }
    if (programmeId && programmeId !== 'All') {
      sql += ' AND aa.programme_id = ?';
      params.push(Number(programmeId));
    }

    sql += ' ORDER BY aa.submitted_at DESC, aa.id DESC LIMIT 250';

    const applications = await db.query(sql, params);
    res.json({ applications, statuses: ADMISSION_STATUSES });
  } catch (err) {
    console.error('[AdminAdmissionsList]', err);
    res.status(500).json({ error: 'Unable to load applications.' });
  }
});

router.get('/export/csv', requirePermission('admissions:export'), async (req, res) => {
  try {
    const db = getDb();
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId.trim() : '';

    let sql = `
      SELECT aa.reference_number, aa.status, aa.boarding_preference, aa.submitted_at, aa.decision_date,
             ap.full_name as applicant_name, ap.date_of_birth, ap.gender, ap.nationality,
             ap.residential_location, ap.previous_school, ap.bece_index_number, ap.exam_year,
             g.full_name as guardian_name, g.relationship_to_applicant as guardian_relationship,
             g.telephone as guardian_telephone, g.email as guardian_email,
             p.name as programme_name, ay.label as academic_year_label
      FROM admission_applications aa
      INNER JOIN applicants ap ON ap.id = aa.applicant_id
      INNER JOIN guardians g ON g.id = aa.guardian_id
      INNER JOIN admission_programmes p ON p.id = aa.programme_id
      INNER JOIN academic_years ay ON ay.id = aa.academic_year_id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'All') {
      sql += ' AND aa.status = ?';
      params.push(status);
    }
    if (academicYearId && academicYearId !== 'All') {
      sql += ' AND aa.academic_year_id = ?';
      params.push(Number(academicYearId));
    }
    sql += ' ORDER BY aa.submitted_at DESC';

    const rows = await db.query(sql, params);
    const csv = buildAdmissionsCsv(rows);

    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'EXPORT_APPLICATIONS_CSV',
      entityType: 'admission_application',
      details: `Exported ${rows.length} application rows`,
      req,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="navs-admissions-export-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error('[AdminExportCsv]', err);
    res.status(500).json({ error: 'Unable to export CSV.' });
  }
});

router.get('/documents/:docId', requirePermission('admissions:read'), async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.queryOne(
      'SELECT id, application_id, original_filename, stored_filename, mime_type FROM application_documents WHERE id = ?',
      [Number(req.params.docId)]
    );

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const safePath = resolveSafeStoragePath(env.uploadStorageDir, doc.stored_filename);
    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ error: 'Stored document file is unavailable.' });
      return;
    }

    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'VIEW_APPLICANT_DOCUMENT',
      entityType: 'application_document',
      entityId: doc.id,
      details: `Accessed document ${doc.original_filename} for application #${doc.application_id}`,
      req,
    });

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename.replace(/"/g, '')}"`);
    fs.createReadStream(safePath).pipe(res);
  } catch (err) {
    console.error('[AdminDocView]', err);
    res.status(500).json({ error: 'Unable to retrieve document.' });
  }
});

router.get('/:id', requirePermission('admissions:read'), async (req, res) => {
  try {
    const db = getDb();
    const appId = Number(req.params.id);
    const application = await db.queryOne(
      `SELECT aa.*, ap.full_name as applicant_name, ap.date_of_birth, ap.gender, ap.nationality,
              ap.residential_location, ap.applicant_email, ap.applicant_phone,
              ap.previous_school, ap.previous_exam_details, ap.bece_index_number, ap.exam_year,
              g.full_name as guardian_name, g.relationship_to_applicant as guardian_relationship,
              g.telephone as guardian_telephone, g.email as guardian_email, g.residential_address as guardian_address,
              p.name as programme_name, p.code as programme_code,
              p2.name as second_choice_programme_name,
              ay.label as academic_year_label
       FROM admission_applications aa
       INNER JOIN applicants ap ON ap.id = aa.applicant_id
       INNER JOIN guardians g ON g.id = aa.guardian_id
       INNER JOIN admission_programmes p ON p.id = aa.programme_id
       LEFT JOIN admission_programmes p2 ON p2.id = aa.second_choice_programme_id
       INNER JOIN academic_years ay ON ay.id = aa.academic_year_id
       WHERE aa.id = ?`,
      [appId]
    );

    if (!application) {
      res.status(404).json({ error: 'Application record not found.' });
      return;
    }

    const [documents, history, internalNotes] = await Promise.all([
      db.query(
        'SELECT id, document_type, original_filename, mime_type, file_size_bytes, uploaded_at FROM application_documents WHERE application_id = ?',
        [appId]
      ),
      db.query(
        `SELECT h.*, a.full_name as admin_name
         FROM admission_status_history h
         LEFT JOIN administrators a ON a.id = h.changed_by_admin_id
         WHERE h.application_id = ?
         ORDER BY h.changed_at DESC, h.id DESC`,
        [appId]
      ),
      db.query(
        `SELECT n.*, a.full_name as admin_name, a.email as admin_email
         FROM admission_internal_notes n
         INNER JOIN administrators a ON a.id = n.administrator_id
         WHERE n.application_id = ?
         ORDER BY n.created_at DESC, n.id DESC`,
        [appId]
      ),
    ]);

    res.json({ application, documents, history, internalNotes });
  } catch (err) {
    console.error('[AdminApplicationDetail]', err);
    res.status(500).json({ error: 'Unable to load application details.' });
  }
});

const statusUpdateSchema = z.object({
  status: z.string().refine(isValidAdmissionStatus, 'Invalid admission status.'),
  publicNote: z.string().trim().max(1000).optional().default(''),
  sendEmail: z.boolean().optional().default(true),
});

router.patch('/:id/status', requirePermission('admissions:decide'), async (req, res) => {
  try {
    const parsed = statusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid status payload.' });
      return;
    }

    const appId = Number(req.params.id);
    const db = getDb();
    const existing = await db.queryOne(
      `SELECT aa.id, aa.reference_number, aa.status,
              ap.full_name as applicant_name,
              g.full_name as guardian_name, g.email as guardian_email,
              p.name as programme_name
       FROM admission_applications aa
       INNER JOIN applicants ap ON ap.id = aa.applicant_id
       INNER JOIN guardians g ON g.id = aa.guardian_id
       INNER JOIN admission_programmes p ON p.id = aa.programme_id
       WHERE aa.id = ?`,
      [appId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    const { status: newStatus, publicNote, sendEmail } = parsed.data;
    const isDecision = ['Shortlisted', 'Accepted', 'Waitlisted', 'Rejected'].includes(newStatus);
    const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE admission_applications
         SET status = ?,
             applicant_public_note = ?,
             decision_date = CASE WHEN ? = 1 THEN ? ELSE decision_date END,
             decided_by_admin_id = CASE WHEN ? = 1 THEN ? ELSE decided_by_admin_id END,
             updated_at = ?
         WHERE id = ?`,
        [
          newStatus,
          publicNote || null,
          isDecision ? 1 : 0,
          nowIso,
          isDecision ? 1 : 0,
          req.adminUser?.id ?? null,
          nowIso,
          appId,
        ]
      );

      await tx.execute(
        `INSERT INTO admission_status_history (application_id, previous_status, new_status, public_note, changed_by_admin_id)
         VALUES (?, ?, ?, ?, ?)`,
        [appId, existing.status, newStatus, publicNote || null, req.adminUser?.id ?? null]
      );
    });

    let notificationResult = null;
    if (sendEmail) {
      const templateKey =
        newStatus === 'Additional Information Required'
          ? 'additional_info_required'
          : isDecision
          ? 'decision_made'
          : 'status_updated';

      const tpl = renderEmailTemplate(templateKey, {
        applicantName: existing.applicant_name,
        guardianName: existing.guardian_name,
        referenceNumber: existing.reference_number,
        programmeName: existing.programme_name,
        status: newStatus,
        note: publicNote,
      });

      notificationResult = await sendOrQueueNotification({
        applicationId: existing.id,
        recipientEmail: existing.guardian_email,
        templateKey,
        subject: tpl.subject,
        body: tpl.body,
      });
    }

    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'UPDATE_APPLICATION_STATUS',
      entityType: 'admission_application',
      entityId: existing.reference_number,
      details: `${existing.status} -> ${newStatus}`,
      req,
    });

    res.json({
      message: `Application ${existing.reference_number} updated to ${newStatus}.`,
      status: newStatus,
      notification: notificationResult,
    });
  } catch (err) {
    console.error('[AdminUpdateStatus]', err);
    res.status(500).json({ error: 'Unable to update application status.' });
  }
});

router.post('/:id/notes', requirePermission('admissions:decide'), async (req, res) => {
  try {
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (note.length < 2 || note.length > 2000) {
      res.status(400).json({ error: 'Internal note must be between 2 and 2000 characters.' });
      return;
    }

    const appId = Number(req.params.id);
    const db = getDb();
    const exists = await db.queryOne('SELECT reference_number FROM admission_applications WHERE id = ?', [appId]);
    if (!exists) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    await db.execute('INSERT INTO admission_internal_notes (application_id, administrator_id, note) VALUES (?, ?, ?)', [
      appId,
      req.adminUser.id,
      note,
    ]);

    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'ADD_INTERNAL_NOTE',
      entityType: 'admission_application',
      entityId: exists.reference_number,
      req,
    });

    res.status(201).json({ message: 'Internal note recorded.' });
  } catch (err) {
    console.error('[AdminAddNote]', err);
    res.status(500).json({ error: 'Unable to save internal note.' });
  }
});

router.get('/:id/letter', requirePermission('admissions:decide'), async (req, res) => {
  try {
    const appId = Number(req.params.id);
    const db = getDb();
    const app = await db.queryOne(
      `SELECT aa.id, aa.reference_number, aa.status, aa.boarding_preference,
              aa.applicant_public_note, aa.submitted_at, aa.decision_date,
              ap.full_name as applicant_name, g.full_name as guardian_name,
              p.name as programme_name, p.code as programme_code,
              ay.label as academic_year_label
       FROM admission_applications aa
       INNER JOIN applicants ap ON ap.id = aa.applicant_id
       INNER JOIN guardians g ON g.id = aa.guardian_id
       INNER JOIN admission_programmes p ON p.id = aa.programme_id
       INNER JOIN academic_years ay ON ay.id = aa.academic_year_id
       WHERE aa.id = ?`,
      [appId]
    );

    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (app.status !== 'Accepted') {
      res.status(403).json({ error: 'Admission letter can only be generated for Accepted applications.' });
      return;
    }

    const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.execute('UPDATE admission_applications SET letter_generated_at = ? WHERE id = ?', [nowIso, app.id]);

    const infoRows = await db.query('SELECT setting_key, setting_value FROM school_information');
    const info = Object.fromEntries(infoRows.map((r) => [r.setting_key, r.setting_value]));

    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'GENERATE_ADMISSION_LETTER',
      entityType: 'admission_application',
      entityId: app.reference_number,
      req,
    });

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Provisional Admission Letter — ${escapeHtml(app.reference_number)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 780px; margin: 40px auto; padding: 36px; border: 1px solid #D1D5DB; color: #111827; line-height: 1.65; }
    .header { border-bottom: 3px solid #0C1E3C; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { color: #0C1E3C; margin: 0; font-size: 24px; }
    .meta { font-family: Arial, sans-serif; font-size: 12px; color: #4B5563; }
    .box { background: #F9FAFB; border: 1px solid #E5E7EB; padding: 16px; margin: 20px 0; font-family: Arial, sans-serif; font-size: 14px; }
    .sig { margin-top: 44px; border-top: 1px solid #9CA3AF; width: 260px; padding-top: 8px; font-size: 14px; }
    @media print { .no-print { display: none; } body { border: none; margin: 0; } }
    .no-print { background: #0C1E3C; color: #fff; border: 0; padding: 10px 16px; cursor: pointer; font-family: Arial, sans-serif; margin-bottom: 20px; }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save Admission Letter as PDF</button>
  <div class="header">
    <div>
      <h1>${escapeHtml(info.school_name || 'NAVS Senior High School')}</h1>
      <div class="meta">${escapeHtml(info.contact_address || '')}</div>
      <div class="meta">${escapeHtml(info.contact_email || '')} · ${escapeHtml(info.contact_phone_primary || '')}</div>
    </div>
    <div class="meta">
      <strong>Ref:</strong> ${escapeHtml(app.reference_number)}<br/>
      <strong>Decision Date:</strong> ${escapeHtml((app.decision_date || app.submitted_at).slice(0, 10))}
    </div>
  </div>
  <p>Dear <strong>${escapeHtml(app.guardian_name)}</strong>,</p>
  <h2 style="color:#0C1E3C; font-size: 18px;">OFFER OF PROVISIONAL ADMISSION — ${escapeHtml(app.academic_year_label)}</h2>
  <p>On behalf of the Admissions Committee and Management of <strong>${escapeHtml(info.school_name || 'NAVS Senior High School')}</strong>, we are pleased to offer <strong>${escapeHtml(app.applicant_name)}</strong> provisional admission to pursue senior secondary studies as detailed below:</p>
  <div class="box">
    <strong>Application Reference:</strong> ${escapeHtml(app.reference_number)}<br/>
    <strong>Applicant Name:</strong> ${escapeHtml(app.applicant_name)}<br/>
    <strong>Academic Programme:</strong> ${escapeHtml(app.programme_name)} (${escapeHtml(app.programme_code)})<br/>
    <strong>Academic Year:</strong> ${escapeHtml(app.academic_year_label)}<br/>
    <strong>Residency Preference:</strong> ${escapeHtml(app.boarding_preference)}
  </div>
  <p>This provisional offer is subject to verification of original academic records and completion of registration formalities with the School Registry prior to the commencement of classes.</p>
  ${app.applicant_public_note ? `<p><strong>Admissions Office Note:</strong> ${escapeHtml(app.applicant_public_note)}</p>` : ''}
  <div class="sig">
    <strong>${escapeHtml(info.headmaster_name || 'Head of School')}</strong><br/>
    <span class="meta">${escapeHtml(info.headmaster_title || 'Headmaster / Headmistress')}<br/>${escapeHtml(info.school_name || 'NAVS Senior High School')}</span>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[AdminGenerateLetter]', err);
    res.status(500).json({ error: 'Unable to generate admission letter.' });
  }
});

export default router;
