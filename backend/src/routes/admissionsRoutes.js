import fs from 'fs';
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { publicFormLimiter } from '../middleware/auth.js';
import { uploadAdmissionDocs, verifyFileMagicBytes, computeSha256 } from '../middleware/upload.js';
import {
  generateApplicationReference,
  generateVerificationCode,
  hashVerificationCode,
  verifyVerificationCode,
  renderEmailTemplate,
} from '../utils/admissions.js';
import { sendOrQueueNotification } from '../services/emailService.js';
import { recordAuditLog } from '../services/auditService.js';

const router = Router();

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Applicant full name is required.').max(160),
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid date of birth (YYYY-MM-DD).'),
  gender: z.string().trim().max(30).optional().default(''),
  nationality: z.string().trim().min(2, 'Nationality is required.').max(80),
  residentialLocation: z.string().trim().min(2, 'Residential location is required.').max(220),
  applicantEmail: z.string().trim().email('Invalid applicant email format.').optional().or(z.literal('')),
  applicantPhone: z.string().trim().max(40).optional().default(''),

  guardianFullName: z.string().trim().min(2, 'Parent/Guardian full name is required.').max(160),
  guardianRelationship: z.string().trim().min(2, 'Relationship to applicant is required.').max(60),
  guardianTelephone: z.string().trim().min(7, 'Valid guardian telephone is required.').max(40),
  guardianEmail: z.string().trim().email('Valid guardian email address is required.').max(180),
  guardianAddress: z.string().trim().min(3, 'Guardian residential address is required.').max(220),

  previousSchool: z.string().trim().min(2, 'Previous school name is required.').max(180),
  previousExamDetails: z.string().trim().max(180).optional().default(''),
  beceIndexNumber: z.string().trim().max(60).optional().default(''),
  examYear: z.string().trim().max(10).optional().default(''),

  academicYearId: z.coerce.number().int().positive('Please select an academic year.'),
  programmeId: z.coerce.number().int().positive('Please select a preferred programme.'),
  secondChoiceProgrammeId: z.union([z.coerce.number().int().positive(), z.literal(''), z.null()]).optional(),
  admissionCategory: z.string().trim().min(2).max(60).default('Direct School Admission'),
  boardingPreference: z.enum(['Day', 'Boarding']).default('Day'),
  additionalNotes: z.string().trim().max(1500).optional().default(''),
  consentAccepted: z.union([z.literal('true'), z.literal('1'), z.literal(true)]).refine(
    (val) => val === 'true' || val === '1' || val === true,
    'Parent/Guardian data protection consent is required.'
  ),
});

const trackSchema = z.object({
  referenceNumber: z.string().trim().min(6, 'Enter a valid application reference number.').max(40),
  verificationDetail: z.string().trim().min(4, 'Enter your registered guardian email or verification code.').max(180),
});

