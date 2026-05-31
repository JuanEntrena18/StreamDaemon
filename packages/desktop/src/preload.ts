import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('streamforger', {
  platform: process.platform,
  backendUrl: 'http://localhost:3000',

  // Transparent overlay controls
  overlay: {
    open: (channel: string, theme?: string) =>
      ipcRenderer.send('overlay:open', channel, theme),
    close: () => ipcRenderer.send('overlay:close'),
    isOpen: () => ipcRenderer.invoke('overlay:isOpen'),
    toggleClickThrough: () => ipcRenderer.send('overlay:toggleClickThrough'),
    getClickThrough: () => ipcRenderer.invoke('overlay:getClickThrough'),
  },
});
