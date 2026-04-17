/**
 * Post-build pre-rendering script.
 *
 * Launches a static server on the dist/ folder, visits each public route
 * with Puppeteer, and saves the fully-rendered HTML so search engine
 * crawlers that don't execute JS can still index the content.
 *
 * Usage:  node scripts/prerender.mjs
 * Called automatically by:  npm run build
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join, extname } from 'path';
import puppeteer from 'puppeteer';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const PORT = 4199;
const ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/knowledge-base',
  '/knowledge-base/car-breakdown-what-to-do',
  '/knowledge-base/flat-tire-repair-guide',
  '/knowledge-base/car-battery-dead-jump-start',
  '/knowledge-base/engine-overheating-causes-solutions',
  '/knowledge-base/brake-warning-signs',
  '/knowledge-base/oil-change-guide',
  '/knowledge-base/car-ac-not-cooling',
  '/knowledge-base/strange-car-noises-diagnosis',
  '/knowledge-base/pre-trip-vehicle-checklist',
  '/knowledge-base/when-to-call-mechanic-vs-diy',
];

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

// Tiny static file server for the dist folder
function startServer() {
  return new Promise((ok) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST, req.url === '/' ? 'index.html' : req.url);
      try {
        const data = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      } catch {
        // SPA fallback — serve index.html for client-side routes
        const html = readFileSync(join(DIST, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      }
    });
    server.listen(PORT, () => ok(server));
  });
}

async function prerender() {
  console.log('Pre-rendering public routes...');

  const server = await startServer();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  for (const route of ROUTES) {
    const page = await browser.newPage();
    const url = `http://localhost:${PORT}${route}`;
    console.log(`  Rendering ${route}`);

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait a bit for React to finish rendering
    await page.waitForSelector('[data-reactroot], #root > *', { timeout: 5000 }).catch(() => {});

    let html = await page.content();

    // Inject prerender meta tag
    html = html.replace('</head>', '<meta name="prerender-status-code" content="200" />\n</head>');

    // Remove Vite HMR / dev scripts if any leaked
    html = html.replace(/<script type="module" src="\/@vite\/client"><\/script>/g, '');
    html = html.replace(/<script type="module"[^>]*@react-refresh[^<]*<\/script>/g, '');

    // Write the pre-rendered HTML
    const outDir = route === '/' ? DIST : join(DIST, route);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html);
    console.log(`  Saved ${join(outDir, 'index.html')}`);

    await page.close();
  }

  await browser.close();
  server.close();
  console.log(`Pre-rendered ${ROUTES.length} routes.`);
}

prerender().catch((err) => {
  console.error('Pre-render failed:', err);
  process.exit(1);
});
