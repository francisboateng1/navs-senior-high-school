import fs from 'fs';
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { requireAdminAuth, requirePermission } from '../middleware/auth.js';
import { uploadPublicMedia, verifyFileMagicBytes } from '../middleware/upload.js';
import { slugify } from '../utils/admissions.js';
import { recordAuditLog } from '../services/auditService.js';

const router = Router();
router.use(requireAdminAuth);

// Public media upload for News, Events, Gallery, Staff
router.post('/upload-media', requirePermission('content:write'), uploadPublicMedia.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }
    if (!verifyFileMagicBytes(req.file.path, req.file.mimetype)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'Uploaded file failed image signature validation.' });
      return;
    }
    const url = `/media/${req.file.filename}`;
    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'UPLOAD_PUBLIC_MEDIA',
      entityType: 'media',
      entityId: req.file.filename,
      req,
    });
    res.status(201).json({ url, filename: req.file.filename });
  } catch (err) {
    console.error('[AdminUploadMedia]', err);
    res.status(500).json({ error: 'Failed to upload image.' });
  }
});

// School Information Settings
router.get('/school-info', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const rows = await db.query('SELECT * FROM school_information ORDER BY category ASC, id ASC');
  res.json({ items: rows });
});

router.put('/school-info', requirePermission('content:write'), async (req, res) => {
  try {
    const schema = z.object({
      updates: z.array(
        z.object({
          setting_key: z.string().min(1).max(100),
          setting_value: z.string().max(4000),
        })
      ),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid settings update format.' });
      return;
    }

    const db = getDb();
    const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.transaction(async (tx) => {
      for (const item of parsed.data.updates) {
        await tx.execute(
          'UPDATE school_information SET setting_value = ?, updated_by_admin_id = ?, updated_at = ? WHERE setting_key = ?',
          [item.setting_value, req.adminUser?.id ?? null, nowIso, item.setting_key]
        );
      }
    });

    await recordAuditLog({
      administratorId: req.adminUser?.id,
      actorEmail: req.adminUser?.email,
      action: 'UPDATE_SCHOOL_INFO',
      entityType: 'school_information',
      details: `Updated ${parsed.data.updates.length} configuration fields`,
      req,
    });

    res.json({ message: 'School information updated successfully.' });
  } catch (err) {
    console.error('[AdminUpdateSchoolInfo]', err);
    res.status(500).json({ error: 'Unable to update school information.' });
  }
});

// Academic Years (Super Admin / settings:manage)
router.get('/academic-years', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const years = await db.query('SELECT * FROM academic_years ORDER BY is_current DESC, id DESC');
  res.json({ years });
});

router.post('/academic-years', requirePermission('settings:manage'), async (req, res) => {
  const schema = z.object({
    label: z.string().trim().min(4).max(40),
    admissions_open: z.boolean().default(true),
    application_deadline: z.string().trim().max(20).optional().default(''),
    is_current: z.boolean().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid academic year.' });
    return;
  }
  const db = getDb();
  if (parsed.data.is_current) {
    await db.execute('UPDATE academic_years SET is_current = 0');
  }
  const result = await db.execute(
    'INSERT INTO academic_years (label, admissions_open, application_deadline, is_current) VALUES (?, ?, ?, ?)',
    [
      parsed.data.label,
      parsed.data.admissions_open ? 1 : 0,
      parsed.data.application_deadline || null,
      parsed.data.is_current ? 1 : 0,
    ]
  );
  await recordAuditLog({
    administratorId: req.adminUser?.id,
    actorEmail: req.adminUser?.email,
    action: 'CREATE_ACADEMIC_YEAR',
    entityType: 'academic_year',
    entityId: result.insertId,
    details: parsed.data.label,
    req,
  });
  res.status(201).json({ id: result.insertId, message: 'Academic year created.' });
});

router.patch('/academic-years/:id', requirePermission('settings:manage'), async (req, res) => {
  const id = Number(req.params.id);
  const { admissions_open, is_current, application_deadline } = req.body || {};
  const db = getDb();
  if (is_current) {
    await db.execute('UPDATE academic_years SET is_current = 0');
  }
  await db.execute('UPDATE academic_years SET admissions_open = ?, is_current = ?, application_deadline = ? WHERE id = ?', [
    admissions_open ? 1 : 0,
    is_current ? 1 : 0,
    application_deadline || null,
    id,
  ]);
  res.json({ message: 'Academic year updated.' });
});

// Programmes CRUD
router.get('/programmes', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const programmes = await db.query('SELECT * FROM admission_programmes ORDER BY display_order ASC, id ASC');
  res.json({ programmes });
});

