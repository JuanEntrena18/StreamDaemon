import { contextBridge, ipcRenderer, shell } from 'electron';

contextBridge.exposeInMainWorld('streamforger', {
  isDesktop: true,
  backendUrl: 'http://localhost:3000',

  overlay: {
    open: (url: string, isUrl: boolean, theme?: string) =>
      ipcRenderer.send('overlay:open', url, isUrl, theme),
    close: () => ipcRenderer.send('overlay:close'),
    isOpen: () => ipcRenderer.invoke('overlay:isOpen'),
    toggleClickThrough: () => ipcRenderer.send('overlay:toggleClickThrough'),
    getClickThrough: () => ipcRenderer.invoke('overlay:getClickThrough'),
  },

  auth: {
    login: async () => {
      try {
        const res = await fetch('http://localhost:3000/auth/login-url');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { url } = await res.json() as { url: string };
        if (url) {
          shell.openExternal(url);
          return;
        }
      } catch {
        // fallback
      }
      shell.openExternal('http://localhost:3000/auth/login');
    },
  },

  window: {
    minimize:       ()           => ipcRenderer.send('window:minimize'),
    close:          ()           => ipcRenderer.send('window:close'),
    setAlwaysOnTop: (v: boolean) => ipcRenderer.send('window:setAlwaysOnTop', v),
    getAlwaysOnTop: ()           => ipcRenderer.invoke('window:getAlwaysOnTop'),
    setOpacity:     (v: number)  => ipcRenderer.send('window:setOpacity', v),
  },
});
