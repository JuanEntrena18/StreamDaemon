import { useState, useEffect } from 'react';

const isDesktop = typeof window.streamforger !== 'undefined';

export function OverlayControls() {
  const [clickThrough, setClickThrough] = useState(true);

  useEffect(() => {
    if (isDesktop) {
      window.streamforger?.overlay.getClickThrough().then(setClickThrough);
    }
  }, []);

  if (!isDesktop) return null;

  const toggleLock = () => {
    window.streamforger?.overlay.toggleClickThrough();
    setClickThrough((v) => !v);
  };

  const closeOverlay = () => {
    window.streamforger?.overlay.close();
  };

  return (
    <div
      className="overlay-controls"
      {...{ style: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        padding: '0 6px',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(6px)',
        opacity: 0,
        transition: 'opacity 0.2s',
        zIndex: 999999,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
    >
      {/* Drag handle (mover) - occupies the left area */}
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
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', userSelect: 'none' }}>
          ⋮⋮ StreamForge
        </span>
      </div>

      {/* Lock/Unlock */}
      <button
        onClick={toggleLock}
        title={clickThrough ? 'Bloquear (desactivar click-through)' : 'Desbloquear (activar click-through)'}
        style={{
          width: 24, height: 24, borderRadius: 4,
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

      {/* Close */}
      <button
        onClick={closeOverlay}
        title="Cerrar overlay"
        style={{
          width: 24, height: 24, borderRadius: 4,
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
  );
}
