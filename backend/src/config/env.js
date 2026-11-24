import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Ephemeral fallback in-memory secret if JWT_SECRET is not configured in env
const EPHEMERAL_JWT_SECRET = crypto.randomBytes(32).toString('hex');

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  frontendOrigin: process.env.FRONTEND_ORIGIN || process.env.APP_URL || 'http://localhost:3000',
  jwtSecret:
    process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16
      ? process.env.JWT_SECRET.trim()
      : EPHEMERAL_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  adminBootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || '',
  adminBootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD || '',
  adminBootstrapName: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || 'Super Administrator',

  // Database (MySQL / TiDB Cloud or SQLite fallback)
  databaseUrl: process.env.DATABASE_URL?.trim() || '',
  dbHost: process.env.DB_HOST?.trim() || '',
  dbPort: Number(process.env.DB_PORT || 4000),
  dbUser: process.env.DB_USER?.trim() || '',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME?.trim() || 'navs_school',
  dbSsl: process.env.DB_SSL !== 'false',

  // Storage directories (outside public static paths for admission documents)
  uploadStorageDir: path.resolve(process.cwd(), process.env.UPLOAD_STORAGE_DIR || 'storage/admissions'),
  publicMediaDir: path.resolve(process.cwd(), process.env.PUBLIC_MEDIA_DIR || 'storage/public-media'),

  // SMTP
  smtpHost: process.env.SMTP_HOST?.trim() || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER?.trim() || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM?.trim() || 'NAVS Admissions <admissions@example.edu.gh>',
};

export function isMysqlConfigured() {
  return Boolean(env.databaseUrl || (env.dbHost && env.dbUser));
}

export function isSmtpConfigured() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}
