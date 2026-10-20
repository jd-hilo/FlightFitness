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
const PORT = Number(process.env.SCREENSHOT_PORT || 4177);
const BASE = process.env.SCREENSHOT_BASE_URL || `http://127.0.0.1:${PORT}`;
const W = 430;
const H = 932;
const SCALE = 3;
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const SHOTS = [
  { file: '01_home.png', path: '/(tabs)', waitText: 'Good morning' },
  { file: '02_progress_verse.png', path: '/elite', waitText: 'ISAIAH 40:31' },
  { file: '03_workout_session.png', path: '/workout-session', waitText: 'Bench Press' },
  { file: '03b_rest_verse.png', path: '/workout-session?rest=1', waitText: 'Word for this rest' },
  { file: '04_faith.png', path: '/faith', waitText: 'Run With Perseverance' },
  { file: '04b_faith_completed.png', path: '/faith?reflection=completed', waitText: 'Completed today' },
  { file: '05_progress_full.png', path: '/elite', waitText: 'Devotionals', scrollTo: 'Devotionals' },
  { file: '05b_workout_insights.png', path: '/workout-insights/sw-upper-strength-a', waitText: 'Upper Strength' },
  { file: '06_intake_goal.png', path: '/fitness-goal', waitText: 'fitness goal' },
  { file: '06_intake_lifting.png', path: '/lifting', waitText: 'been lifting' },
  { file: '06_intake_faith.png', path: '/faith-tenure', waitText: 'been in faith' },
  { file: '06_sign_in.png', path: '/sign-in', waitText: 'Sign in with Apple' },
  { file: '07_train.png', path: '/train', waitText: 'Full Body Home', scrollTo: 'Full Body Home' },
  { file: '08_tabbar.png', path: '/(tabs)', waitText: 'Good morning' },
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

function runExpoExport() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['expo', 'export', '-p', 'web', '--output-dir', 'dist-screenshots'],
      {
        cwd: ROOT,
        env: { ...process.env, EXPO_PUBLIC_SCREENSHOT_MODE: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    let buf = '';
    const onData = (chunk) => {
      const text = chunk.toString();
      buf += text;
      process.stdout.write(text);
      if (buf.includes('Exported:')) {
        setTimeout(() => {
          child.kill('SIGTERM');
          resolve();
        }, 1500);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      if (buf.includes('Exported:')) resolve();
      else reject(new Error(`expo export exited ${code}`));
    });
    child.on('error', reject);
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
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const { readFile, stat } = await import('node:fs/promises');
      const candidates = [];
      if (!rel) {
        candidates.push(join(dir, 'index.html'));
      } else {
        const segs = rel.split('/');
        if (segs.length >= 2) {
          candidates.push(join(dir, segs[0], '[id].html'));
        }
        candidates.push(join(dir, rel), join(dir, `${rel}.html`), join(dir, rel, 'index.html'));
      }
      let filePath = null;
      for (const candidate of candidates) {
        try {
          const st = await stat(candidate);
          if (st.isDirectory()) {
            const idx = join(candidate, 'index.html');
            try {
              if ((await stat(idx)).isFile()) {
                filePath = idx;
                break;
              }
            } catch {
              // keep looking
            }
          } else if (st.isFile()) {
            filePath = candidate;
            break;
          }
        } catch {
          // keep looking
        }
      }
      if (!filePath) filePath = join(dir, 'index.html');
      try {
        let data = await readFile(filePath);
        const ext = filePath.split('.').pop();
        if (ext === 'html') {
          data = Buffer.from(
            data
              .toString('utf8')
              .replace(
                /<script src="(\/_expo\/static\/js\/web\/entry-[^"]+\.js)" defer><\/script>/g,
                '<script type="module" src="$1"></script>'
              )
          );
        }
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
        const headers = {
          'content-type': types[ext] || 'application/octet-stream',
        };
        if (ext === 'ttf' || ext === 'woff' || ext === 'woff2') {
          headers['access-control-allow-origin'] = '*';
        }
        res.writeHead(200, headers);
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      console.log(`Serving ${dir} on ${port}`);
      resolve(server);
    });
  });
}

async function waitReady(page, waitText) {
  try {
    await page.waitForFunction(() => window.__SCREENSHOT_READY__ === true, {
      timeout: 20_000,
    });
  } catch {
    console.warn('__SCREENSHOT_READY__ not set; capturing after fonts');
  }
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  if (waitText) {
    try {
      await page.waitForFunction(
        (needle) => (document.body?.innerText || '').includes(needle),
        waitText,
        { timeout: 12_000 }
      );
    } catch {
      const body = await page.evaluate(() => (document.body?.innerText || '').slice(0, 240));
      console.warn(`waitText "${waitText}" not found; body starts:`, body.replace(/\s+/g, ' '));
    }
  }
  await sleep(900);
}

async function hideOverlays(page) {
  await page.addStyleTag({
    content: `
      [data-expo-errors], #LogBox, iframe[src*="log-box"],
      div[id*="LogBox"], div[class*="LogBox"] { display: none !important; }
      html, body { background: #000 !important; overflow: hidden !important; }
      * { font-synthesis: none !important; -webkit-font-smoothing: antialiased !important; }
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
  if (process.env.SCREENSHOT_SKIP_EXPORT === '1') {
    console.log('Skipping export (SCREENSHOT_SKIP_EXPORT=1)');
  } else {
    console.log('Exporting static web build…');
    await runExpoExport();
  }

  const server = await serveDir(dist, PORT);
  console.log('Waiting for', `${BASE}/`);
  await waitForUrl(`${BASE}/`);
  console.log('Launching Chromium');

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
  const failed = [];
  const pageErrors = [];
  for (const shot of SHOTS) {
    const dest = join(OUT, shot.file);
    const page = await context.newPage();
    page.on('pageerror', (err) => {
      const msg = `${shot.file}: ${err.message}`;
      pageErrors.push(msg);
      console.warn('pageerror', msg);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.warn('console', shot.file, msg.text());
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    try {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await hideOverlays(page);
      await waitReady(page, shot.waitText);
      if (shot.scrollTo) await scrollToText(page, shot.scrollTo);
      await page.screenshot({ path: dest, type: 'png' });
      console.log('captured', dest);
    } catch (err) {
      failed.push(`${shot.file}: ${err instanceof Error ? err.message : String(err)}`);
      console.error('FAILED', shot.file, err);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
  server.close();

  copyFileSync(join(ROOT, 'assets/images/header-logo.png'), join(OUT, 'logo_header.png'));
  copyFileSync(join(ROOT, 'assets/images/icon.png'), join(OUT, 'logo_icon.png'));
  writeFileSync(join(OUT, 'theme.json'), JSON.stringify(THEME, null, 2));
  if (pageErrors.length) {
    writeFileSync(join(OUT, 'page-errors.txt'), pageErrors.join('\n'));
  }

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
