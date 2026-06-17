import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';

const isDesktop = typeof window.streamforger !== 'undefined';

interface Props {
  mode: string;
  bgMode: 'transparent' | 'black';
  fontFamily: string;
  fontSize: number;
  onBgModeChange: (mode: 'transparent' | 'black') => void;
  onFontFamilyChange: (font: string) => void;
  onFontSizeChange: (size: number) => void;
}

const MODE_LABELS: Record<string, string> = {
  chat: 'Chat',
  cyanchat: 'Cyan Chat',
  scoreboard: 'Fighter',
  timer: 'Timer',
  giveaway: 'Giveaway',
  prediction: 'Prediction',
  hud: 'HUD',
  social: 'Social',
  custom: 'Custom',
};

const FONTS = [
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Monospace', value: "'Courier New', monospace" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Impact', value: "'Arial Black', Impact, sans-serif" },
];

export function OverlayControls({ mode, bgMode, fontFamily, fontSize, onBgModeChange, onFontFamilyChange, onFontSizeChange }: Props) {
  const { t } = useTranslation();
  const [clickThrough, setClickThrough] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isDesktop) {
      window.streamforger?.overlay.getClickThrough().then(setClickThrough);
    }
  }, []);

  const toggleLock = () => {
    window.streamforger?.overlay.toggleClickThrough();
    setClickThrough((v) => !v);
  };

  const closeOverlay = () => {
    window.streamforger?.overlay.close();
  };

  const [overlayAlwaysOnTop, setOverlayAlwaysOnTop] = useState(true);

  useEffect(() => {
    if (isDesktop) {
      window.streamforger?.overlay.getAlwaysOnTop?.().then(setOverlayAlwaysOnTop);
    }
  }, []);

  const toggleAlwaysOnTop = () => {
    const next = !overlayAlwaysOnTop;
    setOverlayAlwaysOnTop(next);
    window.streamforger?.overlay.setAlwaysOnTop?.(next);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isDesktop) return;
    e.preventDefault();
    window.streamforger?.overlay.showContextMenu();
  };

  return (
    <>
      <div
        className="overlay-controls"
        onContextMenu={handleContextMenu}
        {...{ style: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 4px',
          background: bgMode === 'black' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(8px)',
          zIndex: 999999,
        } as React.CSSProperties }}
      >
        {/* Drag handle */}
        <div
          {...{ style: {
            flex: 1,
            height: '100%',
            WebkitAppRegion: 'drag',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
            gap: 6,
          } as React.CSSProperties }}
        >
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', userSelect: 'none' }}>
            ⋮⋮ StreamForger {MODE_LABELS[mode] || mode}
          </span>
        </div>

        {/* Settings gear */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          title={t('overlay.ajustes')}
          style={{
            width: 26, height: 26, borderRadius: 4,
            background: showSettings ? 'rgba(124,58,237,0.3)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: showSettings ? '#a78bfa' : 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem',
            transition: 'all 0.15s',
          }}
        >⚙</button>

        {/* Lock/Unlock click-through */}
        <button
          onClick={toggleLock}
          title={clickThrough ? t('overlay.clickThroughOn') : t('overlay.clickThroughOff')}
          style={{
            width: 26, height: 26, borderRadius: 4,
            background: clickThrough ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            border: '1px solid',
            borderColor: clickThrough ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
            color: clickThrough ? '#34d399' : '#f87171',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem',
            transition: 'all 0.15s',
          }}
        >
          {clickThrough ? '🔓' : '🔒'}
        </button>

        {/* Background mode toggle */}
        <button
          onClick={() => onBgModeChange(bgMode === 'transparent' ? 'black' : 'transparent')}
          title={bgMode === 'transparent' ? t('overlay.fondoNegro') : t('overlay.fondoTransparente')}
          style={{
            width: 26, height: 26, borderRadius: 4,
            background: bgMode === 'black' ? 'rgba(0,0,0,0.4)' : 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem',
            transition: 'all 0.15s',
          }}
        >
          {bgMode === 'transparent' ? '◻' : '◼'}
        </button>

        {/* Always on top */}
        <button
          onClick={toggleAlwaysOnTop}
          title={overlayAlwaysOnTop ? t('overlay.siempreEncimaOff') : t('overlay.siempreEncimaOn')}
          style={{
            width: 26, height: 26, borderRadius: 4,
            background: overlayAlwaysOnTop ? 'rgba(59,130,246,0.25)' : 'transparent',
            border: '1px solid',
            borderColor: overlayAlwaysOnTop ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.15)',
            color: overlayAlwaysOnTop ? '#60a5fa' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem',
            transition: 'all 0.15s',
          }}
        >📌</button>

        {/* Close */}
        <button
          onClick={closeOverlay}
          title={t('overlay.cerrarOverlay')}
          style={{
            width: 26, height: 26, borderRadius: 4,
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
        >
          ✕
        </button>
      </div>

      {/* Settings panel — expands to full width */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 36,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10,10,26,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          zIndex: 999999,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
              ⚙️ Ajustes de ventana
            </h2>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                width: 30, height: 30, borderRadius: 6,
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>

          {/* Section: Tipografía */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              {t('overlay.tipografia')}
            </div>
            <select
              value={fontFamily}
              onChange={(e) => onFontFamilyChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Section: Tamaño */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              {t('overlay.tamano')} ({fontSize}px)
            </div>
            <input
              type="range"
              min={10}
              max={32}
              value={fontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              <span>10px</span>
              <span>32px</span>
            </div>
          </div>

          {/* Section: Preview */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              Vista previa
            </div>
            <div style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: `${fontSize}px`,
              color: 'rgba(255,255,255,0.6)',
              fontFamily,
              lineHeight: 1.5,
            }}>
              <span style={{ color: '#a78bfa', fontWeight: 600 }}>Usuario:</span> Ejemplo de mensaje en el chat
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                window.streamforger?.overlay.toggleBorders();
                setShowSettings(false);
              }}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.2)',
                color: '#e2e8f0', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              Eliminar bordes
            </button>
            <button
              onClick={() => {
                window.streamforger?.overlay.resetWindow();
                setShowSettings(false);
              }}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.2)',
                color: '#e2e8f0', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              Resetear ventana
            </button>
          </div>
        </div>
      )}

      {/* Resize handle (bottom-right) */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        cursor: 'nwse-resize',
        zIndex: 999999,
        background: 'transparent',
      }} />
    </>
  );
}
