# NAVS Senior High School — Official Website & Digital Admissions System

Full-stack web platform and online admissions management system for **NAVS Senior High School** (Ghana), featuring a configurable public website, direct school online application workflow, document upload vault, application status tracker, and role-based administrator dashboard.

---

## 1. Architecture & Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router, React Hook Form, Lucide React
- **Backend**: Node.js, Express, JWT (`HttpOnly` cookie + `Authorization: Bearer` support), `bcryptjs`, Zod, Multer (magic-byte file verification), Helmet, CORS, Rate Limiting, Nodemailer
- **Database**: Relational SQL supporting **MySQL 8 / TiDB Cloud** (`mysql2/promise`) with automatic zero-config local **SQLite** fallback (`data/navs.sqlite`) when TiDB/MySQL credentials are not configured

---

## 2. Local Development Setup

### Prerequisites
- Node.js 22+
- npm 10+

### Steps
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. (Optional) Configure TiDB Cloud / MySQL credentials in `.env` (leave blank to use the local relational SQLite database automatically).
4. Create your first Super Administrator account (or use the inline First-Run Setup screen at `/admin/login`):
   ```bash
   npm run create-admin -- --name "Head of School" --email "admin@navs.edu.gh" --password "YourStrongPassword123"
   ```
5. Start the full-stack development server (port 3000):
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3000` in your browser.

---

## 3. TiDB Cloud Database Setup

1. Create a free Serverless cluster on **TiDB Cloud** (`https://tidbcloud.com`).
2. Obtain your connection host, port (`4000`), username, password, and enable TLS.
3. Run the schema in `database/schema.mysql.sql` against your `navs_school` database (or let the server run it automatically on first startup!).
4. Set these variables in your backend environment (`.env` or Render Environment):
   ```env
   DB_HOST=gateway01.<region>.prod.aws.tidbcloud.com
   DB_PORT=4000
   DB_USER=<your_tidb_user>
   DB_PASSWORD=<your_tidb_password>
   DB_NAME=navs_school
   DB_SSL=true
   ```

---

## 4. Deployment Instructions

### Backend on Render
1. Create a new **Web Service** on Render connected to this repository.
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm run start`
4. Add environment variables:
   - `NODE_ENV=production`
   - `JWT_SECRET` (generate a 64-char random secret)
   - `FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app`
   - `APP_URL=https://your-render-service.onrender.com`
   - TiDB Cloud credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`)
   - Optional SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
   - Note: Attach a Render Persistent Disk mounted at `/opt/render/project/src/storage` so uploaded applicant documents persist across deploys (or configure S3/R2 object storage in `backend/src/middleware/upload.js` for stateless multi-instance scaling).

### Frontend on Vercel
1. Import the repository into Vercel.
2. **Framework Preset**: Vite
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Set Environment Variable:
   - `VITE_API_BASE_URL=https://your-render-service.onrender.com`
6. `vercel.json` handles SPA client-side routing rewrites automatically.

---

## 5. Testing Commands

- **Unit tests** (application reference generation, verification code hashing, CSV formula escaping, email templates):
  ```bash
  npm test
  ```
- **End-to-end API integration test** (while server is running on port 3000):
  ```bash
  node backend/scripts/test-api.js
  ```
- **JavaScript syntax & production build check**:
  ```bash
  npm run lint && npm run build
  ```

---

## 6. Project Structure

- `frontend/` — React + Vite + Tailwind CSS JavaScript application (`frontend/src/**/*.js`, `frontend/src/**/*.jsx`)
- `backend/` — Node.js + Express REST API, database initialization, SQL schemas, and operational scripts (`backend/src/**/*.js`)

---

## 7. Database Backup Guidance

- **TiDB Cloud**: Enable automated daily snapshots in the TiDB Cloud console and export logical backups via `mysqldump` or TiDB Dumpling.
- **Local SQLite**: Back up `data/navs.sqlite` and the `storage/admissions/` document directory together on an encrypted backup volume.
