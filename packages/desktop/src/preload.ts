import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('streamforger', {
  platform: process.platform,
  backendUrl: 'http://localhost:3000',
});
