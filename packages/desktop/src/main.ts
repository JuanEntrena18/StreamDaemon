import {
  app, BrowserWindow, shell, ipcMain,
  globalShortcut, Menu,
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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
    ? path.resolve(__dirname, '../../backend/.env')       // dev: source tree
    : path.join(process.resourcesPath, 'backend.env');   // prod: extraResources

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

// ── Database setup ────────────────────────────────────────
const dbPath = isDev
  ? path.resolve(__dirname, '../prisma/streamforger.db')
  : path.join(app.getPath('userData'), 'streamforger.db');

process.env.DATABASE_URL = `file:${dbPath}`;

// In production, the backend serves the frontend — redirect after OAuth must
// point to the embedded server, not the Vite dev server.
if (!isDev) {
  process.env.FRONTEND_URL = 'http://localhost:3000';
}

// ── Frontend dist path ────────────────────────────────────
// In production, extraResources copies frontend/dist → resources/frontend/dist
function getFrontendDistDir(): string {
  return isDev
    ? path.resolve(__dirname, '../../frontend/dist')
    : path.join(process.resourcesPath, 'frontend', 'dist');
}

function getFrontendPath(...parts: string[]): string {
  return path.join(getFrontendDistDir(), ...parts);
}

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayIgnoreMouse = true;
let mainAlwaysOnTop = false;

// ── Backend ───────────────────────────────────────────────
async function startBackend() {
  try {
    const { startServer } = await import('@streamforger/backend/dist/index.js');
    // Pass frontendDir so the backend serves overlay.html at localhost:3000
    // This makes OBS Browser Source URLs work in production.
    await startServer({ port: 3000, frontendDir: getFrontendDistDir() });
    console.log('✅ Backend started — serving frontend at http://localhost:3000');
  } catch (err) {
    console.error('⚠️  Backend failed to start:', err);
  }
}

// ── Main window ───────────────────────────────────────────
function loadWithRetry(win: BrowserWindow, url: string, attempts = 5, delay = 2000): void {
  win.loadURL(url).catch((err) => {
    if (attempts <= 1) { win.show(); return; }
    console.warn(`⚠️  loadURL failed, retrying in ${delay}ms… (${attempts - 1} left)`);
    setTimeout(() => loadWithRetry(win, url, attempts - 1, delay), delay);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,             // Custom titlebar — removes OS chrome
    transparent: true,        // Allows opacity/transparency over games
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  }, 3000);
  mainWindow.once('show', () => clearTimeout(showFallback));

  if (isDev) {
    loadWithRetry(mainWindow, 'http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(getFrontendPath('index.html')).catch(() => mainWindow?.show());
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: 'deny' };
  });
}

// ── Overlay window ────────────────────────────────────────
function createOverlayWindow(urlOrChannel: string, isUrl: boolean, theme?: string) {
  if (overlayWindow) overlayWindow.close();

  overlayWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: 0,
    y: 0,
    transparent: true,
    alwaysOnTop: true,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isUrl) {
    overlayWindow.loadURL(urlOrChannel);
  } else if (isDev) {
    const devUrl = `http://localhost:5173/overlay.html?mode=chat&channel=${urlOrChannel}${theme ? `&theme=${theme}` : ''}`;
    overlayWindow.loadURL(devUrl);
  } else {
    overlayWindow.loadFile(getFrontendPath('overlay.html'), {
      query: { mode: 'chat', channel: urlOrChannel, ...(theme ? { theme } : {}) },
    });
  }

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.webContents.on('did-finish-load', () => {
    overlayWindow?.webContents.insertCSS(`
      #overlay-root { width: 100%; height: 100%; }
      .drag-handle {
        position: fixed; top: 0; left: 0; right: 0; height: 4px;
        z-index: 9999; cursor: move; -webkit-app-region: drag;
      }
    `);
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
ipcMain.on('overlay:open', (_e, url: string, isUrl: boolean, theme?: string) => {
  createOverlayWindow(url, isUrl, theme);
});
ipcMain.on('overlay:close', () => overlayWindow?.close());
ipcMain.handle('overlay:isOpen', () => overlayWindow !== null && !overlayWindow.isDestroyed());
ipcMain.on('overlay:toggleClickThrough', toggleClickThrough);
ipcMain.handle('overlay:getClickThrough', () => overlayIgnoreMouse);

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
    `&state=${Math.random().toString(36).slice(2)}`;

  shell.openExternal(url);
  console.log('🔗 OAuth URL opened in browser');

  // Re-focus the main window after the browser opens (prevents window from appearing minimized)
  setTimeout(() => {
    mainWindow?.focus();
    mainWindow?.show();
  }, 500);
});

// Main window — always-on-top toggle (para gestionar sobre el juego)
ipcMain.handle('window:getAlwaysOnTop', () => mainAlwaysOnTop);
ipcMain.on('window:setAlwaysOnTop', (_e, value: boolean) => {
  mainAlwaysOnTop = value;
  mainWindow?.setAlwaysOnTop(value, 'screen-saver');
});

// Main window — opacity (0.1 – 1.0)
ipcMain.on('window:setOpacity', (_e, value: number) => {
  mainWindow?.setOpacity(Math.max(0.1, Math.min(1, value)));
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