router.post('/programmes', requirePermission('content:write'), async (req, res) => {
  const schema = z.object({
    code: z.string().trim().min(2).max(20),
    name: z.string().trim().min(2).max(140),
    department_name: z.string().trim().min(2).max(140),
    description: z.string().trim().min(5).max(2000),
    core_subjects: z.string().trim().min(2).max(1000),
    elective_subjects: z.string().trim().min(2).max(1000),
    career_pathways: z.string().trim().max(1000).optional().default(''),
    is_accepting_applications: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid programme data.' });
    return;
  }
  const db = getDb();
  const d = parsed.data;
  const result = await db.execute(
    `INSERT INTO admission_programmes (code, name, department_name, description, core_subjects, elective_subjects, career_pathways, is_accepting_applications)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.code.toUpperCase(),
      d.name,
      d.department_name,
      d.description,
      d.core_subjects,
      d.elective_subjects,
      d.career_pathways || null,
      d.is_accepting_applications ? 1 : 0,
    ]
  );
  await recordAuditLog({
    administratorId: req.adminUser?.id,
    actorEmail: req.adminUser?.email,
    action: 'CREATE_PROGRAMME',
    entityType: 'admission_programme',
    entityId: result.insertId,
    details: d.name,
    req,
  });
  res.status(201).json({ id: result.insertId, message: 'Programme created.' });
});

router.put('/programmes/:id', requirePermission('content:write'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, department_name, description, core_subjects, elective_subjects, career_pathways, is_accepting_applications } =
    req.body || {};
  const db = getDb();
  await db.execute(
    `UPDATE admission_programmes
     SET name = ?, department_name = ?, description = ?, core_subjects = ?, elective_subjects = ?, career_pathways = ?, is_accepting_applications = ?
     WHERE id = ?`,
    [
      name,
      department_name,
      description,
      core_subjects,
      elective_subjects,
      career_pathways || null,
      is_accepting_applications ? 1 : 0,
      id,
    ]
  );
  await recordAuditLog({
    administratorId: req.adminUser?.id,
    actorEmail: req.adminUser?.email,
    action: 'UPDATE_PROGRAMME',
    entityType: 'admission_programme',
    entityId: id,
    req,
  });
  res.json({ message: 'Programme updated.' });
});

// News Articles CRUD
router.get('/news', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const articles = await db.query('SELECT * FROM news_articles ORDER BY published_at DESC, id DESC');
  res.json({ articles });
});

router.post('/news', requirePermission('content:write'), async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(3).max(200),
    category: z.string().trim().min(2).max(80),
    summary: z.string().trim().min(5).max(500),
    content: z.string().trim().min(10).max(15000),
    image_url: z.string().trim().max(255).optional().default(''),
    is_published: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid news article data.' });
    return;
  }
  const db = getDb();
  const d = parsed.data;
  const slug = `${slugify(d.title)}-${Date.now().toString(36).slice(-4)}`;
  const result = await db.execute(
    `INSERT INTO news_articles (slug, title, category, summary, content, image_url, is_published, author_admin_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [slug, d.title, d.category, d.summary, d.content, d.image_url || null, d.is_published ? 1 : 0, req.adminUser.id]
  );
  await recordAuditLog({
    administratorId: req.adminUser?.id,
    actorEmail: req.adminUser?.email,
    action: 'CREATE_NEWS_ARTICLE',
    entityType: 'news_article',
    entityId: result.insertId,
    details: d.title,
    req,
  });
  res.status(201).json({ id: result.insertId, slug, message: 'News article saved.' });
});

router.put('/news/:id', requirePermission('content:write'), async (req, res) => {
  const id = Number(req.params.id);
  const { title, category, summary, content, image_url, is_published } = req.body || {};
  const db = getDb();
  await db.execute(
    `UPDATE news_articles SET title = ?, category = ?, summary = ?, content = ?, image_url = ?, is_published = ?, updated_at = ? WHERE id = ?`,
    [title, category, summary, content, image_url || null, is_published ? 1 : 0, new Date().toISOString().slice(0, 19).replace('T', ' '), id]
  );
  await recordAuditLog({
    administratorId: req.adminUser?.id,
    actorEmail: req.adminUser?.email,
    action: 'UPDATE_NEWS_ARTICLE',
    entityType: 'news_article',
    entityId: id,
    req,
  });
  res.json({ message: 'News article updated.' });
});

router.delete('/news/:id', requirePermission('content:write'), async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  await db.execute('DELETE FROM news_articles WHERE id = ?', [id]);
  await recordAuditLog({
    administratorId: req.adminUser?.id,
    actorEmail: req.adminUser?.email,
    action: 'DELETE_NEWS_ARTICLE',
    entityType: 'news_article',
    entityId: id,
    req,
  });
  res.json({ message: 'News article deleted.' });
});

// Events CRUD
router.get('/events', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const events = await db.query('SELECT * FROM events ORDER BY event_date DESC, id DESC');
  res.json({ events });
});

