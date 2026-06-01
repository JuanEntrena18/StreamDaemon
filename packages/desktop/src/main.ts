import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// ── Database setup ────────────────────────────────────────
// Point Prisma at the SQLite file bundled with the desktop package.
// This must be set BEFORE the backend module is imported so that
// PrismaClient picks up the correct datasource URL at initialisation.
const dbPath = isDev
  ? path.resolve(__dirname, '../prisma/streamforger.db')
  : path.join(app.getPath('userData'), 'streamforger.db');

process.env.DATABASE_URL = `file:${dbPath}`;

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayIgnoreMouse = true;

async function startBackend() {
  try {
    const { startServer } = await import('@streamforger/backend/dist/index.js');
    const opts: { port: number; frontendDir?: string } = { port: 3000 };

    if (!isDev) {
      // electron-builder copies ../frontend/dist → resources/frontend/dist (extraResources)
      // process.resourcesPath points to the resources/ folder at runtime
      opts.frontendDir = path.join(process.resourcesPath, 'frontend', 'dist');
    }

    await startServer(opts);
    console.log('✅ Backend started successfully');
  } catch (err) {
    // Backend failure should not prevent the window from showing.
    // In dev mode the frontend runs on Vite's own server (port 5173).
    console.error('⚠️  Backend failed to start — window will open anyway:', err);
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

  const url = isDev ? 'http://localhost:5173' : 'http://localhost:3000';

  // Show as soon as the page is ready to paint
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Fallback: if ready-to-show never fires within 8 seconds, show anyway
  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('⚠️  ready-to-show never fired — forcing window visibility');
      mainWindow.show();
    }
  }, 8000);

  mainWindow.once('show', () => clearTimeout(showFallback));

  loadWithRetry(mainWindow, url);

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: 'deny' };
  });
}

function createOverlayWindow(urlOrChannel: string, isUrl: boolean, theme?: string) {
  if (overlayWindow) overlayWindow.close();

  let url: string;
  if (isUrl) {
    url = urlOrChannel;
  } else {
    const base = isDev ? 'http://localhost:5173' : 'http://localhost:3000';
    url = `${base}/overlay.html?mode=chat&channel=${urlOrChannel}`;
    if (theme) url += `&theme=${theme}`;
  }

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

  overlayWindow.loadURL(url);
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
ipcMain.on('auth:login', () => shell.openExternal('http://localhost:3000/auth/login'));

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
