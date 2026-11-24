import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateApplicationReference,
  generateVerificationCode,
  hashVerificationCode,
  verifyVerificationCode,
  escapeCsvCell,
  buildAdmissionsCsv,
  isValidAdmissionStatus,
  renderEmailTemplate,
  slugify,
} from './admissions.js';

test('generateApplicationReference creates formatted year-prefixed reference', () => {
  const ref = generateApplicationReference('2026/2027 Academic Year');
  assert.match(ref, /^NAVS-2026-[A-F0-9]{6}$/);
});

test('verification code hashing and constant-time comparison work reliably', () => {
  const code = generateVerificationCode();
  assert.equal(code.length, 8);
  const hash = hashVerificationCode(code);
  assert.equal(verifyVerificationCode(code.toLowerCase(), hash), true);
  assert.equal(verifyVerificationCode('WRONGCOD', hash), false);
});

test('escapeCsvCell neutralizes spreadsheet formula injection and quotes commas', () => {
  assert.equal(escapeCsvCell('=CMD|calc'), "'=CMD|calc");
  assert.equal(escapeCsvCell('+SUM(A1:A2)'), "'+SUM(A1:A2)");
  assert.equal(escapeCsvCell('Accra, Ghana'), '"Accra, Ghana"');
  assert.equal(escapeCsvCell('He said "Hi"'), '"He said ""Hi"""');
});

test('buildAdmissionsCsv produces valid header and escaped data row', () => {
  const csv = buildAdmissionsCsv([
    {
      reference_number: 'NAVS-2026-123ABC',
      status: 'Accepted',
      applicant_name: 'Kofi Mensah',
      guardian_email: 'parent@example.com',
      programme_name: 'General Science',
    },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Reference Number,Status,Applicant Full Name'));
  assert.ok(lines[1].includes('NAVS-2026-123ABC,Accepted,Kofi Mensah'));
});

test('isValidAdmissionStatus enforces canonical status list', () => {
  assert.equal(isValidAdmissionStatus('Submitted'), true);
  assert.equal(isValidAdmissionStatus('Accepted'), true);
  assert.equal(isValidAdmissionStatus('HackedStatus'), false);
});

test('renderEmailTemplate formats application receipt and decision letters', () => {
  const received = renderEmailTemplate('application_received', {
    applicantName: 'Abena Boateng',
    guardianName: 'Kwame Boateng',
    referenceNumber: 'NAVS-2026-AABB11',
    programmeName: 'Business',
    status: 'Submitted',
    verificationCode: 'ABCD2345',
  });
  assert.ok(received.subject.includes('NAVS-2026-AABB11'));
  assert.ok(received.body.includes('ABCD2345'));

  const accepted = renderEmailTemplate('decision_made', {
    applicantName: 'Abena Boateng',
    guardianName: 'Kwame Boateng',
    referenceNumber: 'NAVS-2026-AABB11',
    programmeName: 'Business',
    status: 'Accepted',
  });
  assert.ok(accepted.body.includes('Provisional Admission Letter'));
});

test('slugify generates clean URL slugs', () => {
  assert.equal(slugify('2026/2027 Admissions Open!'), '20262027-admissions-open');
});
