/// <reference types="vite/client" />

interface StreamforgerAPI {
  isDesktop: boolean;
  platform: string;
  backendUrl: string;
  overlay: {
    open: (url: string, isUrl: boolean, theme?: string) => void;
    close: () => void;
    isOpen: () => Promise<boolean>;
    toggleClickThrough: () => void;
    getClickThrough: () => Promise<boolean>;
  };
  backend: {
    isReady: () => Promise<boolean>;
  };
  auth: {
    login: () => void;
  };
  window: {
    minimize:       () => void;
    close:          () => void;
    setAlwaysOnTop: (value: boolean) => void;
    getAlwaysOnTop: () => Promise<boolean>;
    setOpacity:     (value: number) => void;
  };
}

interface Window {
  streamforger?: StreamforgerAPI;
}
