import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { publicFormLimiter } from '../middleware/auth.js';

const router = Router();

const contactSchema = z.object({
  senderName: z.string().trim().min(2, 'Please provide your full name.').max(140),
  senderEmail: z.string().trim().email('Please enter a valid email address.').max(180),
  senderPhone: z.string().trim().max(40).optional().default(''),
  subject: z.string().trim().min(3, 'Please provide a subject.').max(180),
  message: z.string().trim().min(10, 'Please enter a message of at least 10 characters.').max(3000),
});

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

router.get('/bootstrap', async (_req, res) => {
  try {
    const db = getDb();
    const [
      infoRows,
      academicYears,
      programmes,
      requirements,
      departments,
      faqs,
      resources,
      latestNews,
      allEvents,
      featuredGallery,
    ] = await Promise.all([
      db.query('SELECT setting_key, setting_value, category, label FROM school_information'),
      db.query('SELECT * FROM academic_years ORDER BY is_current DESC, id DESC'),
      db.query('SELECT * FROM admission_programmes ORDER BY display_order ASC, id ASC'),
      db.query('SELECT * FROM admission_requirements WHERE is_active = 1 ORDER BY display_order ASC, id ASC'),
      db.query('SELECT * FROM academic_departments ORDER BY display_order ASC, id ASC'),
      db.query('SELECT * FROM faqs WHERE is_published = 1 ORDER BY display_order ASC, id ASC'),
      db.query('SELECT * FROM academic_resources WHERE is_public = 1 ORDER BY id DESC'),
      db.query(
        'SELECT id, slug, title, category, summary, image_url, published_at FROM news_articles WHERE is_published = 1 ORDER BY published_at DESC LIMIT 3'
      ),
      db.query('SELECT * FROM events WHERE is_published = 1 ORDER BY event_date ASC LIMIT 6'),
      db.query(
        `SELECT gi.id, gi.title, gi.caption, gi.image_url, gc.name as category_name, gc.slug as category_slug
         FROM gallery_images gi
         INNER JOIN gallery_categories gc ON gc.id = gi.category_id
         ORDER BY gi.is_featured DESC, gi.uploaded_at DESC LIMIT 6`
      ),
    ]);

    const schoolInfo = {};
    for (const row of infoRows) {
      schoolInfo[row.setting_key] = row.setting_value;
    }

    res.json({
      schoolInfo,
      academicYears,
      programmes,
      requirements,
      departments,
      faqs,
      resources,
      latestNews,
      events: allEvents,
      featuredGallery,
    });
  } catch (err) {
    console.error('[PublicBootstrap]', err);
    res.status(500).json({ error: 'Unable to load school information.' });
  }
});

router.get('/news', async (req, res) => {
  try {
    const db = getDb();
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let sql =
      'SELECT id, slug, title, category, summary, content, image_url, published_at FROM news_articles WHERE is_published = 1';
    const params = [];

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    sql += ' ORDER BY published_at DESC';

    const articles = await db.query(sql, params);
    res.json({ articles });
  } catch (err) {
    console.error('[PublicNews]', err);
    res.status(500).json({ error: 'Unable to load news articles.' });
  }
});

router.get('/news/:slug', async (req, res) => {
  try {
    const db = getDb();
    const article = await db.queryOne(
      'SELECT id, slug, title, category, summary, content, image_url, published_at FROM news_articles WHERE slug = ? AND is_published = 1',
      [req.params.slug]
    );
    if (!article) {
      res.status(404).json({ error: 'News article not found.' });
      return;
    }
    res.json({ article });
  } catch (err) {
    console.error('[PublicNewsDetail]', err);
    res.status(500).json({ error: 'Unable to load news article.' });
  }
});

router.get('/events', async (_req, res) => {
  try {
    const db = getDb();
    const events = await db.query('SELECT * FROM events WHERE is_published = 1 ORDER BY event_date ASC');
    res.json({ events });
  } catch (err) {
    console.error('[PublicEvents]', err);
    res.status(500).json({ error: 'Unable to load events.' });
  }
});

router.get('/gallery', async (req, res) => {
  try {
    const db = getDb();
    const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const categories = await db.query('SELECT * FROM gallery_categories ORDER BY display_order ASC, id ASC');

    let sql = `SELECT gi.id, gi.title, gi.caption, gi.image_url, gi.is_featured, gi.uploaded_at, gc.id as category_id, gc.name as category_name, gc.slug as category_slug
               FROM gallery_images gi
               INNER JOIN gallery_categories gc ON gc.id = gi.category_id`;
    const params = [];
    if (categorySlug && categorySlug !== 'all') {
      sql += ' WHERE gc.slug = ?';
      params.push(categorySlug);
    }
    sql += ' ORDER BY gi.is_featured DESC, gi.uploaded_at DESC';

    const images = await db.query(sql, params);
    res.json({ categories, images });
  } catch (err) {
    console.error('[PublicGallery]', err);
    res.status(500).json({ error: 'Unable to load gallery.' });
  }
});

router.get('/staff', async (_req, res) => {
  try {
    const db = getDb();
    const staff = await db.query(
      'SELECT id, full_name, position, department, category, biography, photo_url FROM staff WHERE is_public = 1 ORDER BY display_order ASC, id ASC'
    );
    res.json({ staff });
  } catch (err) {
    console.error('[PublicStaff]', err);
    res.status(500).json({ error: 'Unable to load staff directory.' });
  }
});

