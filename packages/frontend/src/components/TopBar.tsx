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
  pageTitle: string;
  channel: string;
  onChannelChange: (channel: string) => void;
  authLoading: boolean;
  authenticated: boolean;
  user: UserInfo | null;
  connected: boolean;
  isLive?: boolean;
  onNavigateConfig: () => void;
  t: (key: string) => string;
}

export function TopBar({
  isDesktop, isMobile, onMobileToggle, pageTitle,
  channel, onChannelChange,
  authLoading, authenticated, user, connected, isLive = false,
  onNavigateConfig, t,
}: Props) {
  return (
    <>
      {/* Barra de ventana (Electron) */}
      {isDesktop && (
        <div
          className={styles.titlebar}
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className={styles.titlebarTitle}>StreamDaemon</span>
          <div
            className={styles.titlebarActions}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => window.streamforger?.window.minimize()}
              title={t('app.minimizar')}
              aria-label={t('app.minimizar')}
              className={styles.winBtn}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
            <button
              onClick={() => window.streamforger?.window.close()}
              title={t('app.cerrar')}
              aria-label={t('app.cerrar')}
              className={`${styles.winBtn} ${styles.winBtnClose}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke="currentColor" strokeWidth="1.4" />
                <line x1="7.5" y1="2.5" x2="2.5" y2="7.5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {isMobile && (
            <button
              onClick={onMobileToggle}
              className={styles.hamburger}
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          {isLive && (
            <span className="sf-live-badge">
              <span className="sf-live-dot" />
              LIVE
            </span>
          )}
        </div>

        <div className={styles.headerRight}>
          {/* Canal */}
          <div className={styles.channelInputWrap}>
            <span className={styles.channelInputPrefix}>#</span>
            <input
              type="text"
              placeholder={t('app.placeholderCanal')}
              value={channel}
              onChange={(e) => onChannelChange(e.target.value.replace(/^#/, '').toLowerCase())}
              className={`sf-input ${styles.channelInput}`}
              aria-label={t('app.placeholderCanal')}
              data-channel-input
            />
          </div>

          {/* Estado de conexión con el backend */}
          <span
            className={`${styles.connStatus} ${connected ? styles.connStatusOn : styles.connStatusOff}`}
            title={connected ? t('app.conectado') : t('app.desconectado')}
          >
            <span className={styles.connDot} />
            {connected ? t('app.conectado') : t('app.desconectado')}
          </span>

          {/* Cuenta de Twitch */}
          {!authLoading && authenticated && user ? (
            <div className={styles.userBadge}>
              <div className={styles.userAvatar}>
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className={styles.avatarImg} />
                ) : (
                  user.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <span className={styles.userName}>{user.displayName}</span>
            </div>
          ) : !authLoading ? (
            <button
              onClick={onNavigateConfig}
              className={`sf-btn sf-btn-primary ${styles.connectBtn}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
              {t('app.conectarTwitch')}
            </button>
          ) : null}
        </div>
      </header>
    </>
  );
}
