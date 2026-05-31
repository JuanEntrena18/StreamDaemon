import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('streamforger', {
  platform: process.platform,
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
    login: () => ipcRenderer.send('auth:login'),
  },
});
