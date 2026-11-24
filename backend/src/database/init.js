import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getDb } from '../config/db.js';
import { env } from '../config/env.js';

async function seedRolesAndPermissions(db) {
  const roles = [
    {
      name: 'Super Administrator',
      slug: 'super_admin',
      description: 'Full system control including staff accounts, permissions, admissions, and content.',
    },
    {
      name: 'Admissions Officer',
      slug: 'admissions_officer',
      description: 'Review applications, verify documents, update statuses, make decisions, and export records.',
    },
    {
      name: 'Content Editor',
      slug: 'content_editor',
      description: 'Manage public website content, news, events, gallery, and academic resources.',
    },
  ];

  for (const r of roles) {
    const existing = await db.queryOne('SELECT id FROM roles WHERE slug = ?', [r.slug]);
    if (!existing) {
      await db.execute('INSERT INTO roles (name, slug, description) VALUES (?, ?, ?)', [r.name, r.slug, r.description]);
    }
  }

  const permissions = [
    { code: 'admissions:read', label: 'View Admissions', description: 'View submitted applications and uploaded documents' },
    { code: 'admissions:decide', label: 'Decide Admissions', description: 'Update status, add internal notes, issue admission decisions' },
    { code: 'admissions:export', label: 'Export Admissions', description: 'Export applicant records to CSV' },
    { code: 'content:write', label: 'Manage Content', description: 'Create, edit, publish, and remove website content' },
    { code: 'users:manage', label: 'Manage Administrators', description: 'Create staff accounts, assign roles, and view audit logs' },
    { code: 'settings:manage', label: 'Manage School Settings', description: 'Update school configuration, academic years, and requirements' },
  ];

  for (const p of permissions) {
    const existing = await db.queryOne('SELECT id FROM permissions WHERE code = ?', [p.code]);
    if (!existing) {
      await db.execute('INSERT INTO permissions (code, label, description) VALUES (?, ?, ?)', [p.code, p.label, p.description]);
    }
  }

  const roleMap = {
    super_admin: ['admissions:read', 'admissions:decide', 'admissions:export', 'content:write', 'users:manage', 'settings:manage'],
    admissions_officer: ['admissions:read', 'admissions:decide', 'admissions:export'],
    content_editor: ['content:write'],
  };

  for (const [slug, codes] of Object.entries(roleMap)) {
    const role = await db.queryOne('SELECT id FROM roles WHERE slug = ?', [slug]);
    if (!role) continue;
    for (const code of codes) {
      const perm = await db.queryOne('SELECT id FROM permissions WHERE code = ?', [code]);
      if (!perm) continue;
      const linked = await db.queryOne(
        'SELECT role_id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
        [role.id, perm.id]
      );
      if (!linked) {
        await db.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, perm.id]);
      }
    }
  }
}

async function seedBootstrapEnvAdmin(db) {
  if (!env.adminBootstrapEmail || !env.adminBootstrapPassword) return;
  const countRow = await db.queryOne('SELECT COUNT(*) as total FROM administrators');
  if ((countRow?.total ?? 0) > 0) return;

  const hash = await bcrypt.hash(env.adminBootstrapPassword, 12);
  const res = await db.execute(
    'INSERT INTO administrators (full_name, email, password_hash, is_active) VALUES (?, ?, ?, 1)',
    [env.adminBootstrapName, env.adminBootstrapEmail.toLowerCase(), hash]
  );
  const superRole = await db.queryOne('SELECT id FROM roles WHERE slug = ?', ['super_admin']);
  if (superRole && res.insertId) {
    await db.execute('INSERT INTO administrator_role_assignments (administrator_id, role_id) VALUES (?, ?)', [
      res.insertId,
      superRole.id,
    ]);
  }
}

