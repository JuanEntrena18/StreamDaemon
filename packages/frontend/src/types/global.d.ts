export {};

declare global {
  interface StreamforgerOverlayAPI {
    open: (url: string, isUrl: boolean, theme?: string) => void;
    close: () => void;
    isOpen: () => Promise<boolean>;
    toggleClickThrough: () => void;
    getClickThrough: () => Promise<boolean>;
    setOpacity: (v: number) => void;
    resize: (w: number, h: number) => void;
    setPosition: (x: number, y: number) => void;
    getBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
    setAlwaysOnTop: (v: boolean) => void;
    getAlwaysOnTop: () => Promise<boolean>;
    setFont: (fontFamily: string) => void;
    setFontSize: (size: number) => void;
    setBgMode: (mode: string) => void;
    showContextMenu: () => void;
    toggleBorders: () => void;
    resetWindow: () => void;
    showSettings: () => void;
  }

  interface StreamforgerWindowAPI {
    minimize: () => void;
    close: () => void;
    setAlwaysOnTop: (v: boolean) => void;
    getAlwaysOnTop: () => Promise<boolean>;
    setOpacity: (v: number) => void;
  }

  interface StreamforgerBackendAPI {
    isReady: () => Promise<boolean>;
  }

  interface StreamforgerAPI {
    isDesktop: boolean;
    backendUrl: string;
    overlay: StreamforgerOverlayAPI;
    backend: StreamforgerBackendAPI;
    window: StreamforgerWindowAPI;
  }

  interface Window {
    streamforger?: StreamforgerAPI;
  }
}
