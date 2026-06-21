import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from './hooks/useSocket';
import { useAuthStatus } from './hooks/useAuthStatus';
import { useTranslation } from './i18n/context';
import { Sidebar } from './components/Sidebar';
import type { Tab, NavSection } from './components/Sidebar';
import { GiveawayPanel } from './components/GiveawayPanel';
import { PredictionPanel } from './components/PredictionPanel';
import { ObsPanel } from './components/ObsPanel';
import { ChatPanel } from './components/ChatPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { TrackerPanel } from './components/TrackerPanel';
import { HudPanel } from './components/HudPanel';
import { TimerPanel } from './components/TimerPanel';
import { ScoreboardPanel } from './components/ScoreboardPanel';
import { StreamDashboard } from './components/StreamDashboard';
import { ModPanel } from './components/ModPanel';
import { CommandsPanel } from './components/CommandsPanel';
import { SubathonPanel } from './components/SubathonPanel';
import { SplashScreen } from './components/SplashScreen';
import { SecurityPanel } from './components/SecurityPanel';
import { BitrateCalculatorPanel } from './components/BitrateCalculatorPanel';
import { VerticalStreamingPanel } from './components/VerticalStreamingPanel';
import { AlertSoundsPanel } from './components/AlertSoundsPanel';
import { AchievementsPanel } from './components/AchievementsPanel';
import { SetupWizard, isSetupComplete } from './components/SetupWizard';
import { TtsProvider, useTts } from './contexts/TtsContext';
import { ToastProvider } from './contexts/ToastContext';
import { TtsManager } from './components/TtsManager';
import styles from './App.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
const isDesktop = typeof window.streamforger !== 'undefined';

const APP_VERSION = '0.3.0';

// Clear stale localStorage keys when version changes
try {
  const storedVer = localStorage.getItem('streamforger-version');
  if (storedVer !== APP_VERSION) {
    const preserve = ['streamforger-version'];
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (!preserve.includes(k)) localStorage.removeItem(k);
    }
    localStorage.setItem('streamforger-version', APP_VERSION);
  }
} catch {}

