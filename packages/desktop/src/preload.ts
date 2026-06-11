import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('streamforger', {
  isDesktop: true,
  backendUrl: 'http://localhost:3000',
  localApiToken: ipcRenderer.sendSync('get-local-api-token'),

  overlay: {
    open: (url: string, isUrl: boolean, theme?: string) =>
      ipcRenderer.send('overlay:open', url, isUrl, theme),
    close: () => ipcRenderer.send('overlay:close'),
    isOpen: () => ipcRenderer.invoke('overlay:isOpen'),
    toggleClickThrough: () => ipcRenderer.send('overlay:toggleClickThrough'),
    getClickThrough: () => ipcRenderer.invoke('overlay:getClickThrough'),
    setOpacity: (v: number) => ipcRenderer.send('overlay:setOpacity', v),
    resize: (w: number, h: number) => ipcRenderer.send('overlay:resize', w, h),
    setPosition: (x: number, y: number) => ipcRenderer.send('overlay:setPosition', x, y),
    getBounds: () => ipcRenderer.invoke('overlay:getBounds'),
    setAlwaysOnTop: (v: boolean) => ipcRenderer.send('overlay:setAlwaysOnTop', v),
    getAlwaysOnTop: () => ipcRenderer.invoke('overlay:getAlwaysOnTop'),
    setFont: (fontFamily: string) => ipcRenderer.send('overlay:setFont', fontFamily),
    setFontSize: (size: number) => ipcRenderer.send('overlay:setFontSize', size),
    setBgMode: (mode: string) => ipcRenderer.send('overlay:setBgMode', mode),
  },

  auth: {
    login: () => {
      // Auth is handled by the renderer using window.open.
      // This is just a stub for compatibility if anything calls it.
      window.open('http://localhost:3000/auth/login', '_blank');
    },
  },

  backend: {
    isReady: () => ipcRenderer.invoke('backend:isReady'),
  },

  window: {
    minimize:       ()           => ipcRenderer.send('window:minimize'),
    close:          ()           => ipcRenderer.send('window:close'),
    setAlwaysOnTop: (v: boolean) => ipcRenderer.send('window:setAlwaysOnTop', v),
    getAlwaysOnTop: ()           => ipcRenderer.invoke('window:getAlwaysOnTop'),
    setOpacity:     (v: number)  => ipcRenderer.send('window:setOpacity', v),
  },
});
