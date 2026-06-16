import {
  app, BrowserWindow, shell, ipcMain,
  globalShortcut, Menu,
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { randomBytes } from 'crypto';
const _require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// ── Remove default menu (File / Edit / View…) ─────────────
Menu.setApplicationMenu(null);

// ── Load backend credentials BEFORE importing the backend ──
// The backend's config.ts uses `import 'dotenv/config'` which reads
// from process.cwd() — but Electron's CWD is the desktop package,
// not the backend package. We manually inject the vars here.
function loadBackendEnv() {
  const envPath = isDev
    ? path.resolve(__dirname, '../../backend/.env')           // dev: source tree
    : path.join(app.getAppPath(), 'extra', 'backend.env');    // prod: extra/

  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      // Only set if not already overridden by the OS environment
      if (!process.env[key]) process.env[key] = val;
    }
    console.log('✅ Backend .env loaded');
  } catch (err) {
    console.warn('⚠️  Could not load backend .env:', err);
  }
}

loadBackendEnv();

// Generate a local API token for backend→frontend authentication
const LOCAL_API_TOKEN = randomBytes(32).toString('hex');
process.env.LOCAL_API_TOKEN = LOCAL_API_TOKEN;

// Add extra/ to NODE_PATH so `@prisma/client` can resolve `.prisma/client`
// as a bare specifier when running from the packaged app (asar disabled).
const extraPath = isDev
  ? path.resolve(__dirname, '../extra')
  : path.join(app.getAppPath(), 'extra');
const existingPath = process.env.NODE_PATH || '';
process.env.NODE_PATH = existingPath
  ? `${extraPath}${path.delimiter}${existingPath}`
  : extraPath;
_require('module').Module._initPaths();

// ── Database setup ────────────────────────────────────────
const dbPath = isDev
  ? path.resolve(__dirname, '../prisma/streamforger.db')
  : path.join(app.getPath('userData'), 'streamforger.db');

// Ensure the directory for the database exists before Prisma connects
mkdirSync(path.dirname(dbPath), { recursive: true });

process.env.DATABASE_URL = `file:${dbPath}`;

// In production, the backend serves the frontend — redirect after OAuth must
// point to the embedded server, not the Vite dev server.
if (!isDev) {
  process.env.FRONTEND_URL = 'http://localhost:3000';
}

// ── Frontend dist path ────────────────────────────────────
// In production, the frontend dist is inside the asar at extra/frontend/dist
function getFrontendDistDir(): string {
  return isDev
    ? path.resolve(__dirname, '../../frontend/dist')
    : path.join(app.getAppPath(), 'extra', 'frontend', 'dist');
}

function getFrontendPath(...parts: string[]): string {
  return path.join(getFrontendDistDir(), ...parts);
}

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayIgnoreMouse = true;
let mainAlwaysOnTop = false;
let backendReady = false;

// ── Backend ───────────────────────────────────────────────
async function startBackend() {
  try {
    const { startServer } = await import('@streamforger/backend/dist/index.js');
    await startServer({ port: 3000, frontendDir: getFrontendDistDir() });
    backendReady = true;
    console.log('✅ Backend started — serving frontend at http://localhost:3000');
  } catch (err) {
    console.error('⚠️  Backend failed to start:', err instanceof Error ? err.message : err);
  }
}

// ── Main window ───────────────────────────────────────────
function createMainWindow() {
  const mainUrl = isDev
    ? 'http://localhost:5173'
    : 'http://localhost:3000';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: true,
    frame: false,
    backgroundColor: '#0a0a1a',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = ['http://localhost:3000', 'http://localhost:5173'];
    if (!allowed.some((prefix) => url.startsWith(prefix))) {
      event.preventDefault();
    }
  });

  // Try loadURL first; fall back to loadFile if backend isn't serving
  const tryLoadURL = (attempts = 5): void => {
    mainWindow!.loadURL(mainUrl).catch(() => {
      if (attempts <= 1) {
        console.warn('⚠️  loadURL failed, falling back to loadFile');
        mainWindow!.loadFile(getFrontendPath('index.html')).catch(() => {});
        return;
      }
      console.warn(`⚠️  loadURL failed, retrying in 1500ms… (${attempts - 1} left)`);
      setTimeout(() => tryLoadURL(attempts - 1), 1500);
    });
  };

  tryLoadURL();

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // F12 opens DevTools in any focused window (dev + production)
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools();
    }
  });
}

