import { useState, useEffect } from 'react';

const isDesktop = typeof window.streamforger !== 'undefined';

interface Props {
  bgMode: 'transparent' | 'black';
  fontFamily: string;
  fontSize: number;
  onBgModeChange: (mode: 'transparent' | 'black') => void;
  onFontFamilyChange: (font: string) => void;
  onFontSizeChange: (size: number) => void;
}

const FONTS = [
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Monospace', value: "'Courier New', monospace" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Impact', value: "'Arial Black', Impact, sans-serif" },
];

export function OverlayControls({ bgMode, fontFamily, fontSize, onBgModeChange, onFontFamilyChange, onFontSizeChange }: Props) {
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

  return (
    <>
      <div
        className="overlay-controls"
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
            ⋮⋮ StreamForger Chat
          </span>
        </div>

        {/* Settings gear */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          title="Ajustes"
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
          title={clickThrough ? 'Activar click-through (los clics pasan al juego)' : 'Desactivar click-through'}
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
          title={bgMode === 'transparent' ? 'Fondo negro' : 'Fondo transparente'}
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
          title={overlayAlwaysOnTop ? 'Desactivar siempre encima' : 'Activar siempre encima'}
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
          title="Cerrar overlay"
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

      {/* Settings panel */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 36,
          right: 4,
          width: 220,
          background: 'rgba(10,10,26,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          padding: '12px',
          zIndex: 999999,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            Tipografía
          </div>
          <select
            value={fontFamily}
            onChange={(e) => onFontFamilyChange(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.3)',
              color: '#e2e8f0',
              fontSize: '0.78rem',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              marginBottom: 8,
            }}
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
            ))}
          </select>

          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
            Tamaño
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>A</span>
            <input
              type="range"
              min={10}
              max={24}
              value={fontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>A</span>
          </div>

          {/* Preview */}
          <div style={{
            padding: '6px 8px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            fontSize: `${fontSize}px`,
            color: 'rgba(255,255,255,0.5)',
            fontFamily,
            lineHeight: 1.5,
          }}>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>Usuario:</span> Ejemplo de mensaje en el chat
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
