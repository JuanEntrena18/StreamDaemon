import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from './hooks/useSocket';
import { useAuthStatus } from './hooks/useAuthStatus';
import { useTranslation } from './i18n/context';
import { apiGet } from './utils/api';
import { Sidebar } from './components/Sidebar';
import type { Tab, NavSection } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MainContent } from './components/MainContent';
import { SplashScreen } from './components/SplashScreen';
import { SetupWizard, isSetupComplete } from './components/SetupWizard';
import { CommandPalette } from './components/CommandPalette';
import { TtsProvider, useTts } from './contexts/TtsContext';
import { ToastProvider } from './contexts/ToastContext';
import { ChatProvider } from './contexts/ChatContext';
import { TtsManager } from './components/TtsManager';
import styles from './App.module.css';
const isDesktop = typeof window.streamforger !== 'undefined';

const APP_VERSION = '0.4.7';

// Clear stale localStorage keys when version changes
try {
  const storedVer = localStorage.getItem('streamforger-version');
  if (storedVer !== APP_VERSION) {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith('sf-cache-')) {
        localStorage.removeItem(k);
      }
    }
    localStorage.setItem('streamforger-version', APP_VERSION);
  }
} catch {}

export function App() {
  const { t } = useTranslation();
  const [backendReady, setBackendReady] = useState(false);
  const onReady = useCallback(() => setBackendReady(true), []);
  const { connected } = useSocket();
  const { authenticated, user, loading: authLoading, refresh } = useAuthStatus();
  const [channel, setChannel] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [tabDirection, setTabDirection] = useState(1);
  const [setupComplete, setSetupComplete] = useState(isSetupComplete);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('streamforger-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
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

  // Global badges tracking
  const [unreadChat, setUnreadChat] = useState(0);
  const [giveawayParticipants, setGiveawayParticipants] = useState(0);

  useEffect(() => {
    if (activeTab === 'chat') setUnreadChat(0);
  }, [activeTab]);

  useSocketEvent('chat:message', useCallback(() => {
    if (activeTab !== 'chat') setUnreadChat((c) => c + 1);
  }, [activeTab]));

  useEffect(() => {
    if (!channel) return;
    apiGet(`/giveaways/${channel}/active`)
      .then((r) => r.json())
      .then((data) => { if (data && data.id) setGiveawayParticipants(data.entries || 0); })
      .catch(() => {});
  }, [channel]);

  useSocketEvent('giveaway:start', useCallback((data: any) => {
    setGiveawayParticipants(data.entries || 0);
  }, []));

  useSocketEvent('giveaway:entry', useCallback((data: { count: number }) => {
    setGiveawayParticipants(data.count);
  }, []));

  useSocketEvent('giveaway:end', useCallback(() => {
    setGiveawayParticipants(0);
  }, []));

  const badges = {
    chat: unreadChat,
    giveaway: giveawayParticipants,
  };

  useEffect(() => {
    const handleNav = (e: Event) => {
      const customEvent = e as CustomEvent<Tab>;
      setActiveTab(customEvent.detail);
      setTabDirection(1);
    };
    window.addEventListener('navigateTab', handleNav);
    return () => window.removeEventListener('navigateTab', handleNav);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key;

      if (ctrl && !e.shiftKey && key >= '1' && key <= '9') {
        e.preventDefault();
        const navOrder = buildNav().flatMap(s => s.items.map(i => i.id));
        const idx = parseInt(key, 10) - 1;
        if (idx < navOrder.length) {
          handleTabChange(navOrder[idx]);
        }
        return;
      }

      if (ctrl && e.shiftKey && key.toLowerCase() === 'c') {
        e.preventDefault();
        handleTabChange('chat');
        return;
      }

      if (ctrl && key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab]);

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

  function handleTabChange(newTab: Tab) {
    const navOrder = buildNav().flatMap(s => s.items.map(i => i.id));
    const currentIndex = navOrder.indexOf(activeTab);
    const newIndex = navOrder.indexOf(newTab);
    setTabDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(newTab);
  }

  function buildNav() {
    const s = (k: string) => t(`nav.${k}`);
    return [
      { id: 'gestor', label: s('gestorDelStream'), items: [{ id: 'dashboard' as Tab, icon: '📡', label: s('gestorTab'), shortcut: 'Ctrl+1' }] },
      { id: 'tracker-section', label: s('estadisticas'), items: [
        { id: 'tracker' as Tab, icon: '📈', label: s('trackerTab'), shortcut: 'Ctrl+2' },
        { id: 'kpi' as Tab, icon: '📊', label: s('kpiTab'), shortcut: 'Ctrl+3' },
        { id: 'achievements' as Tab, icon: '🏆', label: s('achievementsTab') },
      ]},
      { id: 'chat-section', label: s('chat'), items: [{ id: 'chat' as Tab, icon: '💬', label: s('chatTab'), shortcut: 'Ctrl+4' }] },
      { id: 'security-section', label: s('seguridad'), items: [{ id: 'security' as Tab, icon: '🔒', label: s('antiBotsTab'), shortcut: 'Ctrl+5' }] },
      { id: 'mod-section', label: s('mod'), items: [{ id: 'mod' as Tab, icon: '🛡️', label: s('moderacionTab'), shortcut: 'Ctrl+6' }] },
      { id: 'commands-section', label: s('comandos'), items: [{ id: 'commands' as Tab, icon: '🤖', label: s('comandosTab'), shortcut: 'Ctrl+7' }] },
      { id: 'tools', label: s('herramientas'), items: [
        { id: 'builder' as Tab,   icon: '🎨', label: s('builderTab') },
        { id: 'obs' as Tab,       icon: '🎮', label: s('gameOverlaysTab'), shortcut: 'Ctrl+8' },
        { id: 'subathon' as Tab,   icon: '🔴', label: s('subathonTab'), shortcut: 'Ctrl+9' },
        { id: 'giveaway' as Tab,   icon: '🎁', label: s('sorteosTab') },
        { id: 'prediction' as Tab, icon: '📊', label: s('prediccionesTab') },
        { id: 'hud' as Tab,        icon: '📊', label: s('hudTab') },
        { id: 'timer' as Tab,      icon: '⏱️', label: s('temporizadorTab') },
        { id: 'scoreboard' as Tab, icon: '🏆', label: s('scoreboardTab') },
        { id: 'alertsounds' as Tab, icon: '🔊', label: s('alertsoundsTab') },
        { id: 'avatars' as Tab, icon: '👾', label: s('avatarsTab') },
        { id: 'speedrun' as Tab, icon: '🏃', label: s('speedrunTab') },
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
    <ChatProvider>
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
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
        onNavigate={handleTabChange} 
        alwaysOnTop={alwaysOnTop} 
        onToggleAlwaysOnTop={isDesktop ? toggleAlwaysOnTop : undefined}
      />
      <div className={styles.root}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div className={styles.bgGlow} style={{
          background: `
            radial-gradient(ellipse 60% 50% at 10% 0%, rgba(124,58,237,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 90% 100%, rgba(99,102,241,0.1) 0%, transparent 70%)
          `,
        }} />

        <TopBar
          isDesktop={isDesktop}
          isMobile={isMobile}
          onMobileToggle={() => setMobileOpen(true)}
          channel={channel}
          onChannelChange={setChannel}
          authLoading={authLoading}
          authenticated={authenticated}
          user={user}
          connected={connected}
          activeTab={activeTab}
          onNavigateConfig={() => setActiveTab('config')}
          t={t}
        />

        <div className={styles.bodyRow}>
          <Sidebar
            collapsed={sidebarCollapsed && !isMobile}
            onToggleCollapse={toggleSidebarCollapse}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            navSections={buildNav()}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isDesktop={isDesktop}
            alwaysOnTop={alwaysOnTop}
            onToggleAlwaysOnTop={toggleAlwaysOnTop}
            version={t('app.version')}
            t={t}
            badges={badges}
          />

          <main id="main-content" className={styles.main}>
            <MainContent
              activeTab={activeTab}
              tabDirection={tabDirection}
              channel={channel}
              alwaysOnTop={alwaysOnTop}
              toggleAlwaysOnTop={toggleAlwaysOnTop}
            />
          </main>
        </div>
      </div>
    </TtsProvider>
    </ChatProvider>
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

