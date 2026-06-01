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
    login: () => ipcRenderer.send('auth:login'),
  },

  window: {
    minimize:       ()              => ipcRenderer.send('window:minimize'),
    close:          ()              => ipcRenderer.send('window:close'),
    setAlwaysOnTop: (v: boolean)    => ipcRenderer.send('window:setAlwaysOnTop', v),
    getAlwaysOnTop: ()              => ipcRenderer.invoke('window:getAlwaysOnTop'),
    setOpacity:     (v: number)     => ipcRenderer.send('window:setOpacity', v),
  },

  shell: {
    openExternal: (url: string) => shell.openExternal(url),
  },
});