function cleanupUploadedFiles(filesRecord) {
  if (!filesRecord) return;
  for (const list of Object.values(filesRecord)) {
    for (const file of list) {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {
        // Ignore cleanup failure
      }
    }
  }
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

router.post(
  '/apply',
  publicFormLimiter,
  uploadAdmissionDocs.fields([
    { name: 'passport_photo', maxCount: 1 },
    { name: 'academic_record', maxCount: 1 },
    { name: 'birth_certificate', maxCount: 1 },
    { name: 'supporting_document', maxCount: 1 },
  ]),
  async (req, res) => {
    const filesMap = req.files;
    try {
      const parsed = applicationSchema.safeParse(req.body);
      if (!parsed.success) {
        cleanupUploadedFiles(filesMap);
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Please check all required application fields.',
          issues: parsed.error.issues,
        });
        return;
      }

      const data = parsed.data;
      const db = getDb();

      const verifiedDocs = [];
      if (filesMap) {
        for (const [fieldName, fileArr] of Object.entries(filesMap)) {
          for (const file of fileArr) {
            if (!verifyFileMagicBytes(file.path, file.mimetype)) {
              cleanupUploadedFiles(filesMap);
              res.status(400).json({
                error: `Uploaded file "${file.originalname}" failed content signature verification. Upload a genuine PDF, JPG, or PNG file.`,
              });
              return;
            }
            verifiedDocs.push({
              docType: fieldName,
              file,
              sha256: computeSha256(file.path),
            });
          }
        }
      }

      const mandatoryReqs = await db.query(
        'SELECT document_key, title FROM admission_requirements WHERE is_active = 1 AND is_mandatory_document = 1 AND document_key IS NOT NULL'
      );
      for (const reqDoc of mandatoryReqs) {
        const hasDoc = verifiedDocs.some((d) => d.docType === reqDoc.document_key);
        if (!hasDoc) {
          cleanupUploadedFiles(filesMap);
          res.status(400).json({
            error: `Required document missing: ${reqDoc.title}.`,
          });
          return;
        }
      }

      const academicYear = await db.queryOne('SELECT id, label, admissions_open FROM academic_years WHERE id = ?', [
        data.academicYearId,
      ]);
      if (!academicYear || !academicYear.admissions_open) {
        cleanupUploadedFiles(filesMap);
        res.status(400).json({ error: 'Selected academic year is not currently open for applications.' });
        return;
      }

      const programme = await db.queryOne(
        'SELECT id, name, is_accepting_applications FROM admission_programmes WHERE id = ?',
        [data.programmeId]
      );
      if (!programme || !programme.is_accepting_applications) {
        cleanupUploadedFiles(filesMap);
        res.status(400).json({ error: 'Selected programme is not accepting applications.' });
        return;
      }

      const existingDup = await db.queryOne(
        `SELECT aa.reference_number
         FROM admission_applications aa
         INNER JOIN applicants ap ON ap.id = aa.applicant_id
         WHERE LOWER(ap.full_name) = LOWER(?) AND ap.date_of_birth = ? AND aa.academic_year_id = ? AND aa.status != 'Withdrawn'`,
        [data.fullName, data.dateOfBirth, data.academicYearId]
      );
      if (existingDup) {
        cleanupUploadedFiles(filesMap);
        res.status(409).json({
          error: `An active application for ${data.fullName} (${data.dateOfBirth}) already exists for this academic year under Reference ${existingDup.reference_number}.`,
        });
        return;
      }

      if (data.beceIndexNumber) {
        const beceDup = await db.queryOne(
          `SELECT aa.reference_number
           FROM admission_applications aa
           INNER JOIN applicants ap ON ap.id = aa.applicant_id
           WHERE ap.bece_index_number = ? AND aa.academic_year_id = ? AND aa.status != 'Withdrawn'`,
          [data.beceIndexNumber, data.academicYearId]
        );
        if (beceDup) {
          cleanupUploadedFiles(filesMap);
          res.status(409).json({
            error: `An application with BECE Index Number ${data.beceIndexNumber} already exists (${beceDup.reference_number}).`,
          });
          return;
        }
      }

      let referenceNumber = generateApplicationReference(academicYear.label);
      for (let attempt = 0; attempt < 5; attempt++) {
        const collision = await db.queryOne('SELECT id FROM admission_applications WHERE reference_number = ?', [
          referenceNumber,
        ]);
        if (!collision) break;
        referenceNumber = generateApplicationReference(academicYear.label);
      }

      const verificationCode = generateVerificationCode();
      const verificationCodeHash = hashVerificationCode(verificationCode);
      const secondChoiceId =
        typeof data.secondChoiceProgrammeId === 'number' && data.secondChoiceProgrammeId !== data.programmeId
          ? data.secondChoiceProgrammeId
          : null;

      const createdApp = await db.transaction(async (tx) => {
        const applicantRes = await tx.execute(
          `INSERT INTO applicants (full_name, date_of_birth, gender, nationality, residential_location, applicant_email, applicant_phone, previous_school, previous_exam_details, bece_index_number, exam_year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.fullName,
            data.dateOfBirth,
            data.gender || null,
            data.nationality,
            data.residentialLocation,
            data.applicantEmail || null,
            data.applicantPhone || null,
            data.previousSchool,
            data.previousExamDetails || null,
            data.beceIndexNumber || null,
            data.examYear || null,
          ]
        );

        const guardianRes = await tx.execute(
          `INSERT INTO guardians (full_name, relationship_to_applicant, telephone, email, residential_address)
           VALUES (?, ?, ?, ?, ?)`,
          [
            data.guardianFullName,
            data.guardianRelationship,
            data.guardianTelephone,
            data.guardianEmail.toLowerCase(),
            data.guardianAddress,
          ]
        );

        const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const appRes = await tx.execute(
          `INSERT INTO admission_applications (
            reference_number, verification_code_hash, applicant_id, guardian_id, academic_year_id,
            programme_id, second_choice_programme_id, admission_category, boarding_preference,
            additional_notes, consent_accepted, consent_timestamp, status, applicant_public_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'Submitted', ?)`,
          [
            referenceNumber,
            verificationCodeHash,
            applicantRes.insertId,
            guardianRes.insertId,
            data.academicYearId,
            data.programmeId,
            secondChoiceId,
            data.admissionCategory,
            data.boardingPreference,
            data.additionalNotes || null,
            nowIso,
            'Application received and queued for review by the Admissions Committee.',
          ]
        );

        for (const doc of verifiedDocs) {
          await tx.execute(
            `INSERT INTO application_documents (application_id, document_type, original_filename, stored_filename, mime_type, file_size_bytes, sha256_checksum)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              appRes.insertId,
              doc.docType,
              doc.file.originalname,
              doc.file.filename,
              doc.file.mimetype,
              doc.file.size,
              doc.sha256,
            ]
          );
        }

        await tx.execute(
          `INSERT INTO admission_status_history (application_id, previous_status, new_status, public_note)
           VALUES (?, NULL, 'Submitted', 'Online application submitted successfully.')`,
          [appRes.insertId]
        );

        return { id: appRes.insertId, submittedAt: nowIso };
      });

      const emailTpl = renderEmailTemplate('application_received', {
        applicantName: data.fullName,
        guardianName: data.guardianFullName,
        referenceNumber,
        programmeName: programme.name,
        status: 'Submitted',
        verificationCode,
      });

      const notifResult = await sendOrQueueNotification({
        applicationId: createdApp.id,
        recipientEmail: data.guardianEmail.toLowerCase(),
        templateKey: 'application_received',
        subject: emailTpl.subject,
        body: emailTpl.body,
      });

      await recordAuditLog({
        action: 'APPLICATION_SUBMITTED',
        entityType: 'admission_application',
        entityId: referenceNumber,
        details: `Submitted for ${data.fullName} (${programme.name})`,
        req,
      });

      res.status(201).json({
        referenceNumber,
        verificationCode,
        status: 'Submitted',
        applicantName: data.fullName,
        programmeName: programme.name,
        academicYearLabel: academicYear.label,
        submittedAt: createdApp.submittedAt,
        notificationStatus: notifResult.status,
      });
    } catch (err) {
      cleanupUploadedFiles(filesMap);
      console.error('[AdmissionsApply]', err);
      res.status(500).json({ error: 'Unable to process application submission. Please try again.' });
    }
  }
);

