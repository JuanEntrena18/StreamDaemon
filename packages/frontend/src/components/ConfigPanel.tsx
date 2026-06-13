import { useTranslation } from '../i18n/context';
import { useSocket } from '../hooks/useSocket';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { Logo } from './Logo';

interface Props {
  channel: string;
  alwaysOnTop: boolean;
  toggleAlwaysOnTop: () => void;
}

export function ConfigPanel({ channel, alwaysOnTop, toggleAlwaysOnTop }: Props) {
  const { t } = useTranslation();
  const { connected } = useSocket();
  const { authenticated, user, loading: authLoading, login, loginBrowser, logout, deviceState, cancelDeviceLogin } = useAuthStatus();

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {t('config.title')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          {t('config.subtitle')}
        </p>
      </div>

      {/* ── Buy Me a Coffee ── */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">{t('config.apoyoTitle')}</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', marginBottom: '1rem', lineHeight: 1.5 }}>
          {t('config.apoyoDesc')}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <img
            src="/qr-code.png"
            alt="Buy Me a Coffee QR"
            style={{
              width: 120, height: 120, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--sf-border)', flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <a
              href="https://buymeacoffee.com/jentrena"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #FFDD00, #FFB800)',
                color: '#1a1a2e',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.15s',
                boxShadow: '0 2px 12px rgba(255,221,0,0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 4H3c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h8l1 3h-2c-.55 0-1 .45-1 1s.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1h-2l1-3h8c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zm-1 10H4V6h16v8z"/>
              </svg>
              {t('config.invitameCafe')}
            </a>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--sf-text-3)' }}>
              buymeacoffee.com/jentrena
            </div>
          </div>
        </div>
      </div>

      {/* ── Twitch Auth ── */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">{t('config.twitchTitle')}</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', marginBottom: '1rem', lineHeight: 1.5 }}>
          {t('config.twitchDesc')}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)' }}>
              {authenticated
                ? t('config.sesionActiva')
                : t('config.conectaTwitch')}
            </div>
          </div>
          {!authLoading && !authenticated && (
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
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
              onClick={logout}
              className="sf-btn sf-btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', color: 'var(--sf-text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {t('config.desconectar')}
            </button>
          )}
        </div>

        {/* ── Device Code Dialog ── */}
        {deviceState.status !== 'idle' && (
          <div style={{
            marginTop: '1.25rem', padding: '1.25rem',
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 'var(--sf-radius-sm)',
          }}>
            {deviceState.status === 'loading' && (
              <div style={{ fontSize: '0.85rem', color: 'var(--sf-text-2)', textAlign: 'center' }}>
                {t('config.conectando')}
              </div>
            )}

            {deviceState.status === 'polling' && (
              <>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.75rem' }}>
                  {t('config.authTitle')}
                </p>
                <ol style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.8, paddingLeft: '1.25rem', marginBottom: '1rem' }}>
                  <li>{t('config.authAbre')} <strong style={{ color: '#a78bfa' }}>{deviceState.verificationUri}</strong> {t('config.authEnNavegador')}</li>
                  <li>{t('config.authCodigo')} <strong style={{
                    fontSize: '1.4rem', fontFamily: 'monospace',
                    color: '#c4b5fd', letterSpacing: '0.15em',
                    background: 'rgba(0,0,0,0.25)', padding: '0.15rem 0.6rem',
                    borderRadius: 6, marginLeft: '0.25rem',
                  }}>{deviceState.userCode}</strong></li>
                  <li>{t('config.authInstrucciones')}</li>
                </ol>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      if (deviceState.verificationUri) {
                        if (window.streamforger?.isDesktop) {
                          window.open(deviceState.verificationUri, '_blank');
                        } else {
                          window.open(deviceState.verificationUri, '_blank');
                        }
                      }
                    }}
                    className="sf-btn"
                    style={{
                      background: 'linear-gradient(135deg, #9147ff 0%, #6441a5 100%)',
                      color: '#fff', fontSize: '0.78rem', padding: '0.4rem 0.875rem',
                      flex: 1, justifyContent: 'center',
                    }}
                  >
                    {t('config.abrirTwitchActivate')}
                  </button>
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
              <p style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '0.5rem' }}>
                {deviceState.error}
              </p>
            )}
          </div>
        )}

        {/* Channel connector */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--sf-border)' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.375rem', fontWeight: 500 }}>
            {t('config.canalActivo')}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
              className={connected ? 'sf-badge sf-badge-success' : 'sf-badge sf-badge-danger'}
              style={{ flexShrink: 0 }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: connected ? 'var(--sf-success)' : 'var(--sf-danger)',
                display: 'inline-block',
              }} />
              {connected ? t('config.conectadoBadge') : t('config.desconectadoBadge')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Re-auth note ── */}
      {authenticated && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--sf-radius-sm)', fontSize: '0.78rem', color: '#fbbf24',
          lineHeight: 1.5,
        }}>
          {t('config.infoEventsub')}
        </div>
      )}

      {/* ── Always on top ── */}
      {window.streamforger && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <p className="sf-section-title">{t('config.ventanaTitle')}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.1rem' }}>
                {t('config.siempreEncima')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)' }}>
                {t('config.siempreEncimaDesc')}
              </div>
            </div>
            <button
              onClick={toggleAlwaysOnTop}
              style={{
                width: 44, height: 24, borderRadius: 99,
                background: alwaysOnTop ? 'var(--sf-primary)' : 'var(--sf-border)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: alwaysOnTop ? 'calc(100% - 21px)' : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>
      )}

      {/* ── About ── */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">{t('config.acercaDe')}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="animate-float"><Logo size={48} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--sf-text)' }}>
              {t('config.appName')}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginTop: '2px' }}>
              {t('config.appVersion')}
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          {t('config.appDesc')}
        </p>

        <div style={{
          padding: '0.875rem 1rem',
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 'var(--sf-radius-sm)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>🐙</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)' }}>
              {t('config.githubTitle')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)' }}>
              {t('config.githubDesc')}
            </div>
          </div>
          <a
            href="https://github.com/JuanEntrena18/StreamForge"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '0.4rem 0.875rem',
              borderRadius: 'var(--sf-radius-sm)',
              background: 'rgba(124,58,237,0.2)',
              color: '#a78bfa',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {t('config.irRepo')}
          </a>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--sf-text-3)', textAlign: 'center' }}>
          {t('config.licencia')}
        </div>
      </div>

    </div>
  );
}
