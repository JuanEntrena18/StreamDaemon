import { useState } from 'react';
import { useTranslation } from '../i18n/context';
import { useSocket } from '../hooks/useSocket';
import { useAuthStatus } from '../hooks/useAuthStatus';
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
        {deviceState.status !== 'idle' && (
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
