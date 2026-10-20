#!/usr/bin/env node
/**
 * Capture App Store PNGs from the screenshot harness.
 * Requires EXPO_PUBLIC_SCREENSHOT_MODE=1 in the served bundle.
 */
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.SCREENSHOT_OUT || '/opt/cursor/artifacts';
const PORT = Number(process.env.SCREENSHOT_PORT || 4173);
const BASE = process.env.SCREENSHOT_BASE_URL || `http://127.0.0.1:${PORT}`;
const W = 430;
const H = 932;
const SCALE = 3;
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const SHOTS = [
  { file: '01_home.png', path: '/' },
  { file: '02_progress_verse.png', path: '/elite' },
  { file: '03_workout_session.png', path: '/workout-session' },
  { file: '03b_rest_verse.png', path: '/workout-session?rest=1' },
  { file: '04_faith.png', path: '/faith' },
  { file: '04b_faith_completed.png', path: '/faith?reflection=completed' },
  { file: '05_progress_full.png', path: '/elite', scrollTo: 'Devotionals' },
  { file: '05b_workout_insights.png', path: '/workout-insights/sw-upper-strength-a' },
  { file: '06_intake_goal.png', path: '/fitness-goal' },
  { file: '06_intake_lifting.png', path: '/lifting' },
  { file: '06_intake_faith.png', path: '/faith-tenure' },
  { file: '06_sign_in.png', path: '/sign-in' },
  { file: '07_train.png', path: '/train', scrollTo: 'Full Body Home' },
  { file: '08_tabbar.png', path: '/' },
];

const THEME = {
  colors: {
    background: '#000000',
    onBackground: '#F2F2F2',
    surface: '#000000',
    surfaceContainer: '#121212',
    surfaceContainerLow: '#0E0E0E',
    surfaceContainerHigh: '#1C1C1E',
    surfaceVariant: '#2A2A2C',
    onSurface: '#F2F2F2',
    onSurfaceVariant: '#9A9A9F',
    outline: 'rgba(255,255,255,0.10)',
    outlineStrong: 'rgba(255,255,255,0.18)',
    glass: 'rgba(255,255,255,0.06)',
    glassStrong: 'rgba(255,255,255,0.10)',
    glassEdge: 'rgba(255,255,255,0.12)',
    gold: '#EBD5AE',
    goldDim: '#D9BF93',
    goldSoft: 'rgba(235,213,174,0.14)',
    orange: '#FFA500',
    champagne: '#EBD5AE',
    champagneSoft: 'rgba(235,213,174,0.16)',
    onChampagne: '#1A1408',
    metricBlue: '#8EA3E8',
    metricGreen: '#9CC79A',
    metricPurple: '#B79BE0',
    onGold: '#1A1408',
    error: '#FF6B5E',
    inverseOnSurface: '#303030',
  },
  fonts: {
    headline: 'Inter_900Black',
    headlineBold: 'Inter_800ExtraBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    label: 'Inter_600SemiBold',
    labelBold: 'Inter_700Bold',
  },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

async function waitForUrl(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {
      // still booting
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function serveDir(dir, port) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      let filePath = join(dir, decodeURIComponent(url.pathname));
      if (filePath.endsWith('/')) filePath += 'index.html';
      const { readFile, stat } = await import('node:fs/promises');
      try {
        const st = await stat(filePath);
        if (st.isDirectory()) filePath = join(filePath, 'index.html');
        const data = await readFile(filePath);
        const ext = filePath.split('.').pop();
        const types = {
          html: 'text/html; charset=utf-8',
          js: 'text/javascript; charset=utf-8',
          css: 'text/css; charset=utf-8',
          json: 'application/json',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          webp: 'image/webp',
          svg: 'image/svg+xml',
          woff: 'font/woff',
          woff2: 'font/woff2',
          ttf: 'font/ttf',
        };
        res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        try {
          const html = await readFile(join(dir, 'index.html'));
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          res.end(html);
        } catch {
          res.writeHead(404);
          res.end('not found');
        }
      }
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function waitReady(page) {
  await page.waitForFunction(() => window.__SCREENSHOT_READY__ === true, {
    timeout: 45_000,
  });
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);
}

async function hideOverlays(page) {
  await page.addStyleTag({
    content: `
      [data-expo-errors], #LogBox, iframe[src*="log-box"],
      div[id*="LogBox"], div[class*="LogBox"] { display: none !important; }
      html, body { background: #000 !important; overflow: hidden !important; }
    `,
  });
}

async function scrollToText(page, text) {
  await page.evaluate((needle) => {
    const nodes = [...document.querySelectorAll('*')];
    const match = nodes.find((n) => n.childNodes.length && n.textContent?.trim() === needle);
    if (match) {
      match.scrollIntoView({ block: 'center', behavior: 'instant' });
      return;
    }
    const loose = nodes.find((n) => n.textContent?.includes(needle) && n.textContent.length < 80);
    loose?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, text);
  await sleep(400);
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const dist = join(ROOT, 'dist-screenshots');
  process.env.EXPO_PUBLIC_SCREENSHOT_MODE = '1';
  console.log('Exporting static web build…');
  await run('npx', ['expo', 'export', '-p', 'web', '--output-dir', 'dist-screenshots'], {
    cwd: ROOT,
    env: { ...process.env, EXPO_PUBLIC_SCREENSHOT_MODE: '1' },
  });

  const server = await serveDir(dist, PORT);
  await waitForUrl(`${BASE}/`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--font-render-hinting=none'],
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: SCALE,
    userAgent: UA,
    colorScheme: 'dark',
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'dark' });

  const failed = [];
  for (const shot of SHOTS) {
    const dest = join(OUT, shot.file);
    try {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await hideOverlays(page);
      await waitReady(page);
      if (shot.scrollTo) await scrollToText(page, shot.scrollTo);
      await page.screenshot({ path: dest, type: 'png' });
      console.log('captured', dest);
    } catch (err) {
      failed.push(`${shot.file}: ${err instanceof Error ? err.message : String(err)}`);
      console.error('FAILED', shot.file, err);
    }
  }

  await browser.close();
  server.close();

  copyFileSync(join(ROOT, 'assets/images/header-logo.png'), join(OUT, 'logo_header.png'));
  copyFileSync(join(ROOT, 'assets/images/icon.png'), join(OUT, 'logo_icon.png'));
  writeFileSync(join(OUT, 'theme.json'), JSON.stringify(THEME, null, 2));

  await run('python3', [join(ROOT, 'scripts/make-contact-sheet.py'), OUT]);

  if (failed.length) {
    writeFileSync(join(OUT, 'capture-failures.txt'), failed.join('\n'));
    console.error('Some captures failed:\n', failed.join('\n'));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