async function findVerifiedApplication(referenceNumber, verificationDetail) {
  const db = getDb();
  const row = await db.queryOne(
    `SELECT aa.id, aa.reference_number, aa.verification_code_hash, aa.status,
            aa.boarding_preference, aa.admission_category, aa.applicant_public_note,
            aa.submitted_at, aa.decision_date,
            ap.full_name as applicant_name, ap.date_of_birth,
            g.full_name as guardian_name, g.email as guardian_email,
            p.name as programme_name, p.code as programme_code,
            ay.label as academic_year_label
     FROM admission_applications aa
     INNER JOIN applicants ap ON ap.id = aa.applicant_id
     INNER JOIN guardians g ON g.id = aa.guardian_id
     INNER JOIN admission_programmes p ON p.id = aa.programme_id
     INNER JOIN academic_years ay ON ay.id = aa.academic_year_id
     WHERE UPPER(aa.reference_number) = UPPER(?)`,
    [referenceNumber.trim()]
  );

  if (!row) return null;

  const trimmedDetail = verificationDetail.trim();
  const emailMatches = row.guardian_email.toLowerCase() === trimmedDetail.toLowerCase();
  const codeMatches = verifyVerificationCode(trimmedDetail, row.verification_code_hash);
  if (!emailMatches && !codeMatches) return null;

  return row;
}

router.post('/track', publicFormLimiter, async (req, res) => {
  try {
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid tracking request.' });
      return;
    }

    const app = await findVerifiedApplication(parsed.data.referenceNumber, parsed.data.verificationDetail);
    if (!app) {
      res.status(404).json({
        error: 'No matching application was found for that reference number and verification detail.',
      });
      return;
    }

    const db = getDb();
    const history = await db.query(
      `SELECT new_status, public_note, changed_at
       FROM admission_status_history
       WHERE application_id = ?
       ORDER BY changed_at DESC, id DESC`,
      [app.id]
    );

    res.json({
      application: {
        referenceNumber: app.reference_number,
        applicantName: app.applicant_name,
        programmeName: app.programme_name,
        academicYearLabel: app.academic_year_label,
        boardingPreference: app.boarding_preference,
        admissionCategory: app.admission_category,
        status: app.status,
        publicNote: app.applicant_public_note,
        submittedAt: app.submitted_at,
        decisionDate: app.decision_date,
        canDownloadLetter: app.status === 'Accepted',
        history,
      },
    });
  } catch (err) {
    console.error('[AdmissionsTrack]', err);
    res.status(500).json({ error: 'Unable to retrieve application status.' });
  }
});

router.post('/letter', publicFormLimiter, async (req, res) => {
  try {
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid verification credentials.' });
      return;
    }

    const app = await findVerifiedApplication(parsed.data.referenceNumber, parsed.data.verificationDetail);
    if (!app) {
      res.status(404).json({ error: 'Application verification failed.' });
      return;
    }
    if (app.status !== 'Accepted') {
      res.status(403).json({
        error: 'An official admission letter is only available once the application status is Accepted.',
      });
      return;
    }

    const db = getDb();
    const infoRows = await db.query('SELECT setting_key, setting_value FROM school_information');
    const info = Object.fromEntries(infoRows.map((r) => [r.setting_key, r.setting_value]));

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
    console.error('[AdmissionsLetter]', err);
    res.status(500).json({ error: 'Unable to generate admission letter.' });
  }
});

export default router;
