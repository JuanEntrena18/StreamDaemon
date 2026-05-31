/// <reference types="vite/client" />

interface StreamforgerAPI {
  platform: string;
  backendUrl: string;
  overlay: {
    open: (url: string, isUrl: boolean, theme?: string) => void;
    close: () => void;
    isOpen: () => Promise<boolean>;
    toggleClickThrough: () => void;
    getClickThrough: () => Promise<boolean>;
  };
  auth: {
    login: () => void;
  };
}

interface Window {
  streamforger?: StreamforgerAPI;
}