router.post('/events', requirePermission('content:write'), async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(3).max(180),
    category: z.string().trim().min(2).max(80),
    event_date: z.string().trim().min(10).max(40),
    end_time: z.string().trim().max(40).optional().default(''),
    location: z.string().trim().min(2).max(180),
    description: z.string().trim().min(5).max(3000),
    image_url: z.string().trim().max(255).optional().default(''),
    is_published: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid event data.' });
    return;
  }
  const db = getDb();
  const d = parsed.data;
  const result = await db.execute(
    `INSERT INTO events (title, category, event_date, end_time, location, description, image_url, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.title, d.category, d.event_date, d.end_time || null, d.location, d.description, d.image_url || null, d.is_published ? 1 : 0]
  );
  await recordAuditLog({
    administratorId: req.adminUser?.id,
    actorEmail: req.adminUser?.email,
    action: 'CREATE_EVENT',
    entityType: 'event',
    entityId: result.insertId,
    details: d.title,
    req,
  });
  res.status(201).json({ id: result.insertId, message: 'Event created.' });
});

router.put('/events/:id', requirePermission('content:write'), async (req, res) => {
  const id = Number(req.params.id);
  const { title, category, event_date, end_time, location, description, image_url, is_published } = req.body || {};
  const db = getDb();
  await db.execute(
    `UPDATE events SET title = ?, category = ?, event_date = ?, end_time = ?, location = ?, description = ?, image_url = ?, is_published = ? WHERE id = ?`,
    [title, category, event_date, end_time || null, location, description, image_url || null, is_published ? 1 : 0, id]
  );
  res.json({ message: 'Event updated.' });
});

router.delete('/events/:id', requirePermission('content:write'), async (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  await db.execute('DELETE FROM events WHERE id = ?', [id]);
  res.json({ message: 'Event deleted.' });
});

// Gallery CRUD
router.get('/gallery', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const [categories, images] = await Promise.all([
    db.query('SELECT * FROM gallery_categories ORDER BY display_order ASC'),
    db.query(
      `SELECT gi.*, gc.name as category_name
       FROM gallery_images gi
       INNER JOIN gallery_categories gc ON gc.id = gi.category_id
       ORDER BY gi.uploaded_at DESC, gi.id DESC`
    ),
  ]);
  res.json({ categories, images });
});

router.post('/gallery', requirePermission('content:write'), async (req, res) => {
  const schema = z.object({
    category_id: z.coerce.number().int().positive(),
    title: z.string().trim().min(2).max(180),
    caption: z.string().trim().max(255).optional().default(''),
    image_url: z.string().trim().min(2).max(255),
    is_featured: z.boolean().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid gallery item.' });
    return;
  }
  const db = getDb();
  const d = parsed.data;
  const result = await db.execute(
    'INSERT INTO gallery_images (category_id, title, caption, image_url, is_featured) VALUES (?, ?, ?, ?, ?)',
    [d.category_id, d.title, d.caption || null, d.image_url, d.is_featured ? 1 : 0]
  );
  res.status(201).json({ id: result.insertId, message: 'Gallery image added.' });
});

router.delete('/gallery/:id', requirePermission('content:write'), async (req, res) => {
  const db = getDb();
  await db.execute('DELETE FROM gallery_images WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Gallery image removed.' });
});

// Staff CRUD
router.get('/staff', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const staff = await db.query('SELECT * FROM staff ORDER BY display_order ASC, id ASC');
  res.json({ staff });
});

router.post('/staff', requirePermission('content:write'), async (req, res) => {
  const schema = z.object({
    full_name: z.string().trim().min(2).max(150),
    position: z.string().trim().min(2).max(140),
    department: z.string().trim().min(2).max(140),
    category: z.string().trim().min(2).max(60).default('Academic'),
    biography: z.string().trim().min(5).max(2000),
    photo_url: z.string().trim().max(255).optional().default(''),
    is_public: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid staff profile.' });
    return;
  }
  const db = getDb();
  const d = parsed.data;
  const result = await db.execute(
    'INSERT INTO staff (full_name, position, department, category, biography, photo_url, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [d.full_name, d.position, d.department, d.category, d.biography, d.photo_url || null, d.is_public ? 1 : 0]
  );
  res.status(201).json({ id: result.insertId, message: 'Staff profile created.' });
});

router.put('/staff/:id', requirePermission('content:write'), async (req, res) => {
  const id = Number(req.params.id);
  const { full_name, position, department, category, biography, photo_url, is_public } = req.body || {};
  const db = getDb();
  await db.execute(
    'UPDATE staff SET full_name = ?, position = ?, department = ?, category = ?, biography = ?, photo_url = ?, is_public = ? WHERE id = ?',
    [full_name, position, department, category || 'Academic', biography, photo_url || null, is_public ? 1 : 0, id]
  );
  res.json({ message: 'Staff profile updated.' });
});

router.delete('/staff/:id', requirePermission('content:write'), async (req, res) => {
  const db = getDb();
  await db.execute('DELETE FROM staff WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Staff profile deleted.' });
});

// FAQs CRUD
router.get('/faqs', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const faqs = await db.query('SELECT * FROM faqs ORDER BY display_order ASC, id ASC');
  res.json({ faqs });
});

router.post('/faqs', requirePermission('content:write'), async (req, res) => {
  const schema = z.object({
    category: z.string().trim().min(2).max(80),
    question: z.string().trim().min(5).max(255),
    answer: z.string().trim().min(5).max(3000),
    is_published: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid FAQ.' });
    return;
  }
  const db = getDb();
  const d = parsed.data;
  const result = await db.execute(
    'INSERT INTO faqs (category, question, answer, is_published) VALUES (?, ?, ?, ?)',
    [d.category, d.question, d.answer, d.is_published ? 1 : 0]
  );
  res.status(201).json({ id: result.insertId, message: 'FAQ added.' });
});

router.delete('/faqs/:id', requirePermission('content:write'), async (req, res) => {
  const db = getDb();
  await db.execute('DELETE FROM faqs WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'FAQ deleted.' });
});

// Contact Enquiries Inbox
router.get('/enquiries', requirePermission('content:write'), async (_req, res) => {
  const db = getDb();
  const enquiries = await db.query('SELECT * FROM contact_enquiries ORDER BY created_at DESC, id DESC LIMIT 100');
  res.json({ enquiries });
});

router.patch('/enquiries/:id', requirePermission('content:write'), async (req, res) => {
  const { status, admin_response_note } = req.body || {};
  const db = getDb();
  await db.execute('UPDATE contact_enquiries SET status = ?, admin_response_note = ? WHERE id = ?', [
    status || 'Reviewed',
    admin_response_note || null,
    Number(req.params.id),
  ]);
  res.json({ message: 'Enquiry updated.' });
});

export default router;
