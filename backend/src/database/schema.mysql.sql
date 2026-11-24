-- ==============================================================================
-- NAVS SENIOR HIGH SCHOOL - MYSQL / TiDB CLOUD RELATIONAL SCHEMA
-- Compatible with MySQL 8.0+ and TiDB Cloud Serverless / Dedicated
-- ==============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(60) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS administrators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS administrator_role_assignments (
  administrator_id INT NOT NULL,
  role_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (administrator_id, role_id),
  CONSTRAINT fk_ara_admin FOREIGN KEY (administrator_id) REFERENCES administrators(id) ON DELETE CASCADE,
  CONSTRAINT fk_ara_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(40) NOT NULL UNIQUE,
  admissions_open TINYINT(1) NOT NULL DEFAULT 1,
  application_deadline DATE NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_programmes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  department_name VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  core_subjects TEXT NOT NULL,
  elective_subjects TEXT NOT NULL,
  career_pathways TEXT NULL,
  is_accepting_applications TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_requirements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  is_mandatory_document TINYINT(1) NOT NULL DEFAULT 0,
  document_key VARCHAR(60) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applicants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(30) NULL,
  nationality VARCHAR(80) NOT NULL DEFAULT 'Ghanaian',
  residential_location VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(190) NULL,
  applicant_phone VARCHAR(40) NULL,
  previous_school VARCHAR(200) NOT NULL,
  previous_exam_details VARCHAR(200) NULL,
  bece_index_number VARCHAR(60) NULL,
  exam_year VARCHAR(10) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_applicant_name (full_name),
  INDEX idx_applicant_bece (bece_index_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guardians (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  relationship_to_applicant VARCHAR(60) NOT NULL,
  telephone VARCHAR(40) NOT NULL,
  email VARCHAR(190) NOT NULL,
  residential_address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_guardian_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_number VARCHAR(32) NOT NULL UNIQUE,
  verification_code_hash VARCHAR(255) NOT NULL,
  applicant_id INT NOT NULL,
  guardian_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  programme_id INT NOT NULL,
  second_choice_programme_id INT NULL,
  admission_category VARCHAR(60) NOT NULL DEFAULT 'Day / Boarding',
  boarding_preference VARCHAR(40) NOT NULL DEFAULT 'Day',
  additional_notes TEXT NULL,
  consent_accepted TINYINT(1) NOT NULL DEFAULT 0,
  consent_timestamp TIMESTAMP NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'Submitted',
  applicant_public_note TEXT NULL,
  decision_date TIMESTAMP NULL,
  decided_by_admin_id INT NULL,
  letter_generated_at TIMESTAMP NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_guardian FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  CONSTRAINT fk_app_prog FOREIGN KEY (programme_id) REFERENCES admission_programmes(id),
  CONSTRAINT fk_app_prog2 FOREIGN KEY (second_choice_programme_id) REFERENCES admission_programmes(id),
  CONSTRAINT fk_app_decided_by FOREIGN KEY (decided_by_admin_id) REFERENCES administrators(id) ON DELETE SET NULL,
  INDEX idx_app_ref (reference_number),
  INDEX idx_app_status (status),
  INDEX idx_app_submitted (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  document_type VARCHAR(80) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes INT NOT NULL,
  sha256_checksum VARCHAR(64) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_app FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE CASCADE,
  INDEX idx_doc_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  previous_status VARCHAR(60) NULL,
  new_status VARCHAR(60) NOT NULL,
  public_note TEXT NULL,
  changed_by_admin_id INT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_app FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_admin FOREIGN KEY (changed_by_admin_id) REFERENCES administrators(id) ON DELETE SET NULL,
  INDEX idx_hist_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_internal_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  administrator_id INT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_note_app FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_note_admin FOREIGN KEY (administrator_id) REFERENCES administrators(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_information (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'general',
  label VARCHAR(140) NOT NULL,
  updated_by_admin_id INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  head_of_department VARCHAR(140) NULL,
  overview TEXT NOT NULL,
  subjects_summary TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  position VARCHAR(140) NOT NULL,
  department VARCHAR(140) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Academic',
  biography TEXT NOT NULL,
  photo_url VARCHAR(255) NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(220) NOT NULL,
  category VARCHAR(80) NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(255) NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  author_admin_id INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_news_published (is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Academic',
  event_date DATETIME NOT NULL,
  end_time VARCHAR(40) NULL,
  location VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(255) NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  caption VARCHAR(255) NULL,
  image_url VARCHAR(255) NOT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gal_cat FOREIGN KEY (category_id) REFERENCES gallery_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(80) NOT NULL DEFAULT 'Admissions',
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_enquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_name VARCHAR(150) NOT NULL,
  sender_email VARCHAR(190) NOT NULL,
  sender_phone VARCHAR(40) NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'New',
  admin_response_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NULL,
  recipient_email VARCHAR(190) NOT NULL,
  template_key VARCHAR(80) NOT NULL,
  subject VARCHAR(220) NOT NULL,
  body TEXT NOT NULL,
  delivery_status VARCHAR(60) NOT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_app FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  administrator_id INT NULL,
  actor_email VARCHAR(190) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  details TEXT NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (administrator_id) REFERENCES administrators(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
