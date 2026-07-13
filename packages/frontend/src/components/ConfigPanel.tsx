import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n/context';
import { useSocket } from '../hooks/useSocket';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { apiGet, apiPost } from '../utils/api';
import { ConfirmModal } from './ConfirmModal';
import { Logo } from './Logo';
import { Toggle } from './Toggle';
import styles from './ConfigPanel.module.css';

interface Props {
  channel: string;
  alwaysOnTop: boolean;
  toggleAlwaysOnTop: () => void;
}

export function ConfigPanel({ channel, alwaysOnTop, toggleAlwaysOnTop }: Props) {
  const { t, localeSetting, setLocale } = useTranslation();
  const { connected } = useSocket();
  const { authenticated, user, loading: authLoading, login, loginBrowser, logout, deviceState, cancelDeviceLogin } = useAuthStatus();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [uiZoom, setUiZoom] = useState(() => {
    try { return localStorage.getItem('sf-ui-zoom') || 'auto'; } catch { return 'auto'; }
  });

  const [obsHost, setObsHost] = useState('127.0.0.1');
  const [obsPort, setObsPort] = useState('4455');
  const [obsPassword, setObsPassword] = useState('');
  const [obsConnected, setObsConnected] = useState(false);
  const [obsConnecting, setObsConnecting] = useState(false);
  const [obsError, setObsError] = useState('');

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'uptodate' | 'available' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState('');

  useEffect(() => {
    apiGet('/obs/status').then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      setObsConnected(data.connected);
    }).catch(() => {});
  }, []);

  const connectObs = useCallback(async () => {
    setObsConnecting(true);
    setObsError('');
    try {
      const r = await apiPost('/obs/connect', { host: obsHost, port: parseInt(obsPort, 10), password: obsPassword });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setObsError(data.error || 'Connection failed');
        setObsConnected(false);
      } else {
        setObsConnected(true);
      }
    } catch (err: any) {
      setObsError(err.message || 'Connection error');
      setObsConnected(false);
    } finally {
      setObsConnecting(false);
    }
  }, [obsHost, obsPort, obsPassword]);

  const disconnectObs = useCallback(async () => {
    try {
      await apiPost('/obs/disconnect');
      setObsConnected(false);
    } catch {}
  }, []);

  const handleZoomChange = (val: string) => {
    setUiZoom(val);
    try { localStorage.setItem('sf-ui-zoom', val); } catch {}
    document.documentElement.setAttribute('data-zoom', val);
  };

  const checkUpdate = useCallback(async () => {
    setUpdateStatus('checking');
    setUpdateVersion('');
    try {
      const r = await fetch('https://api.github.com/repos/JuanEntrena18/StreamForge/releases/latest');
      if (!r.ok) throw new Error('fetch failed');
      const data = await r.json();
      const latest = (data.tag_name || '').replace(/^v/i, '');
      const current = t('config.appVersion').replace(/^v/i, '').split(' ·')[0];
      if (latest && latest !== current) {
        setUpdateVersion(data.tag_name);
        setUpdateStatus('available');
      } else {
        setUpdateStatus('uptodate');
      }
    } catch {
      setUpdateStatus('error');
    }
  }, [t]);

  return (
    <div className={styles.container}>
      <div className="mb-5">
        <h2 className="sf-heading flex-row--gap-sm">
          {t('config.title')}
        </h2>
        <p className="text-sm text-muted">{t('config.subtitle')}</p>
      </div>

      {/* ── Buy Me a Coffee ── */}
      <div className="glass-card sf-card">
        <p className="sf-section-title">{t('config.apoyoTitle')}</p>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
          {t('config.apoyoDesc')}
        </p>

        <div className="flex-row flex-wrap" style={{ gap: '1.25rem' }}>
          <img
            src="/qr-code.png"
            alt="Buy Me a Coffee QR"
            className={styles.qrImg}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <a
              href="https://buymeacoffee.com/jentrena"
              target="_blank"
              rel="noreferrer"
              className={styles.bmcBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 4H3c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h8l1 3h-2c-.55 0-1 .45-1 1s.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1h-2l1-3h8c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zm-1 10H4V6h16v8z"/>
              </svg>
              {t('config.invitameCafe')}
            </a>
            <div className={styles.bmcLink}>buymeacoffee.com/jentrena</div>
          </div>
        </div>

        <div className="flex-row flex-wrap" style={{ gap: '1.25rem', marginTop: '0.75rem' }}>
          <a
            href="https://paypal.me/jentrena"
            target="_blank"
            rel="noreferrer"
            className={styles.paypalBtn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/>
            </svg>
            {t('config.donarPaypal')}
          </a>
          <div className={styles.bmcLink}>paypal.me/jentrena</div>
        </div>
      </div>

      {/* ── Twitch Auth ── */}
      <div className="glass-card sf-card">
        <p className="sf-section-title">{t('config.twitchTitle')}</p>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
          {t('config.twitchDesc')}
        </p>

        <div className="flex-row" style={{ gap: '1rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: authenticated ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${authenticated ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
          }}>
            {authenticated ? '✅' : '🔌'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sf-text)' }}>
              {authenticated && user ? user.displayName : t('config.noConectado')}
            </div>
            <div className="text-xs text-dim">
              {authenticated
                ? t('config.sesionActiva')
                : t('config.conectaTwitch')}
            </div>
          </div>
          {!authLoading && !authenticated && (
            <div className="flex-row--gap-sm" style={{ flexShrink: 0 }}>
              <button
                onClick={login}
                className="sf-btn"
                style={{
                  background: 'linear-gradient(135deg, #9147ff 0%, #6441a5 100%)',
                  color: '#fff', fontSize: '0.8rem', padding: '0.5rem 1rem',
                  gap: '0.4rem', boxShadow: '0 2px 12px rgba(145,71,255,0.35)', whiteSpace: 'nowrap',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                </svg>
                {t('config.conectar')}
              </button>
              <button
                onClick={loginBrowser}
                className="sf-btn sf-btn-ghost"
                style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}
                title={t('config.loginNavegadorTitle')}
              >
                {t('config.loginNavegador')}
              </button>
            </div>
          )}
          {!authLoading && authenticated && (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="sf-btn sf-btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', color: 'var(--sf-text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {t('config.desconectar')}
            </button>
          )}
          <ConfirmModal
            open={showLogoutConfirm}
            title={t('config.confirmLogoutTitle')}
            message={t('config.confirmLogoutMsg')}
            confirmLabel={t('config.desconectar')}
            onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
            onCancel={() => setShowLogoutConfirm(false)}
            showDontAskAgain
          />
        </div>

        {/* ── Device Code Dialog ── */}
        {(deviceState.status !== 'idle' || deviceState.error) && (
          <div className={styles.authBox}>
            {deviceState.status === 'loading' && (
              <div className="text-sm text-muted text-center">{t('config.conectando')}</div>
            )}

            {deviceState.status === 'polling' && (
              <>
                <p className="text-sm" style={{ fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.75rem' }}>
                  {t('config.authTitle')}
                </p>
                <ol style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.8, paddingLeft: '1.25rem', marginBottom: '1rem' }}>
                  <li>{t('config.authAbre')} <strong style={{ color: '#a78bfa' }}>{deviceState.verificationUri}</strong> {t('config.authEnNavegador')}</li>
                  <li>{t('config.authCodigo')} <strong className={styles.authCode}>{deviceState.userCode}</strong></li>
                  <li>{t('config.authInstrucciones')}</li>
                </ol>
                <div className="flex-row--gap-sm">
                  <a
                    href={deviceState.verificationUri || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="sf-btn"
                    style={{
                      background: 'linear-gradient(135deg, #9147ff 0%, #6441a5 100%)',
                      color: '#fff', fontSize: '0.78rem', padding: '0.4rem 0.875rem',
                      flex: 1, justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center'
                    }}
                  >
                    {t('config.abrirTwitchActivate')}
                  </a>
                  <button
                    onClick={cancelDeviceLogin}
                    className="sf-btn"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--sf-text-2)', fontSize: '0.78rem',
                      padding: '0.4rem 0.875rem',
                    }}
                  >
                    {t('config.cancelar')}
                  </button>
                </div>
              </>
            )}

            {deviceState.error && (
              <p className="sf-error-text">{deviceState.error}</p>
            )}
          </div>
        )}

        {/* Channel connector */}
        <div className={styles.channelSection}>
          <label className="sf-label mb-2" style={{ fontWeight: 500 }}>
            {t('config.canalActivo')}
          </label>
          <div className="flex-row--gap-sm">
            <span style={{ fontSize: '1rem', color: 'var(--sf-text-3)' }}>#</span>
            <input
              type="text"
              value={channel}
              placeholder={t('config.canalPlaceholder')}
              className="sf-input"
              style={{ flex: 1 }}
              readOnly
            />
            <div
              className={`sf-badge ${connected ? 'sf-badge-success' : 'sf-badge-danger'}`}
              style={{ flexShrink: 0 }}
            >
              <span className={styles.statusDot} style={{ background: connected ? 'var(--sf-success)' : 'var(--sf-danger)' }} />
              {connected ? t('config.conectadoBadge') : t('config.desconectadoBadge')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Re-auth note ── */}
      {authenticated && (
        <div className={styles.reauthNote}>
          {t('config.infoEventsub')}
        </div>
      )}

      {/* ── Always on top ── */}
      {window.streamforger && (
        <div className="glass-card sf-card">
          <p className="sf-section-title">{t('config.ventanaTitle')}</p>

          <div className="flex-between">
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.1rem' }}>
                {t('config.siempreEncima')}
              </div>
              <div className="text-xs text-dim">{t('config.siempreEncimaDesc')}</div>
            </div>
            <Toggle
              checked={alwaysOnTop}
              onChange={toggleAlwaysOnTop}
            />
          </div>
        </div>
      )}

      {/* ── Language ── */}
      <div className="glass-card sf-card">
        <p className="sf-section-title">{t('config.languageTitle') || 'Idioma / Language'}</p>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
          {t('config.languageDesc') || 'Selecciona el idioma de la interfaz.'}
        </p>

        <div className="flex-row flex-wrap" style={{ gap: '0.75rem' }}>
          {[
            { id: 'auto', label: 'Auto', icon: '🌐' },
            { id: 'es', label: 'Español', icon: '🇪🇸' },
            { id: 'en', label: 'English', icon: '🇬🇧' },
            { id: 'fr', label: 'Français', icon: '🇫🇷' },
            { id: 'de', label: 'Deutsch', icon: '🇩🇪' },
            { id: 'it', label: 'Italiano', icon: '🇮🇹' },
          ].map(lang => (
            <button
              key={lang.id}
              onClick={() => setLocale(lang.id as any)}
              className={`sf-btn ${localeSetting === lang.id ? 'sf-btn-primary' : 'sf-btn-ghost'}`}
              style={{ flex: 1, minWidth: '100px', padding: '0.6rem', justifyContent: 'center' }}
            >
              <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>{lang.icon}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OBS WebSocket ── */}
      <div className="glass-card sf-card">
        <p className="sf-section-title">{t('obs.obsWsTitle')}</p>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
          {t('obs.obsWsHelp')}
        </p>

        <div className="flex-col flex-col--gap-sm">
          {!obsConnected ? (
            <>
              <div className="flex-row flex-row--gap-sm" style={{ alignItems: 'center' }}>
                <input type="text" value={obsHost} onChange={(e) => setObsHost(e.target.value)} placeholder={t('obs.obsWsHost')} className="sf-input text-xs" style={{ width: 140 }} />
                <span style={{ color: 'var(--sf-text-3)' }}>:</span>
                <input type="text" value={obsPort} onChange={(e) => setObsPort(e.target.value)} placeholder="4455" className="sf-input text-xs" style={{ width: 70 }} />
                <input type="password" value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} placeholder={t('obs.obsWsPassword')} className="sf-input text-xs" style={{ width: 140 }} />
                <button onClick={connectObs} disabled={obsConnecting} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
                  {obsConnecting ? '...' : t('obs.obsWsConnect')}
                </button>
              </div>
              {obsError && <p className="text-xs" style={{ color: '#ef4444' }}>{obsError}</p>}
            </>
          ) : (
            <div className="flex-row flex-row--gap-sm" style={{ alignItems: 'center' }}>
              <span className="sf-badge sf-badge-success text-xs">{t('obs.obsWsConnected')}</span>
              <span className="text-xs" style={{ color: 'var(--sf-text-3)' }}>{t('obs.obsWsConnectedTo')} {obsHost}:{obsPort}</span>
              <button onClick={disconnectObs} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                {t('obs.obsWsDisconnect')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── UI Zoom ── */}
      <div className="glass-card sf-card">
        <p className="sf-section-title">{t('config.uiZoomTitle') || 'Tamaño de la interfaz'}</p>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
          {t('config.uiZoomDesc') || 'Ajusta el zoom para monitores 2K/4K o según tu preferencia visual.'}
        </p>

        <div className="flex-row flex-wrap" style={{ gap: '0.75rem' }}>
          {[
            { id: 'auto', label: t('config.zoomAuto') || 'Auto' },
            { id: '100', label: t('config.zoomNormal') || '100%' },
            { id: '125', label: t('config.zoomLarge') || '125%' },
            { id: '150', label: t('config.zoomXLarge') || '150%' },
            { id: '200', label: t('config.zoomHuge') || '200%' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => handleZoomChange(opt.id)}
              className={`sf-btn ${uiZoom === opt.id ? 'sf-btn-primary' : 'sf-btn-ghost'}`}
              style={{ flex: 1, minWidth: '80px', padding: '0.6rem', justifyContent: 'center' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── About ── */}
      <div className="glass-card sf-card">
        <p className="sf-section-title">{t('config.acercaDe')}</p>

        <div className="flex-row" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="animate-float"><Logo size={48} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--sf-text)' }}>
              {t('config.appName')}
            </div>
            <div className="text-xs text-dim" style={{ marginTop: '2px' }}>
              {t('config.appVersion')}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted" style={{ lineHeight: 1.7, marginBottom: '1.25rem' }}>
          {t('config.appDesc')}
        </p>

        <div className="flex-row flex-wrap" style={{ gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button className={styles.updateBtn} onClick={checkUpdate} disabled={updateStatus === 'checking'}>
            {updateStatus === 'checking' ? t('config.updateChecking') : t('config.checkUpdate')}
          </button>
          {updateStatus === 'uptodate' && (
            <span className="text-xs" style={{ color: '#4ade80' }}>{t('config.updateUpToDate')}</span>
          )}
          {updateStatus === 'available' && (
            <span className="text-xs" style={{ color: '#fbbf24' }}>
              {t('config.updateAvailable', { version: updateVersion })}
            </span>
          )}
          {updateStatus === 'error' && (
            <span className="text-xs" style={{ color: '#f87171' }}>{t('config.updateError')}</span>
          )}
        </div>

        <div className={styles.githubBox}>
          <span style={{ fontSize: '1.25rem' }}>🐙</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)' }}>
              {t('config.githubTitle')}
            </div>
            <div className="text-xs text-dim">{t('config.githubDesc')}</div>
          </div>
          <a
            href="https://github.com/JuanEntrena18/StreamForge"
            target="_blank"
            rel="noreferrer"
            className={styles.githubBtn}
          >
            {t('config.irRepo')}
          </a>
        </div>

        <div className={styles.licenseLine}>{t('config.licencia')}</div>
      </div>
    </div>
  );
}
