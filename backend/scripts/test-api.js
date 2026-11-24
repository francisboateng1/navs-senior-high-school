import assert from 'node:assert/strict';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function run() {
  console.log(`Testing NAVS API at ${BASE}...`);

  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  assert.equal(health.status, 'ok');
  console.log('✓ /api/health ok (driver:', health.databaseDriver, ')');

  const boot = await fetch(`${BASE}/api/public/bootstrap`).then((r) => r.json());
  assert.ok(boot.schoolInfo.school_name);
  assert.ok(boot.programmes.length >= 5);
  assert.ok(boot.academicYears.length >= 1);
  console.log('✓ /api/public/bootstrap ok');

  const unauthRes = await fetch(`${BASE}/api/admin/admissions`);
  assert.equal(unauthRes.status, 401);
  console.log('✓ /api/admin/admissions rejects unauthenticated access (401)');

  const badContact = await fetch(`${BASE}/api/public/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderName: 'A', senderEmail: 'bad', subject: 'Hi', message: 'short' }),
  });
  assert.equal(badContact.status, 400);
  console.log('✓ /api/public/contact rejects invalid input (400)');

  const goodContact = await fetch(`${BASE}/api/public/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      senderName: 'Test Parent',
      senderEmail: 'testparent@example.com',
      senderPhone: '0240000000',
      subject: 'Campus Visit Enquiry',
      message: 'We would like to inquire about SHS 1 General Science admissions.',
    }),
  });
  assert.equal(goodContact.status, 201);
  console.log('✓ /api/public/contact accepts valid enquiry (201)');

  const notFoundTrack = await fetch(`${BASE}/api/admissions/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceNumber: 'NAVS-2026-000000', verificationDetail: 'none@example.com' }),
  });
  assert.equal(notFoundTrack.status, 404);
  console.log('✓ /api/admissions/track rejects unknown reference (404)');

  console.log('All API smoke checks passed!');
}

run().catch((err) => {
  console.error('API test failed:', err);
  process.exit(1);
});
