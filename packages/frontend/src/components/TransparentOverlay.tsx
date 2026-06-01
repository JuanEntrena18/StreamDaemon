import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  channel: string;
}

const THEMES = [
  { id: '', label: 'Sin tema', icon: '⬜' },
  { id: 'subnautica2', label: 'Subnautica 2', icon: '🌊', color: '#00d4ff' },
  { id: 'poe2', label: 'Path of Exile 2', icon: '⚔️', color: '#c9a04a' },
  { id: 'wow', label: 'World of Warcraft', icon: '🛡️', color: '#ffd100' },
];

export function TransparentOverlay({ channel }: Props) {
  const [mode, setMode] = useState<'channel' | 'url'>('channel');
  const [isOpen, setIsOpen] = useState(false);
  const [clickThrough, setClickThrough] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [customUrl, setCustomUrl] = useState('https://chat.johnnycyan.com/');
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged' | 'guest'>('checking');

  useEffect(() => {
    window.streamforger?.overlay.isOpen().then(setIsOpen);
    window.streamforger?.overlay.getClickThrough().then(setClickThrough);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const backendUrl = window.streamforger?.backendUrl ?? 'http://localhost:3000';
    try {
      const res = await fetch(`${backendUrl}/auth/status`);
      const data = await res.json();
      setAuthStatus(data.authenticated ? 'logged' : 'guest');
    } catch {
      setAuthStatus('guest');
    }
  };

  const toggle = () => {
    if (isOpen) {
      window.streamforger?.overlay.close();
      setIsOpen(false);
      return;
    }
    if (mode === 'url' && customUrl) {
      window.streamforger?.overlay.open(customUrl, true);
      setIsOpen(true);
    } else if (channel) {
      window.streamforger?.overlay.open(channel, false, selectedTheme || undefined);
      setIsOpen(true);
    }
  };

  const toggleClickThrough = () => {
    window.streamforger?.overlay.toggleClickThrough();
    setClickThrough(!clickThrough);
  };

  const handleLogin = () => {
    window.streamforger?.auth.login();
    const interval = setInterval(async () => {
      await checkAuth();
      if (authStatus === 'logged') clearInterval(interval);
    }, 2000);
    setTimeout(() => clearInterval(interval), 120000);
  };

  const canOpen = (mode === 'url' && customUrl) || (mode === 'channel' && channel);

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
            🪟 Overlay Transparente
          </h2>
          <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
            Ventana siempre visible sobre tus juegos.{' '}
            <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--sf-border)', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.72rem', color: 'var(--sf-text-2)' }}>
              Ctrl+Shift+T
            </kbd>{' '}
            para toggle click-through.
          </p>
        </div>

        {/* Auth status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
          <span
            className={
              authStatus === 'logged' ? 'sf-badge sf-badge-success' :
              authStatus === 'checking' ? 'sf-badge sf-badge-teal' :
              'sf-badge sf-badge-danger'
            }
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {authStatus === 'logged' ? 'Twitch ✓' : authStatus === 'checking' ? 'Verificando' : 'Sin sesión'}
          </span>
          {authStatus !== 'logged' && (
            <button
              id="twitch-login-btn"
              onClick={handleLogin}
              className="sf-btn sf-btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {/* Mode selector */}
        <p className="sf-section-title">Fuente del overlay</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {(['channel', 'url'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: mode === m ? 'var(--sf-primary)' : 'var(--sf-border)',
                background: mode === m ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: mode === m ? '#a78bfa' : 'var(--sf-text-2)',
                fontSize: '0.825rem',
                fontWeight: mode === m ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {m === 'channel' ? '💬 Chat del canal' : '🔗 URL personalizada'}
            </button>
          ))}
        </div>

        {mode === 'url' ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.375rem', fontWeight: 500 }}>
              URL del overlay
            </label>
            <input
              id="overlay-custom-url"
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://chat.johnnycyan.com/?channel=..."
              className="sf-input"
              style={{ marginBottom: '0.875rem' }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.625rem', fontWeight: 500 }}>
              Tema visual
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTheme(t.id)}
                  style={{
                    padding: '0.4rem 0.875rem',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: selectedTheme === t.id ? (t.color ?? 'var(--sf-primary)') : 'var(--sf-border)',
                    background: selectedTheme === t.id ? `${(t.color ?? '#7c3aed')}22` : 'transparent',
                    color: selectedTheme === t.id ? (t.color ?? '#a78bfa') : 'var(--sf-text-3)',
                    fontSize: '0.8rem',
                    fontWeight: selectedTheme === t.id ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          id="overlay-toggle-btn"
          onClick={toggle}
          disabled={!canOpen}
          className={`sf-btn ${isOpen ? 'sf-btn-danger' : 'sf-btn-primary'}`}
          style={{ width: '100%', marginBottom: isOpen ? '1rem' : 0 }}
        >
          {isOpen ? '✕ Cerrar overlay' : '▶ Abrir overlay'}
        </button>

        {/* Click-through toggle (only when open) */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 8,
              border: '1px solid var(--sf-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.1rem' }}>
                  Click-through
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)' }}>
                  Arrastra desde el borde superior para mover
                </div>
              </div>
              <button
                id="overlay-clickthrough-toggle"
                onClick={toggleClickThrough}
                style={{
                  width: 44, height: 24, borderRadius: 99,
                  background: clickThrough ? 'var(--sf-primary)' : 'var(--sf-border)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: clickThrough ? 'calc(100% - 21px)' : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </motion.div>
        )}

        {!canOpen && mode === 'channel' && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--sf-text-3)', textAlign: 'center' }}>
            Ingresa tu canal de Twitch en la barra superior
          </p>
        )}
      </div>
    </div>
  );
}