router.post('/contact', publicFormLimiter, async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid enquiry input.',
        issues: parsed.error.issues,
      });
      return;
    }

    const db = getDb();
    const { senderName, senderEmail, senderPhone, subject, message } = parsed.data;
    const result = await db.execute(
      `INSERT INTO contact_enquiries (sender_name, sender_email, sender_phone, subject, message, status)
       VALUES (?, ?, ?, ?, ?, 'New')`,
      [senderName, senderEmail, senderPhone || null, subject, message]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Your enquiry has been received by the NAVS Senior High School office.',
    });
  } catch (err) {
    console.error('[PublicContact]', err);
    res.status(500).json({ error: 'Unable to submit enquiry right now.' });
  }
});

router.get('/resources/prospectus', async (_req, res) => {
  try {
    const db = getDb();
    const infoRows = await db.query('SELECT setting_key, setting_value FROM school_information');
    const info = Object.fromEntries(infoRows.map((r) => [r.setting_key, r.setting_value]));
    const programmes = await db.query(
      'SELECT name, code, description, elective_subjects FROM admission_programmes WHERE is_accepting_applications = 1 ORDER BY display_order ASC'
    );
    const requirements = await db.query(
      'SELECT title, category, description FROM admission_requirements WHERE is_active = 1 ORDER BY display_order ASC'
    );

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(info.school_name || 'NAVS Senior High School')} — Admissions Prospectus</title>
  <style>
    body { font-family: Georgia, serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #111827; line-height: 1.6; }
    header { border-bottom: 2px solid #0C1E3C; padding-bottom: 16px; margin-bottom: 28px; }
    h1 { color: #0C1E3C; margin: 0 0 6px; font-size: 28px; }
    h2 { color: #0C1E3C; font-size: 18px; border-bottom: 1px solid #D1D5DB; padding-bottom: 4px; margin-top: 28px; }
    .meta { font-family: Arial, sans-serif; font-size: 13px; color: #4B5563; }
    .item { margin-bottom: 14px; }
    .badge { font-family: Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #8D6419; font-weight: bold; }
    @media print { .print-btn { display: none; } }
    .print-btn { background: #0C1E3C; color: #fff; border: 0; padding: 10px 16px; cursor: pointer; font-family: Arial, sans-serif; margin-bottom: 20px; }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <header>
    <div class="badge">Official Admissions Prospectus</div>
    <h1>${escapeHtml(info.school_name || 'NAVS Senior High School')}</h1>
    <div class="meta">${escapeHtml(info.contact_address || '')} · ${escapeHtml(info.contact_email || '')}</div>
  </header>
  <h2>1. Admissions Overview</h2>
  <p>${escapeHtml(info.admission_overview || '')}</p>
  <p><strong>Eligibility:</strong> ${escapeHtml(info.admission_eligibility || '')}</p>
  <h2>2. Available Academic Programmes</h2>
  ${programmes
    .map(
      (p) =>
        `<div class="item"><strong>${escapeHtml(p.name)} (${escapeHtml(p.code)})</strong><br/>${escapeHtml(
          p.description
        )}<br/><span class="meta">Electives: ${escapeHtml(p.elective_subjects)}</span></div>`
    )
    .join('')}
  <h2>3. Admission Requirements &amp; Documents</h2>
  ${requirements
    .map(
      (r) =>
        `<div class="item"><strong>${escapeHtml(r.title)}</strong> <span class="meta">(${escapeHtml(
          r.category
        )})</span><br/>${escapeHtml(r.description)}</div>`
    )
    .join('')}
  <h2>4. Privacy &amp; Data Protection</h2>
  <p>${escapeHtml(info.admission_guidelines || '')}</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="navs-admissions-prospectus.html"');
    res.send(html);
  } catch (err) {
    console.error('[ProspectusResource]', err);
    res.status(500).send('Unable to generate prospectus.');
  }
});

router.get('/resources/curriculum-guide', async (_req, res) => {
  try {
    const db = getDb();
    const programmes = await db.query(
      'SELECT name, code, department_name, core_subjects, elective_subjects, career_pathways FROM admission_programmes ORDER BY display_order ASC'
    );
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>NAVS Senior High School — Academic Programmes & Curriculum Guide</title>
  <style>
    body { font-family: Georgia, serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #111827; line-height: 1.6; }
    h1 { color: #0C1E3C; border-bottom: 2px solid #0C1E3C; padding-bottom: 10px; }
    .track { border: 1px solid #E5E7EB; padding: 16px; margin-bottom: 16px; }
    .meta { font-family: Arial, sans-serif; font-size: 13px; color: #4B5563; }
    @media print { .print-btn { display: none; } }
    .print-btn { background: #0C1E3C; color: #fff; border: 0; padding: 10px 16px; cursor: pointer; font-family: Arial, sans-serif; margin-bottom: 20px; }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <h1>NAVS Senior High School — Academic Curriculum Guide</h1>
  ${programmes
    .map(
      (p) => `
    <div class="track">
      <h2>${escapeHtml(p.name)} (${escapeHtml(p.code)})</h2>
      <div class="meta">Department: ${escapeHtml(p.department_name)}</div>
      <p><strong>Core Subjects:</strong> ${escapeHtml(p.core_subjects)}</p>
      <p><strong>Elective Subjects:</strong> ${escapeHtml(p.elective_subjects)}</p>
      <p><strong>University &amp; Career Pathways:</strong> ${escapeHtml(p.career_pathways || '')}</p>
    </div>
  `
    )
    .join('')}
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="navs-curriculum-guide.html"');
    res.send(html);
  } catch (err) {
    console.error('[CurriculumGuide]', err);
    res.status(500).send('Unable to generate curriculum guide.');
  }
});

export default router;
