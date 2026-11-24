import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { getDb } from './config/db.js';
import { initializeDatabase } from './database/init.js';
import publicRoutes from './routes/publicRoutes.js';
import admissionsRoutes from './routes/admissionsRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminAdmissionsRoutes from './routes/adminAdmissionsRoutes.js';
import adminContentRoutes from './routes/adminContentRoutes.js';
import adminUsersRoutes from './routes/adminUsersRoutes.js';

async function bootstrap() {
  await initializeDatabase();

  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const allowed = new Set([
          env.frontendOrigin,
          env.appUrl,
          'http://localhost:3000',
          'http://localhost:5173',
        ]);
        if (allowed.has(origin) || origin.endsWith('.run.app') || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use('/media', express.static(env.publicMediaDir, { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => {
    const db = getDb();
    res.json({ status: 'ok', databaseDriver: db.driver });
  });

  app.get('/robots.txt', (req, res) => {
    const base = env.appUrl || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    const base = env.appUrl || `${req.protocol}://${req.get('host')}`;
    const staticPaths = [
      '/',
      '/about',
      '/academics',
      '/admissions',
      '/admissions/apply',
      '/admissions/track',
      '/student-life',
      '/news',
      '/events',
      '/gallery',
      '/staff',
      '/contact',
      '/privacy',
    ];
    let newsSlugs = [];
    try {
      newsSlugs = await getDb().query('SELECT slug FROM news_articles WHERE is_published = 1');
    } catch {
      newsSlugs = [];
    }
    const urls = [...staticPaths, ...newsSlugs.map((n) => `/news/${n.slug}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${base}${u}</loc></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  app.use('/api/public', publicRoutes);
  app.use('/api/admissions', admissionsRoutes);
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/admin/admissions', adminAdmissionsRoutes);
  app.use('/api/admin/content', adminContentRoutes);
  app.use('/api/admin/users', adminUsersRoutes);

  app.use('/api', (err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    res.status(400).json({ error: message });
  });

  if (!env.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`NAVS Senior High School server running on http://0.0.0.0:${env.port} (${env.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