export function App() {
  const { t, locale, setLocale } = useTranslation();
  const [backendReady, setBackendReady] = useState(false);
  const onReady = useCallback(() => setBackendReady(true), []);
  const { connected } = useSocket();
  const { authenticated, user, loading: authLoading, refresh } = useAuthStatus();
  const [channel, setChannel] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [setupComplete, setSetupComplete] = useState(isSetupComplete);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('streamforger-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Handle ?auth=success from browser login redirect
  const [showAuthSuccess, setShowAuthSuccess] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      refresh();
      setShowAuthSuccess(true);
      setTimeout(() => window.close(), 2000);
    }
  }, []);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  const userLogin = user?.login;
  useEffect(() => {
    if (userLogin && !channel) setChannel(userLogin);
  }, [userLogin]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!isDesktop) return;
    window.streamforger?.window.getAlwaysOnTop().then(setAlwaysOnTop);
  }, []);

  // Global channel join
  useEffect(() => {
    if (!channel || !socket) return;
    const join = () => socket.emit('join:channel', channel);
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [channel, socket]);

  if (!backendReady) return <SplashScreen onReady={onReady} />;
  if (!setupComplete) return <SetupWizard onComplete={() => setSetupComplete(true)} />;

  function toggleAlwaysOnTop() {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    window.streamforger?.window.setAlwaysOnTop(next);
  }

  function toggleSidebarCollapse() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try { localStorage.setItem('streamforger-sidebar-collapsed', next ? 'true' : 'false'); } catch {}
  }

  function buildNav() {
    const s = (k: string) => t(`nav.${k}`);
    return [
      { id: 'gestor', label: s('gestorDelStream'), items: [{ id: 'dashboard' as Tab, icon: '📡', label: s('gestorTab') }] },
      { id: 'tracker-section', label: s('estadisticas'), items: [
        { id: 'tracker' as Tab, icon: '📈', label: s('trackerTab') },
        { id: 'achievements' as Tab, icon: '🏆', label: s('achievementsTab') },
      ]},
      { id: 'chat-section', label: s('chat'), items: [{ id: 'chat' as Tab, icon: '💬', label: s('chatTab') }] },
      { id: 'security-section', label: s('seguridad'), items: [{ id: 'security' as Tab, icon: '🔒', label: s('antiBotsTab') }] },
      { id: 'mod-section', label: s('mod'), items: [{ id: 'mod' as Tab, icon: '🛡️', label: s('moderacionTab') }] },
      { id: 'commands-section', label: s('comandos'), items: [{ id: 'commands' as Tab, icon: '🤖', label: s('comandosTab') }] },
      { id: 'tools', label: s('herramientas'), items: [
        { id: 'obs' as Tab,        icon: '🎮', label: s('gameOverlaysTab') },
        { id: 'subathon' as Tab,   icon: '🔴', label: s('subathonTab') },
        { id: 'giveaway' as Tab,   icon: '🎁', label: s('sorteosTab') },
        { id: 'prediction' as Tab, icon: '📊', label: s('prediccionesTab') },
        { id: 'hud' as Tab,        icon: '📊', label: s('hudTab') },
        { id: 'timer' as Tab,      icon: '⏱️', label: s('temporizadorTab') },
        { id: 'scoreboard' as Tab, icon: '🏆', label: s('scoreboardTab') },
        { id: 'alertsounds' as Tab, icon: '🔊', label: s('alertsoundsTab') },
      ]},
      { id: 'utilidades-section', label: s('utilidades'), items: [
        { id: 'bitrate' as Tab,  icon: '🧮', label: s('bitrateTab') },
        { id: 'vertical' as Tab, icon: '📱', label: s('verticalTab') },
      ]},
      { id: 'config', label: s('configuracion'), items: [{ id: 'config' as Tab, icon: '⚙️', label: s('configTab') }] },
    ] as NavSection[];
  }

  return (
    <ToastProvider>
    <TtsProvider>
      <TtsManager />
      <TtsUserSync />
      {showAuthSuccess && (
        <div className={styles.authOverlay}>
          <div className={styles.authOverlayContent}>
            <div className={styles.authOverlayIcon}>✅</div>
            <h2 className={styles.authOverlayTitle}>{t('app.authSuccessTitle') || 'Login exitoso'}</h2>
            <p className={styles.authOverlayMsg}>
              {t('app.authSuccessMsg') || 'Ya puedes cerrar esta pestaña.'}
            </p>
          </div>
        </div>
      )}
      <div className={styles.root}>
        <div className={styles.bgGlow} style={{
          background: `
            radial-gradient(ellipse 60% 50% at 10% 0%, rgba(124,58,237,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 90% 100%, rgba(99,102,241,0.1) 0%, transparent 70%)
          `,
        }} />

        {/* ── Full-width top bar ── */}
        <div className={styles.titlebar} {...{ style: { WebkitAppRegion: 'drag' } as React.CSSProperties }}>
          <span className={styles.titlebarTitle}>StreamForger</span>

          {isDesktop && (
            <div className={styles.titlebarActions} {...{ style: { WebkitAppRegion: 'no-drag' } as React.CSSProperties }}>
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
          )}
        </div>

        {/* ── Body row ── */}
        <div className={styles.bodyRow}>

          <Sidebar
            collapsed={sidebarCollapsed && !isMobile}
            onToggleCollapse={toggleSidebarCollapse}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            navSections={buildNav()}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isDesktop={isDesktop}
            alwaysOnTop={alwaysOnTop}
            onToggleAlwaysOnTop={toggleAlwaysOnTop}
            locale={locale}
            onLocaleChange={setLocale}
            version={t('app.version')}
            t={t}
          />

          {/* ── Main ── */}
          <main className={styles.main}>

            {/* Top bar */}
            <header className={styles.header}>
              <div className={styles.headerLeft}>
                {isMobile && (
                  <button
                    onClick={() => setMobileOpen(true)}
                    className={styles.hamburger}
                  >☰</button>
                )}
                <div>
                  <h1 className={styles.pageTitle}>{t(`nav.${activeTab}Tab`)}</h1>
                  <p className={styles.pageSubtitle}>{t('app.panelControl')}</p>
                </div>
              </div>

              <div className={styles.headerRight}>
                {/* Channel input */}
                <div className={styles.channelInputWrap}>
                  <span className={styles.channelInputPrefix}>{t('app.hash')}</span>
                  <input
                    type="text"
                    placeholder={t('app.placeholderCanal')}
                    value={channel}
                    onChange={(e) => setChannel(e.target.value.replace(/^#/, '').toLowerCase())}
                    className={`sf-input ${styles.channelInput}`}
                  />
                </div>

                {/* Twitch Auth */}
                {!authLoading && authenticated && user ? (
                  <div className={styles.userBadge}>
                    <div className={styles.userAvatar}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className={styles.userName}>{user.displayName}</span>
                    <span className={styles.userDot} />
                  </div>
                ) : !authLoading ? (
                  <button
                    onClick={() => setActiveTab('config')}
                    className={`sf-btn ${styles.connectBtn}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                    </svg>
                    {t('app.conectarTwitch')}
                  </button>
                ) : null}

                {/* Connection badge */}
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

            {/* Content */}
            <div className={styles.content}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {activeTab === 'dashboard' && <StreamDashboard channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'tracker'   && <TrackerPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'security' && <SecurityPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'chat'     && <ChatPanel channel={channel} />}
                  {activeTab === 'mod'         && <ModPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'commands'    && <CommandsPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'subathon'    && <SubathonPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'giveaway'    && <GiveawayPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'prediction'  && <PredictionPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'hud'         && <HudPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'timer'       && <TimerPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'scoreboard'  && <ScoreboardPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'obs'         && <ObsPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'bitrate'    && <BitrateCalculatorPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'vertical'   && <VerticalStreamingPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'alertsounds' && <AlertSoundsPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'achievements' && <AchievementsPanel channel={channel} backendUrl={BACKEND_URL} />}
                  {activeTab === 'config'      && <ConfigPanel channel={channel} alwaysOnTop={alwaysOnTop} toggleAlwaysOnTop={toggleAlwaysOnTop} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </TtsProvider>
    </ToastProvider>
  );
}

function TtsUserSync() {
  const { user } = useAuthStatus();
  const { setCurrentUserId } = useTts();
  useEffect(() => {
    setCurrentUserId(user?.id ?? null);
  }, [user?.id, setCurrentUserId]);
  return null;
}
