import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OVERLAYS_DIR = path.join(ROOT, 'packages/frontend/public/overlays');
const THUMBS_DIR = path.join(ROOT, 'packages/frontend/public/thumbnails');
const FRONTEND_DIR = path.join(ROOT, 'packages/frontend');
const PORT = 5199; // avoid conflicts with dev server

if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });

const STANDALONE_FILES = fs.readdirSync(OVERLAYS_DIR)
  .filter(f => f.endsWith('.html') && !f.startsWith('overlay.html'))
  .sort();

let viteProcess = null;

function startVite() {
  return new Promise((resolve, reject) => {
    viteProcess = spawn('npx.cmd', ['vite', '--port', String(PORT), '--strictPort'], {
      cwd: FRONTEND_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    let started = false;
    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (!started && text.includes('Local:')) {
        started = true;
        setTimeout(resolve, 1000);
      }
    };
    viteProcess.stdout.on('data', onData);
    viteProcess.stderr.on('data', onData);
    viteProcess.on('error', reject);
    setTimeout(() => { if (!started) resolve(); }, 15000);
  });
}

async function takeScreenshot(page, url, id) {
  const outputPath = path.join(THUMBS_DIR, `${id}.png`);
  if (fs.existsSync(outputPath)) {
    console.log(`  SKIP ${id} (exists)`);
    return;
  }
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`  OK   ${id}`);
  } catch (err) {
    console.log(`  FAIL ${id} (${err.message})`);
  }
}

async function main() {
  console.log('Starting Vite dev server...');
  await startVite();
  console.log('Vite ready.');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 320, height: 180, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();

  const base = `http://localhost:${PORT}`;

  for (const file of STANDALONE_FILES) {
    const id = file.replace(/\.html$/, '');
    const url = `${base}/overlays/${file}?channel=demo`;
    await takeScreenshot(page, url, id);
  }

  // Also screenshot overlays using overlay.html?mode=
  const modeOverlays = [
    'chat', 'custom', 'giveaway', 'prediction', 'social', 'hud', 'timer', 'scoreboard',
  ];
  for (const mode of modeOverlays) {
    const url = `${base}/overlay.html?mode=${mode}&channel=demo`;
    await takeScreenshot(page, url, mode);
  }

  await browser.close();
  if (viteProcess) viteProcess.kill();

  // Write a JSON mapping
  const mapping = {};
  for (const file of fs.readdirSync(THUMBS_DIR).filter(f => f.endsWith('.png'))) {
    mapping[path.parse(file).name] = `/thumbnails/${file}`;
  }
  fs.writeFileSync(path.join(THUMBS_DIR, '_registry.json'), JSON.stringify(mapping, null, 2));
  console.log(`\nDone. ${Object.keys(mapping).length} thumbnails generated.`);
}

main().catch(err => { console.error(err); process.exit(1); });
