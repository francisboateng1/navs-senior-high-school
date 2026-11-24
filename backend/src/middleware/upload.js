import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env.js';

const ALLOWED_DOC_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sanitizeExtension(mime, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (mime === 'application/pdf' && ext === '.pdf') return '.pdf';
  if (mime === 'image/jpeg' && (ext === '.jpg' || ext === '.jpeg')) return '.jpg';
  if (mime === 'image/png' && ext === '.png') return '.png';
  if (mime === 'image/webp' && ext === '.webp') return '.webp';
  return '';
}

export function verifyFileMagicBytes(filePath, mimeType) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (bytesRead < 4) return false;

    if (mimeType === 'application/pdf') {
      return buf.subarray(0, 4).toString('ascii') === '%PDF';
    }
    if (mimeType === 'image/jpeg') {
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    }
    if (mimeType === 'image/webp') {
      return buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return false;
  } catch {
    return false;
  }
}

export function computeSha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function resolveSafeStoragePath(baseDir, filename) {
  const cleanName = path.basename(filename);
  const resolved = path.resolve(baseDir, cleanName);
  const normalizedBase = path.resolve(baseDir);
  if (!resolved.startsWith(normalizedBase + path.sep)) {
    return null;
  }
  return resolved;
}

const admissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(env.uploadStorageDir, { recursive: true });
    cb(null, env.uploadStorageDir);
  },
  filename: (_req, file, cb) => {
    const ext = sanitizeExtension(file.mimetype, file.originalname) || '.bin';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadAdmissionDocs = multer({
  storage: admissionStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
  fileFilter: (_req, file, cb) => {
    const ext = sanitizeExtension(file.mimetype, file.originalname);
    if (!ALLOWED_DOC_MIMES.has(file.mimetype) || !ext) {
      cb(new Error('Only PDF, JPG, and PNG files with matching extensions are permitted.'));
      return;
    }
    cb(null, true);
  },
});

const publicMediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(env.publicMediaDir, { recursive: true });
    cb(null, env.publicMediaDir);
  },
  filename: (_req, file, cb) => {
    const ext = sanitizeExtension(file.mimetype, file.originalname) || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadPublicMedia = multer({
  storage: publicMediaStorage,
  limits: {
    fileSize: 6 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = sanitizeExtension(file.mimetype, file.originalname);
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype) || !ext) {
      cb(new Error('Only JPG, PNG, and WEBP image files are permitted.'));
      return;
    }
    cb(null, true);
  },
});
