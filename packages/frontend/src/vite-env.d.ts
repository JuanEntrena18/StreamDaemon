/// <reference types="vite/client" />

interface StreamforgerAPI {
  platform: string;
  backendUrl: string;
  overlay: {
    open: (channel: string, theme?: string) => void;
    close: () => void;
    isOpen: () => Promise<boolean>;
    toggleClickThrough: () => void;
    getClickThrough: () => Promise<boolean>;
  };
}

interface Window {
  streamforger?: StreamforgerAPI;
}
