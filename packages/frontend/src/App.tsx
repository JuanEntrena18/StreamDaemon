import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from './hooks/useSocket';
import { useAuthStatus } from './hooks/useAuthStatus';
import { useTranslation } from './i18n/context';
import type { Locale } from './i18n/types';
import { GiveawayPanel } from './components/GiveawayPanel';
import { PredictionPanel } from './components/PredictionPanel';
import { ObsPanel } from './components/ObsPanel';
import { Logo } from './components/Logo';
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
import { AlertSoundsPanel } from './components/AlertSoundsPanel';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
const isDesktop = typeof window.streamforger !== 'undefined';

type Tab = 'dashboard' | 'tracker' | 'security' | 'chat' | 'mod' | 'commands' | 'subathon' | 'giveaway' | 'prediction' | 'hud' | 'timer' | 'scoreboard' | 'obs' | 'config' | 'bitrate' | 'alertsounds';

export function App() {
  const { t, locale, setLocale } = useTranslation();
  const [backendReady, setBackendReady] = useState(false);
  const onReady = useCallback(() => setBackendReady(true), []);
  const { connected } = useSocket();
  const { authenticated, user, loading: authLoading } = useAuthStatus();
  const [channel, setChannel] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('chat');
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

  // Global channel join — keeps the main app socket in the channel regardless of active tab
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

  function toggleAlwaysOnTop() {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    window.streamforger?.window.setAlwaysOnTop(next);
  }

  function buildNav() {
    type NavItem = { id: Tab; icon: string; label: string };
    type NavSection = { id: string; label: string; items: NavItem[] };
    const s = (k: string) => t(`nav.${k}`);
    return [
      { id: 'gestor', label: s('gestorDelStream'), items: [{ id: 'dashboard' as Tab, icon: '📡', label: s('gestorTab') }] },
      { id: 'tracker-section', label: s('estadisticas'), items: [{ id: 'tracker' as Tab, icon: '📈', label: s('trackerTab') }] },
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
        { id: 'bitrate' as Tab,   icon: '📊', label: s('bitrateTab') },
        { id: 'alertsounds' as Tab, icon: '🔊', label: s('alertSoundsTab') },
      ]},
      { id: 'config', label: s('configuracion'), items: [{ id: 'config' as Tab, icon: '⚙️', label: s('configTab') }] },
    ] as NavSection[];
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sf-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 10% 0%, rgba(124,58,237,0.12) 0%, transparent 70%),
          radial-gradient(ellipse 50% 40% at 90% 100%, rgba(99,102,241,0.1) 0%, transparent 70%)
        `,
      }} />

      {/* ── Full-width top bar ── */}
      <div
        {...{ style: {
          height: 38,
          background: 'rgba(8,8,20,0.98)',
          borderBottom: '1px solid var(--sf-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px 0 14px',
          WebkitAppRegion: 'drag',
          flexShrink: 0,
          zIndex: 20,
        } as React.CSSProperties }}
      >
        <span style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', letterSpacing: '0.06em', fontWeight: 600, userSelect: 'none' }}>
          StreamForger
        </span>

        {isDesktop && (
          <div
          {...{ style: { display: 'flex', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties }}
          >
            <button
              onClick={() => window.streamforger?.window.minimize()}
              title={t('app.minimizar')}
              style={winBtnStyle('#f59e0b')}
            >-</button>
            <button
              onClick={() => window.streamforger?.window.close()}
              title={t('app.cerrar')}
              style={winBtnStyle('#ef4444')}
            >x</button>
          </div>
        )}
      </div>

      {/* ── Body row ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <aside style={{
          width: 220,
          background: 'rgba(13,13,30,0.95)',
          borderRight: '1px solid var(--sf-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Brand */}
          <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--sf-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div className="animate-float"><Logo size={38} /></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--sf-text)' }}>
                  StreamForger
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', marginTop: '1px' }}>
                  by Cyber Haute Couture
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
            {buildNav().map((section) => (
              <div key={section.id}>
                <p className="sf-section-title" style={{ paddingLeft: '0.5rem', marginBottom: '0.5rem' }}>
                  {section.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  {section.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.625rem',
                          padding: '0.625rem 0.75rem', borderRadius: '10px', border: 'none',
                          cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem',
                          fontWeight: isActive ? 600 : 400, textAlign: 'left',
                          transition: 'all 0.15s ease',
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.15))'
                            : 'transparent',
                          color: isActive ? 'var(--sf-text)' : 'var(--sf-text-2)',
                          borderLeft: isActive ? '2px solid var(--sf-primary)' : '2px solid transparent',
                          outline: 'none',
                          width: '100%',
                        }}
                      >
                        <span style={{ fontSize: '1rem', minWidth: '1.25rem' }}>{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Overlay controls (desktop only) */}
          {isDesktop && (
            <div style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--sf-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
            }}>
              <p className="sf-section-title">{t('app.modoOverlay')}</p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)' }}>
                  {t('app.siempreEncima')}
                </span>
                <button
                  onClick={toggleAlwaysOnTop}
                  title={alwaysOnTop ? t('app.desactivarSiempreEncima') : t('app.activarSiempreEncima')}
                  style={{
                    width: 38, height: 20, borderRadius: 99,
                    background: alwaysOnTop ? 'var(--sf-primary)' : 'var(--sf-border)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2,
                    left: alwaysOnTop ? 'calc(100% - 18px)' : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid var(--sf-border)',
            fontSize: '0.7rem', color: 'var(--sf-text-3)', lineHeight: 1.6,
          }}>
            <div>{t('app.version')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                style={{
                  padding: '1px 4px', borderRadius: 4, border: '1px solid var(--sf-border)',
                  background: 'transparent', color: 'var(--sf-text-2)', fontSize: '0.65rem',
                  fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
                <option value="fr">FR</option>
                <option value="de">DE</option>
                <option value="it">IT</option>
              </select>
            </div>
            <a
              href="https://github.com/JuanEntrena18/StreamForge"
              target="_blank" rel="noreferrer"
              style={{ color: 'var(--sf-primary-light)', textDecoration: 'none' }}
            >
              GitHub ↗
            </a>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Top bar */}
          <header style={{
            padding: '1rem 2rem',
            borderBottom: '1px solid var(--sf-border)',
            background: 'rgba(13,13,30,0.7)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            flexShrink: 0,
            zIndex: 5,
          }}>
            <div>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--sf-text)', letterSpacing: '-0.01em' }}>
                {t(`nav.${activeTab}Tab`)}
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)', marginTop: '1px' }}>
                {t('app.panelControl')}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {/* Channel input */}
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '0.85rem', color: 'var(--sf-text-3)', pointerEvents: 'none',
                }}>{t('app.hash')}</span>
                <input
                  type="text"
                  placeholder={t('app.placeholderCanal')}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value.replace(/^#/, '').toLowerCase())}
                  className="sf-input"
                  style={{ paddingLeft: '1.5rem', width: '180px' }}
                />
              </div>

              {/* Twitch Auth */}
              {!authLoading && authenticated && user ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(145,71,255,0.12)',
                  border: '1px solid rgba(145,71,255,0.3)',
                  borderRadius: '99px',
                  padding: '0.25rem 0.75rem 0.25rem 0.35rem',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--sf-text)', whiteSpace: 'nowrap' }}>
                    {user.displayName}
                  </span>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--sf-success)', display: 'inline-block', flexShrink: 0,
                  }} />
                </div>
              ) : !authLoading ? (
                <button
                  onClick={() => setActiveTab('config')}
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
                  {t('app.conectarTwitch')}
                </button>
              ) : null}

              {/* Connection badge */}
              <div
                className={connected ? 'sf-badge sf-badge-success' : 'sf-badge sf-badge-danger'}
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
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
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
                {activeTab === 'alertsounds' && <AlertSoundsPanel channel={channel} backendUrl={BACKEND_URL} />}
                {activeTab === 'config'      && <ConfigPanel channel={channel} alwaysOnTop={alwaysOnTop} toggleAlwaysOnTop={toggleAlwaysOnTop} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function winBtnStyle(color: string): React.CSSProperties {
  return {
    width: 14, height: 14, borderRadius: '50%',
    background: color, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)',
    transition: 'color 0.1s',
    padding: 0, lineHeight: 1,
  };
}
