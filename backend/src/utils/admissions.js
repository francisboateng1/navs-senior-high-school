import crypto from 'crypto';

export const ADMISSION_STATUSES = [
  'Submitted',
  'Under Review',
  'Additional Information Required',
  'Shortlisted',
  'Accepted',
  'Waitlisted',
  'Rejected',
  'Withdrawn',
];

export function isValidAdmissionStatus(status) {
  return ADMISSION_STATUSES.includes(status);
}

/**
 * Generates a unique, human-readable application reference number:
 * e.g. NAVS-2026-4F8A9C
 */
export function generateApplicationReference(yearLabel, randomBytesFn = crypto.randomBytes) {
  const yearMatch = String(yearLabel).match(/\d{4}/);
  const yearPart = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
  const token = randomBytesFn(3).toString('hex').toUpperCase();
  return `NAVS-${yearPart}-${token}`;
}

/**
 * Generates an 8-character uppercase tracking verification code (alphanumeric without ambiguous chars)
 */
export function generateVerificationCode(randomBytesFn = crypto.randomBytes) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytesFn(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

export function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}

export function verifyVerificationCode(inputCode, expectedHash) {
  const inputHash = hashVerificationCode(inputCode);
  const a = Buffer.from(inputHash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Escapes CSV cell values cleanly and protects against spreadsheet formula injection.
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let str = String(value).replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildAdmissionsCsv(rows) {
  const headers = [
    'Reference Number',
    'Status',
    'Applicant Full Name',
    'Date of Birth',
    'Gender',
    'Nationality',
    'Residential Location',
    'Previous School',
    'BECE Index Number',
    'Exam Year',
    'Guardian Name',
    'Guardian Relationship',
    'Guardian Phone',
    'Guardian Email',
    'Academic Year',
    'First Choice Programme',
    'Boarding Preference',
    'Submitted At',
    'Decision Date',
  ];

  const keys = [
    'reference_number',
    'status',
    'applicant_name',
    'date_of_birth',
    'gender',
    'nationality',
    'residential_location',
    'previous_school',
    'bece_index_number',
    'exam_year',
    'guardian_name',
    'guardian_relationship',
    'guardian_telephone',
    'guardian_email',
    'academic_year_label',
    'programme_name',
    'boarding_preference',
    'submitted_at',
    'decision_date',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => escapeCsvCell(row[k])).join(','));
  }
  return lines.join('\n');
}

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

export function renderEmailTemplate(templateKey, params) {
  switch (templateKey) {
    case 'application_received':
      return {
        subject: `NAVS Senior High School: Application Received (${params.referenceNumber})`,
        body: [
          `Dear ${params.guardianName},`,
          ``,
          `We confirm receipt of the admission application for ${params.applicantName} (${params.programmeName}) at NAVS Senior High School.`,
          ``,
          `Application Reference Number: ${params.referenceNumber}`,
          params.verificationCode ? `Tracking Verification Code: ${params.verificationCode}` : '',
          `Current Status: ${params.status}`,
          ``,
          `You may check application progress at any time via our Admissions Tracking Portal using your reference number and either your registered guardian email or verification code.`,
          ``,
          `Admissions Office, NAVS Senior High School`,
        ]
          .filter(Boolean)
          .join('\n'),
      };
    case 'additional_info_required':
      return {
        subject: `Action Required: Additional Information for Application ${params.referenceNumber}`,
        body: [
          `Dear ${params.guardianName},`,
          ``,
          `Our Admissions Committee has reviewed the application for ${params.applicantName} (${params.referenceNumber}) and requires additional information before proceeding.`,
          ``,
          params.note ? `Note from Admissions Office: ${params.note}` : 'Please inspect your status on the Admissions Tracking Portal for instructions.',
          ``,
          `Admissions Office, NAVS Senior High School`,
        ].join('\n'),
      };
    case 'decision_made':
      return {
        subject: `Admission Decision Update: ${params.referenceNumber} (${params.status})`,
        body: [
          `Dear ${params.guardianName},`,
          ``,
          `An official admission decision has been recorded for ${params.applicantName} (${params.referenceNumber}).`,
          `Status: ${params.status}`,
          params.note ? `Message: ${params.note}` : '',
          params.status === 'Accepted'
            ? `You can now download the official Provisional Admission Letter directly from the Admissions Tracking Portal.`
            : '',
          ``,
          `Admissions Office, NAVS Senior High School`,
        ]
          .filter(Boolean)
          .join('\n'),
      };
    case 'status_updated':
    default:
      return {
        subject: `Application Status Updated: ${params.referenceNumber} -> ${params.status}`,
        body: [
          `Dear ${params.guardianName},`,
          ``,
          `The status of the admission application for ${params.applicantName} (${params.referenceNumber}) has been updated to: ${params.status}.`,
          params.note ? `Note: ${params.note}` : '',
          ``,
          `Admissions Office, NAVS Senior High School`,
        ]
          .filter(Boolean)
          .join('\n'),
      };
  }
}
