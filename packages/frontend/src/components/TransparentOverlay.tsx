import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import styles from './TransparentOverlay.module.css';

interface Props {
  channel: string;
}

export function TransparentOverlay({ channel }: Props) {
  const { t } = useTranslation();

  const OVERLAY_MODES = [
    { mode: 'channel', icon: '💬', label: t('overlay.chatCanal') },
    { mode: 'cyanchat', icon: '💬', label: 'Cyan Chat' },
    { mode: 'custom', icon: '🎨', label: t('overlay.overlayPersonalizado') },
    { mode: 'url', icon: '🔗', label: t('overlay.urlPersonalizada') },
  ];

  const THEMES = [
    { id: '', label: t('obs.sinTema'), icon: '⬜' },
    { id: 'subnautica2', label: t('overlay.temaSubnautica'), icon: '🌊', color: '#00d4ff' },
    { id: 'poe2', label: t('overlay.temaPoE2'), icon: '⚔️', color: '#c9a04a' },
    { id: 'wow', label: t('overlay.temaWow'), icon: '🛡️', color: '#ffd100' },
    { id: 'fortnite', label: t('overlay.temaFortnite'), icon: '🔫', color: '#ff007f' },
  ];

  const [mode, setMode] = useState<'channel' | 'cyanchat' | 'url' | 'custom'>('channel');
  const [isOpen, setIsOpen] = useState(false);
  const [clickThrough, setClickThrough] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [customUrl, setCustomUrl] = useState('https://chat.johnnycyan.com/');
  const [customGame, setCustomGame] = useState('');
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
    if (mode === 'cyanchat') {
      const baseUrl = window.streamforger?.backendUrl || 'http://localhost:3000';
      window.streamforger?.overlay.open(`${baseUrl}/overlay.html?mode=cyanchat&channel=${encodeURIComponent(channel)}`, true);
      setIsOpen(true);
    } else if (mode === 'url' && customUrl) {
      window.streamforger?.overlay.open(customUrl, true);
      setIsOpen(true);
    } else if (mode === 'custom') {
      const gameParam = customGame ? `&game=${encodeURIComponent(customGame)}` : '';
      const url = `http://localhost:3000/overlay.html?mode=custom&channel=${channel}${gameParam}`;
      window.streamforger?.overlay.open(url, true);
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

  const canOpen = (mode === 'cyanchat' && channel) || (mode === 'url' && customUrl) || (mode === 'channel' && channel) || (mode === 'custom' && channel);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>
            {t('overlay.overlayTitle')}
          </h2>
          <p className={styles.subtitle}>
            Ventana siempre visible sobre tus juegos.{' '}
            <kbd className={styles.kbd}>
              Ctrl+Shift+T
            </kbd>{' '}
            {t('overlay.overlayDesc')}
          </p>
        </div>

        {/* Auth status */}
        <div className={styles.authSection}>
          <span
            className={
              authStatus === 'logged' ? 'sf-badge sf-badge-success' :
              authStatus === 'checking' ? 'sf-badge sf-badge-teal' :
              'sf-badge sf-badge-danger'
            }
          >
            <span className={styles.statusDot} />
            {authStatus === 'logged' ? t('overlay.authStatus') : authStatus === 'checking' ? t('overlay.verificando') : t('overlay.sinSesion')}
          </span>
          {authStatus !== 'logged' && (
            <button
              id="twitch-login-btn"
              onClick={handleLogin}
              className={`sf-btn sf-btn-primary ${styles.loginBtn}`}
            >
              {t('overlay.iniciarSesion')}
            </button>
          )}
        </div>
      </div>

      <div className={`glass-card ${styles.card}`}>
        {/* Mode selector */}
        <p className="sf-section-title">{t('overlay.fuenteOverlay')}</p>
        <div className={styles.modeSelector}>
          {OVERLAY_MODES.map((m) => (
            <button
              key={m.mode}
              onClick={() => setMode(m.mode as 'channel' | 'cyanchat' | 'url' | 'custom')}
              className={`${styles.modeBtn} ${mode === m.mode ? styles['modeBtn--active'] : styles['modeBtn--inactive']}`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {mode === 'cyanchat' ? (
          <div className={styles.cyanHint}>
            <p className={styles.cyanHintText}>
              Abre Cyan Chat como ventana transparente. La URL se configura desde{' '}
              <a href="https://chat.johnnycyan.com/" target="_blank" rel="noreferrer" className={styles.cyanLink}>chat.johnnycyan.com</a>
              {' '}y se guarda automáticamente.
            </p>
          </div>
        ) : mode === 'url' ? (
          <div className={styles.urlInputWrap}>
            <label className={styles.urlLabel}>
              {t('overlay.urlOverlay')}
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
        ) : mode === 'custom' ? (
          <div className={styles.gameInputWrap}>
            <label className={styles.gameLabel}>
              {t('overlay.nombreJuego')}
            </label>
            <input
              id="overlay-custom-game"
              type="text"
              value={customGame}
              onChange={(e) => setCustomGame(e.target.value)}
              placeholder={t('overlay.juegoPlaceholder')}
              className="sf-input"
              style={{ maxWidth: 300 }}
            />
          </div>
        ) : (
          <div className={styles.themeSection}>
            <label className={styles.themeLabel}>
              {t('overlay.temaVisual')}
            </label>
            <div className={styles.themeList}>
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => setSelectedTheme(th.id)}
                  className={styles.themeBtn}
                  style={{
                    borderColor: selectedTheme === th.id ? (th.color ?? 'var(--sf-primary)') : 'var(--sf-border)',
                    background: selectedTheme === th.id ? `${(th.color ?? '#7c3aed')}22` : 'transparent',
                    color: selectedTheme === th.id ? (th.color ?? '#a78bfa') : 'var(--sf-text-3)',
                    fontWeight: selectedTheme === th.id ? 600 : 400,
                  }}
                >
                  <span>{th.icon}</span>
                  {th.label}
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
          className={`sf-btn ${isOpen ? 'sf-btn-danger' : 'sf-btn-primary'} ${styles.toggleWrap}`}
          style={{ marginBottom: isOpen ? '1rem' : 0 }}
        >
          {isOpen ? t('overlay.cerrar') : t('overlay.abrir')}
        </button>

        {/* Click-through toggle (only when open) */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.clickThroughCard}>
              <div>
                <div className={styles.clickThroughTitle}>
                  {t('overlay.clickThrough')}
                </div>
                <div className={styles.clickThroughDesc}>
                  {t('overlay.arrastra')}
                </div>
              </div>
              <button
                id="overlay-clickthrough-toggle"
                onClick={toggleClickThrough}
                className={`${styles.toggleTrack} ${clickThrough ? styles['toggleTrack--on'] : styles['toggleTrack--off']}`}
              >
                <span className={`${styles.toggleThumb} ${clickThrough ? styles['toggleThumb--on'] : styles['toggleThumb--off']}`} />
              </button>
            </div>
          </motion.div>
        )}

        {!canOpen && mode !== 'url' && (
          <p className={styles.emptyMsg}>
            {t('overlay.emptyChannel')}
          </p>
        )}
      </div>
    </div>
  );
}
