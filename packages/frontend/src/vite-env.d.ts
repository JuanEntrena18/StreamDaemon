/// <reference types="vite/client" />

interface StreamforgerAPI {
  isDesktop: boolean;
  platform: string;
  backendUrl: string;
  localApiToken?: string;
  overlay: {
    open: (url: string, isUrl: boolean, theme?: string) => void;
    close: () => void;
    isOpen: () => Promise<boolean>;
    toggleClickThrough: () => void;
    getClickThrough: () => Promise<boolean>;
    setOpacity: (v: number) => void;
    resize: (w: number, h: number) => void;
    setPosition: (x: number, y: number) => void;
    getBounds: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
    setAlwaysOnTop: (v: boolean) => void;
    getAlwaysOnTop: () => Promise<boolean>;
    setFont: (fontFamily: string) => void;
    setFontSize: (size: number) => void;
    setBgMode: (mode: string) => void;
    showContextMenu: () => void;
    toggleBorders: () => void;
    resetWindow: () => void;
    showSettings: () => void;
  };
  backend: {
    isReady: () => Promise<boolean>;
  };
  vibeCv: {
    getConfig: () => Promise<import('@streamdaemon/shared').VibeCvConfig>;
    setConfig: (config: import('@streamdaemon/shared').VibeCvConfig) => Promise<boolean>;
    getStatus: () => Promise<import('@streamdaemon/shared').VibeCvStatus>;
    captureDebug: () => Promise<import('@streamdaemon/shared').VibeCvCaptureDebug>;
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
