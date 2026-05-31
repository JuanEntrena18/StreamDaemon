import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayIgnoreMouse = true;

async function startBackend() {
  const { startServer } = await import('@streamforger/backend/dist/index.js');
  await startServer(3000);
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

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createOverlayWindow(channel: string, theme?: string) {
  if (overlayWindow) {
    overlayWindow.close();
  }

  let url = `http://localhost:5173/overlay.html?mode=chat&channel=${channel}`;
  if (theme) url += `&theme=${theme}`;

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

  // Click-through mode by default (mouse passes through to game)
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  // Thin invisible border at top for dragging + right-click menu
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

// ── IPC handlers ──────────────────────────────────────────

ipcMain.on('overlay:open', (_event, channel: string, theme?: string) => {
  createOverlayWindow(channel, theme);
});

ipcMain.on('overlay:close', () => {
  overlayWindow?.close();
});

ipcMain.handle('overlay:isOpen', () => overlayWindow !== null && !overlayWindow.isDestroyed());

ipcMain.on('overlay:toggleClickThrough', toggleClickThrough);

ipcMain.handle('overlay:getClickThrough', () => overlayIgnoreMouse);

// ── Keyboard shortcuts for overlay ─────────────────────────

app.whenReady().then(() => {
  globalShortcut.register('CommandOrControl+Shift+T', toggleClickThrough);
});

// ── App lifecycle ──────────────────────────────────────────

app.whenReady().then(async () => {
  await startBackend();
  createMainWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});