async function seedInitialContent(db) {
  const schoolInfoEntries = [
    { key: 'school_name', value: 'NAVS Senior High School', category: 'identity', label: 'Official School Name' },
    { key: 'school_short_name', value: 'NAVS SHS', category: 'identity', label: 'Short Name / Abbreviation' },
    { key: 'school_motto', value: '[Placeholder Motto — Update in Admin Dashboard]', category: 'identity', label: 'School Motto' },
    { key: 'hero_headline', value: 'Disciplined Scholarship and Character for Ghana’s Future Leaders', category: 'homepage', label: 'Hero Headline' },
    { key: 'hero_subheadline', value: 'A private senior high school in Ghana committed to academic rigour, moral integrity, and holistic student formation.', category: 'homepage', label: 'Hero Welcome Message' },
    { key: 'headmaster_name', value: '[Headmaster / Headmistress Name — Configurable in Admin]', category: 'leadership', label: 'Head of School Name' },
    { key: 'headmaster_title', value: 'Headmaster / Headmistress', category: 'leadership', label: 'Head of School Title' },
    { key: 'headmaster_message', value: 'Welcome to NAVS Senior High School. [Editable Placeholder Welcome Message: Our institution stands for disciplined inquiry, dedicated mentorship, and preparation for WASSCE excellence and lifelong service. School leadership may update this full address directly from the Administrator Dashboard.]', category: 'leadership', label: 'Headmaster Welcome Address' },
    { key: 'about_history', value: '[Placeholder School History: Update with NAVS Senior High School’s founding year, founders, and historical milestones via the Administrator Dashboard.]', category: 'about', label: 'School History' },
    { key: 'about_background', value: '[Placeholder School Background: Describe NAVS Senior High School’s educational heritage, accreditation, and community role in Ghana.]', category: 'about', label: 'School Background' },
    { key: 'vision', value: 'To be a leading private senior high school in Ghana recognized for academic distinction, disciplined character, and purposeful leadership.', category: 'about', label: 'School Vision' },
    { key: 'mission', value: 'To deliver rigorous senior secondary education anchored in strong moral values, modern instructional practice, and supportive mentorship for every learner.', category: 'about', label: 'School Mission' },
    { key: 'core_values', value: 'Discipline · Integrity · Academic Rigour · Service · Respect', category: 'about', label: 'Core Values' },
    { key: 'educational_philosophy', value: 'We combine structured classroom instruction, practical laboratory and studio engagement, and consistent pastoral guidance so every student builds confidence and accountability.', category: 'about', label: 'Educational Philosophy' },
    { key: 'contact_address', value: '[Official Physical Address & Digital Address — Configure in Admin]', category: 'contact', label: 'Official School Address' },
    { key: 'contact_phone_primary', value: '[Official Admissions Telephone — Configure in Admin]', category: 'contact', label: 'Primary Telephone' },
    { key: 'contact_phone_secondary', value: '[Secondary Office Line — Configure in Admin]', category: 'contact', label: 'Secondary Telephone' },
    { key: 'contact_email', value: '[Official School Email — Configure in Admin]', category: 'contact', label: 'Official Email Address' },
    { key: 'contact_whatsapp', value: '[Official WhatsApp Contact — Configure in Admin]', category: 'contact', label: 'WhatsApp Number' },
    { key: 'office_hours', value: 'Monday – Friday, 8:00 AM – 4:00 PM GMT', category: 'contact', label: 'Admissions Office Hours' },
    { key: 'maps_embed_query', value: 'Accra, Ghana', category: 'contact', label: 'Google Maps Location Query' },
    { key: 'social_facebook', value: '', category: 'social', label: 'Facebook URL' },
    { key: 'social_instagram', value: '', category: 'social', label: 'Instagram URL' },
    { key: 'social_youtube', value: '', category: 'social', label: 'YouTube URL' },
    { key: 'admission_overview', value: 'NAVS Senior High School conducts a transparent, direct private school admission process. Prospective students and their parents or guardians may submit applications online, upload supporting academic records, and track review progress using their unique reference number.', category: 'admissions', label: 'Admission Overview' },
    { key: 'admission_eligibility', value: 'Applicants should have completed Junior High School (JHS 3) or equivalent basic education, demonstrate readiness for senior secondary study, and satisfy programme-specific subject prerequisites.', category: 'admissions', label: 'Eligibility Criteria' },
    { key: 'admission_dates_summary', value: '[Configure current term intake dates, entrance assessment schedule, and orientation dates in Admin Dashboard]', category: 'admissions', label: 'Important Admission Dates' },
    { key: 'admission_guidelines', value: 'All applications for minors must be completed with parent or guardian consent in accordance with Ghana’s Data Protection Act, 2012 (Act 843). Please ensure uploaded documents are clear PDF, JPG, or PNG scans.', category: 'admissions', label: 'Application Guidelines' },
  ];

  for (const item of schoolInfoEntries) {
    const exists = await db.queryOne('SELECT id FROM school_information WHERE setting_key = ?', [item.key]);
    if (!exists) {
      await db.execute(
        'INSERT INTO school_information (setting_key, setting_value, category, label) VALUES (?, ?, ?, ?)',
        [item.key, item.value, item.category, item.label]
      );
    }
  }

  const yearCount = await db.queryOne('SELECT COUNT(*) as total FROM academic_years');
  if ((yearCount?.total ?? 0) === 0) {
    await db.execute(
      'INSERT INTO academic_years (label, admissions_open, application_deadline, is_current) VALUES (?, ?, ?, ?)',
      ['2026/2027 Academic Year', 1, '2026-09-30', 1]
    );
    await db.execute(
      'INSERT INTO academic_years (label, admissions_open, application_deadline, is_current) VALUES (?, ?, ?, ?)',
      ['2027/2028 Academic Year', 1, '2027-09-30', 0]
    );
  }

  const progCount = await db.queryOne('SELECT COUNT(*) as total FROM admission_programmes');
  if ((progCount?.total ?? 0) === 0) {
    const programmes = [
      {
        code: 'SCI',
        name: 'General Science',
        department_name: 'Science & Mathematics',
        description: 'Rigorous foundation in Physics, Chemistry, Biology, and Elective Mathematics preparing students for medicine, engineering, pharmacy, and technology degrees.',
        core_subjects: 'English Language, Core Mathematics, Integrated Science, Social Studies',
        elective_subjects: 'Physics, Chemistry, Biology, Elective Mathematics',
        career_pathways: 'Medicine, Engineering, Computer Science, Pharmacy, Biological Sciences',
        order: 1,
      },
      {
        code: 'ART',
        name: 'General Arts',
        department_name: 'Humanities & Languages',
        description: 'Broad analytical grounding in Literature, Government, History, Economics, and Languages for law, diplomacy, journalism, and social sciences.',
        core_subjects: 'English Language, Core Mathematics, Integrated Science, Social Studies',
        elective_subjects: 'Economics, Government, Literature-in-English, History / CRS / Geography / French',
        career_pathways: 'Law, Public Policy, International Relations, Journalism, Education',
        order: 2,
      },
      {
        code: 'BUS',
        name: 'Business',
        department_name: 'Business & Commerce',
        description: 'Structured commerce curriculum covering Financial Accounting, Business Management, Cost Accounting, and Economics for finance and enterprise leadership.',
        core_subjects: 'English Language, Core Mathematics, Integrated Science, Social Studies',
        elective_subjects: 'Financial Accounting, Business Management, Economics, Cost Accounting / Elective Mathematics',
        career_pathways: 'Chartered Accountancy, Banking & Finance, Entrepreneurship, Economics',
        order: 3,
      },
      {
        code: 'HEC',
        name: 'Home Economics',
        department_name: 'Applied & Creative Sciences',
        description: 'Applied scientific and creative study in Management-in-Living, Food & Nutrition, Biology, and Textiles/Design.',
        core_subjects: 'English Language, Core Mathematics, Integrated Science, Social Studies',
        elective_subjects: 'Management-in-Living, Food & Nutrition, Biology, General Knowledge in Art / Chemistry',
        career_pathways: 'Dietetics & Nutrition, Hospitality Management, Fashion Design, Family & Consumer Sciences',
        order: 4,
      },
      {
        code: 'VIS',
        name: 'Visual Arts',
        department_name: 'Applied & Creative Sciences',
        description: 'Studio-driven curriculum developing design thinking, visual communication, sculpture, textiles, and cultural heritage craftsmanship.',
        core_subjects: 'English Language, Core Mathematics, Integrated Science, Social Studies',
        elective_subjects: 'General Knowledge in Art, Graphic Design, Picture Making, Textiles / Sculpture',
        career_pathways: 'Architecture, Graphic & Product Design, Fine Arts, Media Production',
        order: 5,
      },
    ];

    for (const p of programmes) {
      await db.execute(
        `INSERT INTO admission_programmes (code, name, department_name, description, core_subjects, elective_subjects, career_pathways, is_accepting_applications, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [p.code, p.name, p.department_name, p.description, p.core_subjects, p.elective_subjects, p.career_pathways, p.order]
      );
    }
  }

  const reqCount = await db.queryOne('SELECT COUNT(*) as total FROM admission_requirements');
  if ((reqCount?.total ?? 0) === 0) {
    const reqs = [
      { title: 'Recent Passport-Size Photograph', category: 'Mandatory Document', description: 'Clear recent passport photograph of the applicant against a plain background (JPG or PNG).', mandatory: 1, key: 'passport_photo', order: 1 },
      { title: 'BECE Result Slip / Latest JHS Terminal Report', category: 'Mandatory Document', description: 'Official BECE result slip (where issued) or most recent certified Junior High School academic transcript (PDF, JPG, or PNG).', mandatory: 1, key: 'academic_record', order: 2 },
      { title: 'Birth Certificate or National ID', category: 'Supporting Document', description: 'Copy of applicant’s birth certificate or recognized identity record for age verification.', mandatory: 0, key: 'birth_certificate', order: 3 },
      { title: 'Previous School Conduct / Transfer Letter', category: 'Supporting Document', description: 'Optional testimonial or transfer letter for continuing or transfer students.', mandatory: 0, key: 'supporting_document', order: 4 },
      { title: 'Direct School Assessment & Interview', category: 'Admission Policy', description: 'As an accredited private SHS, NAVS conducts a direct school placement review and candidate interview rather than relying solely on automated placement.', mandatory: 0, key: null, order: 5 },
    ];
    for (const r of reqs) {
      await db.execute(
        `INSERT INTO admission_requirements (title, category, description, is_mandatory_document, document_key, display_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [r.title, r.category, r.description, r.mandatory, r.key, r.order]
      );
    }
  }

  const deptCount = await db.queryOne('SELECT COUNT(*) as total FROM academic_departments');
  if ((deptCount?.total ?? 0) === 0) {
    const depts = [
      { name: 'Science & Mathematics', hod: '[Configure HOD in Admin]', overview: 'Dedicated to experimental inquiry, laboratory discipline, and analytical problem solving across physical, biological, and mathematical sciences.', subjects: 'Physics, Chemistry, Biology, Integrated Science, Core & Elective Mathematics', order: 1 },
      { name: 'Humanities & Languages', hod: '[Configure HOD in Admin]', overview: 'Fosters critical reading, persuasive writing, historical perspective, and civic understanding.', subjects: 'English Language, Literature-in-English, French, History, Government, Social Studies, CRS', order: 2 },
      { name: 'Business & Commerce', hod: '[Configure HOD in Admin]', overview: 'Equips learners with accounting precision, economic reasoning, and ethical enterprise management.', subjects: 'Financial Accounting, Cost Accounting, Business Management, Economics', order: 3 },
      { name: 'Applied & Creative Sciences', hod: '[Configure HOD in Admin]', overview: 'Integrates studio craft, nutrition science, and practical household management for creative and vocational mastery.', subjects: 'General Knowledge in Art, Graphic Design, Management-in-Living, Food & Nutrition', order: 4 },
    ];
    for (const d of depts) {
      await db.execute(
        'INSERT INTO academic_departments (name, head_of_department, overview, subjects_summary, display_order) VALUES (?, ?, ?, ?, ?)',
        [d.name, d.hod, d.overview, d.subjects, d.order]
      );
    }
  }

  const staffCount = await db.queryOne('SELECT COUNT(*) as total FROM staff');
  if ((staffCount?.total ?? 0) === 0) {
    const staffEntries = [
      { name: '[Head of School — Configure in Admin]', pos: 'Headmaster / Headmistress', dept: 'School Leadership', cat: 'Management', bio: 'Provides overall academic, pastoral, and administrative leadership for NAVS Senior High School. Update profile and portrait from the Administrator Dashboard.', order: 1 },
      { name: '[Assistant Head Academic — Configure in Admin]', pos: 'Assistant Head (Academics)', dept: 'Academic Affairs', cat: 'Management', bio: 'Coordinates curriculum delivery, WASSCE examination readiness, and departmental supervision across all programmes.', order: 2 },
      { name: '[Senior Housemaster / Mistress — Configure in Admin]', pos: 'Senior Housemaster / Dean of Students', dept: 'Student Welfare', cat: 'Management', bio: 'Oversees student discipline, pastoral care, clubs, and campus residential life.', order: 3 },
      { name: '[Admissions Coordinator — Configure in Admin]', pos: 'Admissions Officer', dept: 'Admissions Registry', cat: 'Administration', bio: 'Guides prospective families through direct applications, document verification, and student orientation.', order: 4 },
    ];
    for (const s of staffEntries) {
      await db.execute(
        'INSERT INTO staff (full_name, position, department, category, biography, photo_url, is_public, display_order) VALUES (?, ?, ?, ?, ?, NULL, 1, ?)',
        [s.name, s.pos, s.dept, s.cat, s.bio, s.order]
      );
    }
  }

  const catCount = await db.queryOne('SELECT COUNT(*) as total FROM gallery_categories');
  if ((catCount?.total ?? 0) === 0) {
    const categories = [
      { name: 'School Campus', slug: 'school-campus', desc: 'Main academic courtyard, lecture blocks, and landscaped grounds.', order: 1 },
      { name: 'Laboratories', slug: 'laboratories', desc: 'Science practical sessions and laboratory facilities.', order: 2 },
      { name: 'Library', slug: 'library', desc: 'Quiet reading rooms, reference collections, and study spaces.', order: 3 },
      { name: 'Sports', slug: 'sports', desc: 'Athletics track, football pitch, and inter-house competitions.', order: 4 },
      { name: 'School Ceremonies', slug: 'school-ceremonies', desc: 'Assemblies, speech days, and cultural gatherings.', order: 5 },
    ];
    for (const c of categories) {
      await db.execute(
        'INSERT INTO gallery_categories (name, slug, description, display_order) VALUES (?, ?, ?, ?)',
        [c.name, c.slug, c.desc, c.order]
      );
    }

    const catRows = await db.query('SELECT id, slug FROM gallery_categories');
    const bySlug = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

    const gallerySeeds = [
      { cat: 'school-campus', title: 'Main Academic Quadrangle', caption: 'Central courtyard and classroom wings at NAVS Senior High School.', url: '/src/assets/images/hero_navs_campus_1795530807594.jpg', featured: 1 },
      { cat: 'laboratories', title: 'Science & Microscopy Practicals', caption: 'Supervised laboratory investigations in Chemistry and Biology.', url: '/src/assets/images/science_lab_ghana_1795530806869.jpg', featured: 1 },
      { cat: 'library', title: 'Central Reading Hall & Library', caption: 'Quiet individual and group study facility stocked with core reference texts.', url: '/src/assets/images/school_library_study_1795530807696.jpg', featured: 1 },
      { cat: 'sports', title: 'Athletics Track & Sports Complex', caption: 'Outdoor sports pitch and 8-lane track for physical education and inter-house athletics.', url: '/src/assets/images/sports_athletics_field_1795530808515.jpg', featured: 1 },
      { cat: 'school-ceremonies', title: 'Great Assembly & Cultural Hall', caption: 'Venue for morning assemblies, academic lectures, and Speech & Prize-Giving Days.', url: '/src/assets/images/campus_assembly_hall_1795530808668.jpg', featured: 1 },
    ];
    for (const g of gallerySeeds) {
      if (bySlug[g.cat]) {
        await db.execute(
          'INSERT INTO gallery_images (category_id, title, caption, image_url, is_featured) VALUES (?, ?, ?, ?, ?)',
          [bySlug[g.cat], g.title, g.caption, g.url, g.featured]
        );
      }
    }
  }

  const newsCount = await db.queryOne('SELECT COUNT(*) as total FROM news_articles');
  if ((newsCount?.total ?? 0) === 0) {
    const articles = [
      {
        slug: 'admissions-open-2026-2027-academic-year',
        title: 'Online Admissions Now Open for the 2026/2027 Academic Year',
        category: 'Admissions',
        summary: 'Prospective SHS 1 and transfer applicants can now submit applications online and track their review progress with an official reference number.',
        content: 'NAVS Senior High School has officially opened its online admissions portal for the 2026/2027 academic intake across General Science, General Arts, Business, Home Economics, and Visual Arts.\n\nParents, guardians, and prospective students may complete the structured digital application form, upload supporting documents securely, and receive an immediate application reference number for real-time status tracking.\n\nPlease note that this announcement may be edited or replaced by school administrators directly from the Content Management section of the dashboard.',
        image_url: '/src/assets/images/hero_navs_campus_1795530807594.jpg',
      },
      {
        slug: 'science-laboratory-practical-orientation',
        title: 'Enhanced Laboratory Practical Sessions for Senior High Science Students',
        category: 'Academics',
        summary: 'Updated laboratory schedules ensure weekly hands-on Chemistry, Biology, and Physics practical sessions ahead of WASSCE preparations.',
        content: 'Our Science & Mathematics Department has expanded weekly practical rotation blocks to reinforce classroom theory with supervised laboratory experiments.\n\nStudents receive guided training in experimental observation, apparatus safety, and quantitative reporting. School administrators can update academic notices and attach official term circulars from the dashboard.',
        image_url: '/src/assets/images/science_lab_ghana_1795530806869.jpg',
      },
      {
        slug: 'pta-consultative-forum-notice',
        title: 'Notice of Parent-Teacher Association (PTA) Consultative Meeting',
        category: 'PTA Information',
        summary: 'Parents and guardians are invited to review term calendars, student welfare initiatives, and academic support plans.',
        content: 'The School Management and PTA Executive invite all parents and guardians to our upcoming consultative meeting in the Great Assembly Hall.\n\nAgenda items include academic progress tracking, boarding and day-student welfare standards, and upcoming co-curricular events. Administrators may edit the specific date, time, and minutes via the News Manager.',
        image_url: '/src/assets/images/campus_assembly_hall_1795530808668.jpg',
      },
    ];
    for (const n of articles) {
      await db.execute(
        'INSERT INTO news_articles (slug, title, category, summary, content, image_url, is_published) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [n.slug, n.title, n.category, n.summary, n.content, n.image_url]
      );
    }
  }

  const eventCount = await db.queryOne('SELECT COUNT(*) as total FROM events');
  if ((eventCount?.total ?? 0) === 0) {
    const events = [
      {
        title: 'Prospective Parents & Applicants Open Campus Day',
        category: 'Admissions',
        event_date: '2026-12-12 09:30:00',
        end_time: '14:00 GMT',
        location: 'Main Academic Quadrangle & Assembly Hall',
        description: 'Guided campus tour of classrooms, science laboratories, library, and admissions registry desk for prospective families.',
        image_url: '/src/assets/images/hero_navs_campus_1795530807594.jpg',
      },
      {
        title: 'Annual Inter-House Athletics & Sports Meet',
        category: 'Sports',
        event_date: '2027-02-20 08:00:00',
        end_time: '16:00 GMT',
        location: 'NAVS Athletics Track & Sports Field',
        description: 'Track and field events, football finals, and house spirit competitions uniting students, staff, and parents.',
        image_url: '/src/assets/images/sports_athletics_field_1795530808515.jpg',
      },
      {
        title: 'Academic Orientation & Reading Week',
        category: 'Academic',
        event_date: '2026-10-15 09:00:00',
        end_time: '15:00 GMT',
        location: 'Central Reading Hall & Library',
        description: 'Orientation workshop introducing incoming SHS 1 students to study skills, library resources, and academic integrity standards.',
        image_url: '/src/assets/images/school_library_study_1795530807696.jpg',
      },
    ];
    for (const e of events) {
      await db.execute(
        'INSERT INTO events (title, category, event_date, end_time, location, description, image_url, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [e.title, e.category, e.event_date, e.end_time, e.location, e.description, e.image_url]
      );
    }
  }

  const faqCount = await db.queryOne('SELECT COUNT(*) as total FROM faqs');
  if ((faqCount?.total ?? 0) === 0) {
    const faqs = [
      { category: 'Admissions', q: 'How do I apply to NAVS Senior High School?', a: 'Complete the Online Admission Application form under Admissions -> Apply Online, upload the required supporting documents, and retain your generated Reference Number and Verification Code.', order: 1 },
      { category: 'Admissions', q: 'Does NAVS require CSSPS placement only?', a: 'NAVS Senior High School is a private senior high school and operates a direct school admission and assessment workflow. Applicants should check current intake guidelines on the Admissions page.', order: 2 },
      { category: 'Admissions', q: 'How can I track my admission application status?', a: 'Visit the Track Application page and enter your unique Application Reference Number together with either your registered guardian email address or verification code.', order: 3 },
      { category: 'Academics', q: 'Which senior high school programmes are offered?', a: 'NAVS offers General Science, General Arts, Business, Home Economics, and Visual Arts aligned with the national senior high school curriculum.', order: 4 },
      { category: 'Privacy', q: 'How is applicant and student data protected?', a: 'Uploaded documents are stored in restricted non-public storage accessible only to authorized Admissions Officers and Super Administrators, with parental/guardian consent collected in alignment with Ghana’s Data Protection Act, 2012 (Act 843).', order: 5 },
    ];
    for (const f of faqs) {
      await db.execute(
        'INSERT INTO faqs (category, question, answer, display_order, is_published) VALUES (?, ?, ?, ?, 1)',
        [f.category, f.q, f.a, f.order]
      );
    }
  }

  const resCount = await db.queryOne('SELECT COUNT(*) as total FROM academic_resources');
  if ((resCount?.total ?? 0) === 0) {
    await db.execute(
      'INSERT INTO academic_resources (title, category, description, file_url, is_public) VALUES (?, ?, ?, ?, 1)',
      [
        'NAVS Admissions Prospectus & Guidelines (Printable)',
        'Admissions',
        'Complete overview of programmes, eligibility requirements, document checklist, and direct admission steps.',
        '/api/public/resources/prospectus',
      ]
    );
    await db.execute(
      'INSERT INTO academic_resources (title, category, description, file_url, is_public) VALUES (?, ?, ?, ?, 1)',
      [
        '2026/2027 Academic Programmes & Subject Guide',
        'Academics',
        'Detailed breakdown of core and elective subjects across all five senior high school tracks.',
        '/api/public/resources/curriculum-guide',
      ]
    );
  }
}

export async function initializeDatabase() {
  fs.mkdirSync(env.uploadStorageDir, { recursive: true });
  fs.mkdirSync(env.publicMediaDir, { recursive: true });

  const db = getDb();

  const schemaFile =
    db.driver === 'mysql' ? 'schema.mysql.sql' : 'schema.sqlite.sql';

  // Resolve database schema relative to this file, not the terminal directory.
  const schemaPath = new URL(
    `../../database/${schemaFile}`,
    import.meta.url
  );

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  await db.execRaw(schemaSql);
  await seedRolesAndPermissions(db);
  await seedBootstrapEnvAdmin(db);
  await seedInitialContent(db);
}