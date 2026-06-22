import type { Tab } from './Sidebar';
import styles from './TopBar.module.css';

interface UserInfo {
  displayName: string;
  profileImageUrl?: string;
  login: string;
}

interface Props {
  isDesktop: boolean;
  isMobile: boolean;
  onMobileToggle: () => void;
  channel: string;
  onChannelChange: (channel: string) => void;
  authLoading: boolean;
  authenticated: boolean;
  user: UserInfo | null;
  connected: boolean;
  activeTab: Tab;
  onNavigateConfig: () => void;
  t: (key: string) => string;
}

export function TopBar({
  isDesktop, isMobile, onMobileToggle,
  channel, onChannelChange,
  authLoading, authenticated, user, connected,
  activeTab, onNavigateConfig, t,
}: Props) {
  return (
    <>
      {/* Titlebar (Electron) */}
      {isDesktop && (
        <div className={styles.titlebar} style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <span className={styles.titlebarTitle}>StreamForger</span>
          <div className={styles.titlebarActions} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={() => window.streamforger?.window.minimize()}
              title={t('app.minimizar')}
              className={styles.winBtn}
              style={{ background: '#f59e0b' }}
            >-</button>
            <button
              onClick={() => window.streamforger?.window.close()}
              title={t('app.cerrar')}
              className={styles.winBtn}
              style={{ background: '#ef4444' }}
            >x</button>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {isMobile && (
            <button
              onClick={onMobileToggle}
              className={styles.hamburger}
            >☰</button>
          )}
          <div>
            <h1 className={styles.pageTitle}>{t(`nav.${activeTab}Tab`)}</h1>
            <p className={styles.pageSubtitle}>{t('app.panelControl')}</p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.channelInputWrap}>
            <span className={styles.channelInputPrefix}>{t('app.hash')}</span>
            <input
              type="text"
              placeholder={t('app.placeholderCanal')}
              value={channel}
              onChange={(e) => onChannelChange(e.target.value.replace(/^#/, '').toLowerCase())}
              className={`sf-input ${styles.channelInput}`}
            />
          </div>

          {!authLoading && authenticated && user ? (
            <div className={styles.userBadge}>
              <div className={styles.userAvatar}>
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className={styles.avatarImg} />
                ) : (
                  user.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <span className={styles.userName}>{user.displayName}</span>
              <span className={styles.userDot} />
            </div>
          ) : !authLoading ? (
            <button
              onClick={onNavigateConfig}
              className={`sf-btn ${styles.connectBtn}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
              {t('app.conectarTwitch')}
            </button>
          ) : null}

          <div
            className={`sf-badge ${connected ? 'sf-badge-success' : 'sf-badge-danger'}`}
            style={{ gap: '0.4rem' }}
          >
            <span
              className={connected ? 'animate-pulse-dot' : ''}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? 'var(--sf-success)' : 'var(--sf-danger)',
                display: 'inline-block',
              }}
            />
            {connected ? t('app.conectado') : t('app.desconectado')}
          </div>
        </div>
      </header>
    </>
  );
}
