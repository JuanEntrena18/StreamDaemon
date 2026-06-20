import { useTranslation } from '../i18n/context';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { Logo } from './Logo';

interface Props {
  onComplete: () => void;
}

const LS_KEY = 'streamforger-setup-complete';

export function isSetupComplete(): boolean {
  try { return localStorage.getItem(LS_KEY) === 'true'; } catch { return false; }
}

export function markSetupComplete() {
  try { localStorage.setItem(LS_KEY, 'true'); } catch {}
}

export function SetupWizard({ onComplete }: Props) {
  const { t } = useTranslation();
  const { authenticated, user, loading: authLoading, login, loginBrowser, deviceState, cancelDeviceLogin } = useAuthStatus();

  const handleFinish = () => {
    markSetupComplete();
    onComplete();
  };

  const steps = [
    { key: 'twitch', label: t('setup.twitch'), done: authenticated },
    { key: 'youtube', label: t('setup.youtube'), done: false, comingSoon: true },
    { key: 'tiktok', label: t('setup.tiktok'), done: false, comingSoon: true },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--sf-bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,58,237,0.15) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 50% 80%, rgba(99,102,241,0.1) 0%, transparent 70%)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 540, padding: '2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Logo size={56} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sf-text)', margin: '0 0 0.35rem' }}>
            {t('setup.welcome')}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-3)', margin: 0 }}>
            {t('setup.description')}
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {steps.map((step, i) => (
            <div
              key={step.key}
              className="sf-card"
              style={{
                padding: '1.25rem',
                opacity: step.comingSoon ? 0.5 : 1,
                border: step.done ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--sf-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                {/* Step number / status */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700,
                  background: step.done ? 'rgba(34,197,94,0.15)' : step.comingSoon ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.15)',
                  color: step.done ? '#22c55e' : step.comingSoon ? 'var(--sf-text-3)' : 'var(--sf-primary)',
                  border: step.done ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                }}>
                  {step.done ? '✓' : step.comingSoon ? '⏳' : i + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--sf-text)', marginBottom: '0.25rem' }}>
                    {step.label}
                    {step.comingSoon && (
                      <span style={{
                        marginLeft: '0.5rem', fontSize: '0.65rem', fontWeight: 600,
                        background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                        padding: '0.1rem 0.5rem', borderRadius: 99,
                      }}>
                        {t('setup.comingSoon')}
                      </span>
                    )}
                  </div>

                  {step.key === 'twitch' && (
                    <div>
                      {!authLoading && authenticated && user ? (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                          background: 'rgba(16,185,129,0.1)',
                          border: '1px solid rgba(16,185,129,0.25)',
                          borderRadius: 99, padding: '0.3rem 0.75rem',
                        }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                          }}>
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#22c55e' }}>
                            {user.displayName}
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--sf-text-2)', lineHeight: 1.6 }}>
                          <p style={{ margin: '0 0 0.5rem' }}>{t('setup.connectTwitchDesc')}</p>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={login}
                              className="sf-btn"
                              style={{
                                background: 'linear-gradient(135deg, #9147ff 0%, #6441a5 100%)',
                                color: '#fff', fontSize: '0.78rem', padding: '0.5rem 1rem',
                                gap: '0.4rem', boxShadow: '0 2px 12px rgba(145,71,255,0.35)',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                              </svg>
                              {t('setup.connectDeviceCode')}
                            </button>
                            {!authLoading && (
                              <button
                                onClick={loginBrowser}
                                className="sf-btn sf-btn-ghost"
                                style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                              >
                                {t('setup.loginBrowser')}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Device Code Dialog */}
                      {deviceState.status === 'polling' && (
                        <div style={{
                          marginTop: '1rem', padding: '1rem',
                          background: 'rgba(124,58,237,0.08)',
                          border: '1px solid rgba(124,58,237,0.25)',
                          borderRadius: 'var(--sf-radius-sm)',
                        }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.75rem' }}>
                            {t('config.authTitle')}
                          </p>
                          <ol style={{ fontSize: '0.8rem', color: 'var(--sf-text-2)', lineHeight: 1.8, paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
                            <li>
                              {t('config.authAbre')}{' '}
                              <strong style={{ color: '#a78bfa' }}>{deviceState.verificationUri}</strong>{' '}
                              {t('config.authEnNavegador')}
                            </li>
                            <li>
                              {t('config.authCodigo')}{' '}
                              <strong style={{
                                fontSize: '1.3rem', fontFamily: 'monospace',
                                color: '#c4b5fd', letterSpacing: '0.15em',
                                background: 'rgba(0,0,0,0.25)', padding: '0.15rem 0.6rem',
                                borderRadius: 6,
                              }}>
                                {deviceState.userCode}
                            </strong></li>
                            <li>{t('config.authInstrucciones')}</li>
                          </ol>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                if (deviceState.verificationUri) window.open(deviceState.verificationUri, '_blank');
                              }}
                              className="sf-btn"
                              style={{
                                background: 'linear-gradient(135deg, #9147ff 0%, #6441a5 100%)',
                                color: '#fff', fontSize: '0.75rem', padding: '0.35rem 0.75rem',
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
                                color: 'var(--sf-text-2)', fontSize: '0.75rem',
                                padding: '0.35rem 0.75rem',
                              }}
                            >
                              {t('config.cancelar')}
                            </button>
                          </div>
                          {deviceState.error && (
                            <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.5rem' }}>
                              {deviceState.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {step.comingSoon && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', margin: 0 }}>
                      {step.key === 'youtube' ? t('setup.youtubeDesc') : t('setup.tiktokDesc')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Finish button */}
        <button
          onClick={handleFinish}
          disabled={!authenticated}
          className="sf-btn"
          style={{
            width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700,
            justifyContent: 'center',
            background: authenticated
              ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
              : 'rgba(255,255,255,0.08)',
            color: authenticated ? '#fff' : 'var(--sf-text-3)',
            cursor: authenticated ? 'pointer' : 'not-allowed',
            boxShadow: authenticated ? '0 2px 16px rgba(124,58,237,0.35)' : 'none',
          }}
        >
          {authenticated ? t('setup.start') : t('setup.connectFirst')}
        </button>
      </div>
    </div>
  );
}
