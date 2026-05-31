import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayIgnoreMouse = true;

async function startBackend() {
  const { startServer } = await import('@streamforger/backend/dist/index.js');
  const opts: { port: number; frontendDir?: string } = { port: 3000 };

  if (!isDev) {
    opts.frontendDir = path.resolve(__dirname, '../../frontend/dist');
  }

  await startServer(opts);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = isDev
    ? 'http://localhost:5173'
    : 'http://localhost:3000';

  mainWindow.loadURL(url);
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
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

// ── Shortcuts ─────────────────────────────────────────────

app.whenReady().then(() => {
  globalShortcut.register('CommandOrControl+Shift+T', toggleClickThrough);
});

// ── Lifecycle ─────────────────────────────────────────────

app.whenReady().then(async () => {
  await startBackend();
  createMainWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});