// ── Overlay window ────────────────────────────────────────
function createOverlayWindow(urlOrChannel: string, isUrl: boolean, theme?: string) {
  if (overlayWindow) overlayWindow.close();

  const overlayBaseUrl = isDev ? 'http://localhost:5173' : 'http://localhost:3000';
  const overlayUrl = isUrl
    ? urlOrChannel
    : `${overlayBaseUrl}/overlay.html?mode=chat&channel=${encodeURIComponent(urlOrChannel)}${theme ? `&theme=${encodeURIComponent(theme)}` : ''}`;

  overlayWindow = new BrowserWindow({
    width: 400,
    height: 600,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Posicionar la ventana a la derecha de la principal para que sea visible
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    overlayWindow.setPosition(bounds.x + bounds.width + 10, bounds.y);
  } else {
    overlayWindow.setPosition(100, 100);
  }

  overlayWindow.loadURL(overlayUrl).then(() => {
    overlayWindow?.show();
  }).catch((err) => {
    console.error('[overlay] Failed to load overlay URL:', err);
    // Mostrar la ventana aunque falle la carga para que no quede invisible
    overlayWindow?.show();
  });

  // Arranca con click-through desactivado para que el usuario pueda ver los controles e interactuar.
  // Puede bloquearlo con el botón 🔓 en la barra o con Ctrl+Shift+T.
  overlayWindow.setIgnoreMouseEvents(false);

  overlayWindow.webContents.on('did-finish-load', () => {
    overlayWindow?.webContents.insertCSS(`
      body { background: transparent !important; margin: 0; overflow: hidden; }
      html { background: transparent !important; }
      #overlay-root { background: transparent !important; width: 100vw; height: 100vh; }
      :root { --bg-alpha: 0.6; }
    `);
  });

  overlayWindow.webContents.on('will-navigate', (event, url) => {
    const overlayBase = isDev ? 'http://localhost:5173' : 'http://localhost:3000';
    if (!url.startsWith(overlayBase)) {
      event.preventDefault();
    }
  });

  // F12 opens DevTools in overlay window too
  overlayWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      overlayWindow?.webContents.toggleDevTools();
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    overlayIgnoreMouse = true;
  });
}

function toggleClickThrough() {
  if (!overlayWindow) return;
  overlayIgnoreMouse = !overlayIgnoreMouse;
  overlayWindow.setIgnoreMouseEvents(overlayIgnoreMouse, { forward: true });
}

// ── IPC ───────────────────────────────────────────────────

// Overlay controls
const TRUSTED_OVERLAY_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];

