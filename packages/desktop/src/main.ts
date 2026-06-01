import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// Load backend .env so we have Twitch credentials available in the main process
dotenvConfig({ path: resolve(__dirname, '../../backend/.env') });

// ── Database setup ────────────────────────────────────────
// Point Prisma at the SQLite file bundled with the desktop package.
// This must be set BEFORE the backend module is imported so that
// PrismaClient picks up the correct datasource URL at initialisation.
const dbPath = isDev
  ? path.resolve(__dirname, '../prisma/streamforger.db')
  : path.join(app.getPath('userData'), 'streamforger.db');

process.env.DATABASE_URL = `file:${dbPath}`;

// ── Frontend path (production only) ──────────────────────
// extraResources copies packages/frontend/dist → resources/frontend/dist
function getFrontendPath(...parts: string[]): string {
  return path.join(process.resourcesPath, 'frontend', 'dist', ...parts);
}

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayIgnoreMouse = true;

async function startBackend() {
  try {
    const { startServer } = await import('@streamforger/backend/dist/index.js');
    const opts: { port: number; frontendDir?: string } = { port: 3000 };
    await startServer(opts);
    console.log('✅ Backend started successfully');
  } catch (err) {
    // Backend failure should not prevent the window from showing.
    // The UI loads directly from the file system (loadFile), so it
    // is always visible regardless of backend status.
    console.error('⚠️  Backend failed to start:', err);
  }
}

function loadWithRetry(win: BrowserWindow, url: string, attempts = 5, delay = 2000): void {
  win.loadURL(url).catch((err) => {
    if (attempts <= 1) {
      console.error('❌ Could not load URL after all retries:', url, err);
      // Last resort: show the window with an error page rather than staying invisible
      win.show();
      return;
    }
    console.warn(`⚠️  loadURL failed, retrying in ${delay}ms… (${attempts - 1} attempts left)`);
    setTimeout(() => loadWithRetry(win, url, attempts - 1, delay), delay);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#0f0f23',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Show as soon as the page is ready to paint
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Fallback: if ready-to-show never fires within 3 seconds, show anyway.
  // With loadFile() this should almost never happen.
  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('⚠️  ready-to-show never fired — forcing window visibility');
      mainWindow.show();
    }
  }, 3000);

  mainWindow.once('show', () => clearTimeout(showFallback));

  if (isDev) {
    // Dev: Vite serves the app on localhost:5173
    loadWithRetry(mainWindow, 'http://localhost:5173');
  } else {
    // Production: load the bundled index.html directly from the file system.
    // This is instant and does not depend on the backend being ready.
    mainWindow.loadFile(getFrontendPath('index.html')).catch((err) => {
      console.error('❌ Failed to load index.html:', err);
      mainWindow?.show();
    });
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: 'deny' };
  });
}

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
    // Production: load overlay.html from file system with query params
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

ipcMain.on('overlay:open', (_event, url: string, isUrl: boolean, theme?: string) => {
  createOverlayWindow(url, isUrl, theme);
});

ipcMain.on('overlay:close', () => {
  overlayWindow?.close();
});

ipcMain.handle('overlay:isOpen', () => overlayWindow !== null && !overlayWindow.isDestroyed());
ipcMain.on('overlay:toggleClickThrough', toggleClickThrough);
ipcMain.handle('overlay:getClickThrough', () => overlayIgnoreMouse);
ipcMain.on('auth:login', () => {
  const clientId = process.env.TWITCH_CLIENT_ID ?? '';
  const redirectUri = process.env.TWITCH_REDIRECT_URI ?? 'http://localhost:3000/auth/callback';
  const scopes = [
    'chat:read',
    'chat:edit',
    'channel:read:redemptions',
    'channel:manage:predictions',
    'channel:read:predictions',
    'channel:manage:raids',
    'channel:manage:moderators',
  ];
  if (!clientId) {
    // Fallback to backend redirect if no client ID is configured
    shell.openExternal('http://localhost:3000/auth/login');
    return;
  }
  const state = Math.random().toString(36).slice(2);
  const url =
    `https://id.twitch.tv/oauth2/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scopes.join('+')}` +
    `&state=${state}`;
  shell.openExternal(url);
});

// ── Lifecycle ─────────────────────────────────────────────

app.whenReady().then(async () => {
  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Shift+T', toggleClickThrough);

  // Start backend (non-fatal — window opens regardless)
  await startBackend();

  // Create and show the main dashboard window
  createMainWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});
