import { useTranslation } from '../i18n/context';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { Logo } from './Logo';
import styles from './SetupWizard.module.css';

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
  const { authenticated, user, loading: authLoading, login, deviceState, cancelDeviceLogin } = useAuthStatus();

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
    <div className={styles.wrapper}>
      <div className={styles.bgGlow} style={{
        background: `
          radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,58,237,0.15) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 50% 80%, rgba(99,102,241,0.1) 0%, transparent 70%)
        `,
      }} />

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoWrap}>
            <Logo size={56} />
          </div>
          <h1 className={styles.welcome}>
            {t('setup.welcome')}
          </h1>
          <p className={styles.description}>
            {t('setup.description')}
          </p>
        </div>

        {/* Steps */}
        <div className={styles.steps}>
          {steps.map((step, i) => {
            let cardClass = styles.stepCard + ' sf-card';
            if (step.done) cardClass += ` ${styles['stepCard--done']}`;
            else if (step.comingSoon) cardClass += ` ${styles['stepCard--comingSoon']}`;
            else cardClass += ` ${styles['stepCard--pending']}`;

            let numClass = styles.stepNumber;
            if (step.done) numClass += ` ${styles['stepNumber--done']}`;
            else if (step.comingSoon) numClass += ` ${styles['stepNumber--comingSoon']}`;
            else numClass += ` ${styles['stepNumber--active']}`;

            return (
              <div key={step.key} className={cardClass}>
                <div className={styles.stepRow}>
                  <div className={numClass}>
                    {step.done ? '✓' : step.comingSoon ? '⏳' : i + 1}
                  </div>

                  <div className={styles.stepContent}>
                    <div className={styles.stepLabel}>
                      {step.label}
                      {step.comingSoon && (
                        <span className={styles.comingSoonBadge}>
                          {t('setup.comingSoon')}
                        </span>
                      )}
                    </div>

                    {step.key === 'twitch' && (
                      <div>
                        {!authLoading && authenticated && user ? (
                          <div className={styles.authBadge}>
                            <div className={styles.authAvatar}>
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.authName}>
                              {user.displayName}
                            </span>
                          </div>
                        ) : (
                          <div className={styles.connectDesc}>
                            <p className="mb-2">{t('setup.connectTwitchDesc')}</p>
                            <div className={styles.connectBtnWrap}>
                              <button
                                onClick={login}
                                className={`sf-btn ${styles.twitchBtn}`}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                                </svg>
                                {t('setup.connectDeviceCode')}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Device Code Dialog */}
                        {deviceState.status === 'polling' && (
                          <div className={styles.deviceCodeBox}>
                            <p className={styles.deviceCodeTitle}>
                              {t('config.authTitle')}
                            </p>
                            <ol className={styles.deviceCodeSteps}>
                              <li>
                                {t('config.authAbre')}{' '}
                                <strong className={styles.codeHighlight}>{deviceState.verificationUri}</strong>{' '}
                                {t('config.authEnNavegador')}
                              </li>
                              <li>
                                {t('config.authCodigo')}{' '}
                                <strong className={styles.codeValue}>
                                  {deviceState.userCode}
                              </strong></li>
                              <li>{t('config.authInstrucciones')}</li>
                            </ol>
                            <div className={styles.deviceActions}>
                              <a
                                href={deviceState.verificationUri || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className={`sf-btn ${styles.openTwitchBtn}`}
                                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                {t('config.abrirTwitchActivate')}
                              </a>
                              <button
                                onClick={cancelDeviceLogin}
                                className={`sf-btn ${styles.cancelBtn}`}
                              >
                                {t('config.cancelar')}
                              </button>
                            </div>
                            {deviceState.error && (
                              <p className={styles.errorText}>
                                {deviceState.error}
                              </p>
                            )}
                          </div>
                        )}

                        {deviceState.status === 'idle' && deviceState.error && (
                          <p className={styles.errorText} style={{ marginTop: '0.75rem', color: 'var(--sf-danger)', fontSize: '0.85rem' }}>
                            {deviceState.error}
                          </p>
                        )}
                      </div>
                    )}

                    {step.comingSoon && (
                      <p className={styles.comingSoonDesc}>
                        {step.key === 'youtube' ? t('setup.youtubeDesc') : t('setup.tiktokDesc')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Finish button */}
        <button
          onClick={handleFinish}
          disabled={!authenticated}
          className={`sf-btn ${styles.finishBtn} ${authenticated ? styles['finishBtn--ready'] : styles['finishBtn--disabled']}`}
        >
          {authenticated ? t('setup.start') : t('setup.connectFirst')}
        </button>
      </div>
    </div>
  );
}