ipcMain.on('overlay:open', (_e, url: string, isUrl: boolean, theme?: string) => {
  if (isUrl && !TRUSTED_OVERLAY_ORIGINS.some((o) => url.startsWith(o))) {
    console.warn('[security] Blocked untrusted overlay URL:', url);
    return;
  }
  createOverlayWindow(url, isUrl, theme);
});
ipcMain.on('overlay:close', () => overlayWindow?.close());
ipcMain.handle('overlay:isOpen', () => overlayWindow !== null && !overlayWindow.isDestroyed());
ipcMain.on('overlay:toggleClickThrough', toggleClickThrough);
ipcMain.handle('overlay:getClickThrough', () => overlayIgnoreMouse);
ipcMain.on('overlay:setOpacity', (_e, v: number) => {
  if (!overlayWindow) return;
  const alpha = Math.max(0.1, Math.min(1, v));
  overlayWindow?.webContents.insertCSS(`:root { --bg-alpha: ${alpha}; }`);
});
ipcMain.on('overlay:resize', (_e, w: number, h: number) => {
  if (!overlayWindow) return;
  const bounds = overlayWindow.getBounds();
  overlayWindow.setBounds({ x: bounds.x, y: bounds.y, width: Math.max(200, w), height: Math.max(100, h) });
});
ipcMain.on('overlay:setPosition', (_e, x: number, y: number) => {
  overlayWindow?.setPosition(x, y);
});
ipcMain.handle('overlay:getBounds', () => overlayWindow?.getBounds() ?? null);
ipcMain.on('overlay:setAlwaysOnTop', (_e, value: boolean) => {
  overlayWindow?.setAlwaysOnTop(value, 'screen-saver');
});
ipcMain.handle('overlay:getAlwaysOnTop', () => overlayWindow?.isAlwaysOnTop() ?? false);
ipcMain.on('overlay:setFontSize', (_e, size: number) => {
  if (!overlayWindow) return;
  overlayWindow.webContents.executeJavaScript(`
    try {
      const raw = localStorage.getItem('streamforger-overlay-settings') || '{}';
      const s = JSON.parse(raw);
      s.fontSize = ${size};
      localStorage.setItem('streamforger-overlay-settings', JSON.stringify(s));
      window.dispatchEvent(new CustomEvent('overlay:settings', { detail: { fontSize: ${size} } }));
    } catch (e) { console.error('[overlay] setFontSize error:', e); }
  `).catch(() => {});
});
ipcMain.on('overlay:setFont', (_e, fontFamily: string) => {
  if (!overlayWindow) return;
  overlayWindow.webContents.executeJavaScript(`
    try {
      const raw = localStorage.getItem('streamforger-overlay-settings') || '{}';
      const s = JSON.parse(raw);
      s.fontFamily = ${JSON.stringify(fontFamily)};
      localStorage.setItem('streamforger-overlay-settings', JSON.stringify(s));
      window.dispatchEvent(new CustomEvent('overlay:settings', { detail: { fontFamily: ${JSON.stringify(fontFamily)} } }));
    } catch (e) { console.error('[overlay] setFont error:', e); }
  `).catch(() => {});
});
ipcMain.on('overlay:setBgMode', (_e, mode: string) => {
  if (!overlayWindow) return;
  overlayWindow.webContents.executeJavaScript(`
    try {
      const raw = localStorage.getItem('streamforger-overlay-settings') || '{}';
      const s = JSON.parse(raw);
      s.bgMode = ${JSON.stringify(mode)};
      localStorage.setItem('streamforger-overlay-settings', JSON.stringify(s));
      window.dispatchEvent(new CustomEvent('overlay:settings', { detail: { bgMode: ${JSON.stringify(mode)} } }));
    } catch (e) { console.error('[overlay] setBgMode error:', e); }
  `).catch(() => {});
});

// Auth: construct OAuth URL from env vars and open in default browser
ipcMain.on('auth:login', () => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) {
    console.warn('⚠️  TWITCH_CLIENT_ID not configured — open .env.example for instructions');
    return;
  }
  const redirectUri = process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/auth/callback';
  const scopes = [
    'chat:read', 'chat:edit',
    'channel:read:redemptions',
    'channel:manage:predictions', 'channel:read:predictions',
    'channel:manage:raids', 'channel:manage:moderators',
  ];

  const url =
    `https://id.twitch.tv/oauth2/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scopes.join('+')}` +
    `&state=${randomBytes(16).toString('hex')}`;

  shell.openExternal(url);
  console.log('🔗 OAuth URL opened in browser');

  // Re-focus the main window after the browser opens (prevents window from appearing minimized)
  setTimeout(() => {
    mainWindow?.focus();
    mainWindow?.show();
  }, 500);
});

// Local API token for backend auth
ipcMain.on('get-local-api-token', (event) => {
  event.returnValue = LOCAL_API_TOKEN;
});

// Backend readiness
ipcMain.handle('backend:isReady', () => backendReady);

// Main window — always-on-top toggle (para gestionar sobre el juego)
ipcMain.handle('window:getAlwaysOnTop', () => mainAlwaysOnTop);
ipcMain.on('window:setAlwaysOnTop', (_e, value: boolean) => {
  mainAlwaysOnTop = value;
  mainWindow?.setAlwaysOnTop(value, 'screen-saver');
});

// Main window — background opacity via CSS (text stays opaque)
ipcMain.on('window:setOpacity', (_e, value: number) => {
  if (!mainWindow) return;
  const alpha = Math.max(0.1, Math.min(1, value));
  mainWindow.webContents.insertCSS(`
    body > div:first-child { background: rgba(10,10,26,${alpha}) !important; }
  `);
});

// Main window drag / minimize / close
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:close',    () => mainWindow?.close());

// ── Lifecycle ─────────────────────────────────────────────

app.whenReady().then(async () => {
  globalShortcut.register('CommandOrControl+Shift+T', toggleClickThrough);

  // Load backend credentials, then start the backend, then open the window
  await startBackend();
  createMainWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});
