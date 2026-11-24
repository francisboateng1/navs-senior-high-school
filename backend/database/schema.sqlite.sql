-- ==============================================================================
-- NAVS SENIOR HIGH SCHOOL - SQLITE RELATIONAL SCHEMA (Local/Preview Fallback)
-- Mirrors schema.mysql.sql for zero-config local execution when TiDB/MySQL env
-- variables are not configured.
-- ==============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS administrators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS administrator_role_assignments (
  administrator_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (administrator_id, role_id),
  FOREIGN KEY (administrator_id) REFERENCES administrators(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE,
  admissions_open INTEGER NOT NULL DEFAULT 1,
  application_deadline TEXT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admission_programmes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_subjects TEXT NOT NULL,
  elective_subjects TEXT NOT NULL,
  career_pathways TEXT NULL,
  is_accepting_applications INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admission_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  is_mandatory_document INTEGER NOT NULL DEFAULT 0,
  document_key TEXT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS applicants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NULL,
  nationality TEXT NOT NULL DEFAULT 'Ghanaian',
  residential_location TEXT NOT NULL,
  applicant_email TEXT NULL,
  applicant_phone TEXT NULL,
  previous_school TEXT NOT NULL,
  previous_exam_details TEXT NULL,
  bece_index_number TEXT NULL,
  exam_year TEXT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guardians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  relationship_to_applicant TEXT NOT NULL,
  telephone TEXT NOT NULL,
  email TEXT NOT NULL,
  residential_address TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admission_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_number TEXT NOT NULL UNIQUE,
  verification_code_hash TEXT NOT NULL,
  applicant_id INTEGER NOT NULL,
  guardian_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  programme_id INTEGER NOT NULL,
  second_choice_programme_id INTEGER NULL,
  admission_category TEXT NOT NULL DEFAULT 'Direct School Admission',
  boarding_preference TEXT NOT NULL DEFAULT 'Day',
  additional_notes TEXT NULL,
  consent_accepted INTEGER NOT NULL DEFAULT 0,
  consent_timestamp TEXT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted',
  applicant_public_note TEXT NULL,
  decision_date TEXT NULL,
  decided_by_admin_id INTEGER NULL,
  letter_generated_at TEXT NULL,
  submitted_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
  FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (programme_id) REFERENCES admission_programmes(id),
  FOREIGN KEY (second_choice_programme_id) REFERENCES admission_programmes(id),
  FOREIGN KEY (decided_by_admin_id) REFERENCES administrators(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS application_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  sha256_checksum TEXT NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admission_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  previous_status TEXT NULL,
  new_status TEXT NOT NULL,
  public_note TEXT NULL,
  changed_by_admin_id INTEGER NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_admin_id) REFERENCES administrators(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admission_internal_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  administrator_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (administrator_id) REFERENCES administrators(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS school_information (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL,
  updated_by_admin_id INTEGER NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academic_departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  head_of_department TEXT NULL,
  overview TEXT NOT NULL,
  subjects_summary TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Academic',
  biography TEXT NOT NULL,
  photo_url TEXT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS news_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT NULL,
  is_published INTEGER NOT NULL DEFAULT 1,
  published_at TEXT DEFAULT (datetime('now')),
  author_admin_id INTEGER NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Academic',
  event_date TEXT NOT NULL,
  end_time TEXT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NULL,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NULL,
  image_url TEXT NOT NULL,
  is_featured INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES gallery_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academic_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL DEFAULT 'Admissions',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contact_enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  admin_response_note TEXT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NULL,
  recipient_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  delivery_status TEXT NOT NULL,
  error_message TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  administrator_id INTEGER NULL,
  actor_email TEXT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  details TEXT NULL,
  ip_address TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (administrator_id) REFERENCES administrators(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_app_ref ON admission_applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_app_status ON admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
