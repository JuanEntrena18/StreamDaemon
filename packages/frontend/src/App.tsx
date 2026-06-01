import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from './hooks/useSocket';
import { GiveawayPanel } from './components/GiveawayPanel';
import { PredictionPanel } from './components/PredictionPanel';
import { TransparentOverlay } from './components/TransparentOverlay';
import { ObsPanel } from './components/ObsPanel';
import { Logo } from './components/Logo';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
const isDesktop = typeof window.streamforger !== 'undefined';

type Tab = 'giveaway' | 'prediction' | 'overlay' | 'obs';

const NAV_ITEMS: { id: Tab; icon: string; label: string; desktopOnly?: boolean }[] = [
  { id: 'giveaway',   icon: '🎁', label: 'Sorteos' },
  { id: 'prediction', icon: '📊', label: 'Predicciones' },
  { id: 'overlay',    icon: '🪟', label: 'Overlay', desktopOnly: true },
  { id: 'obs',        icon: '🔌', label: 'OBS URLs' },
];

export function App() {
  const { connected } = useSocket();
  const [channel, setChannel] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('giveaway');

  const visibleTabs = NAV_ITEMS.filter((t) => !t.desktopOnly || isDesktop);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--sf-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration blobs */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 10% 0%, rgba(124,58,237,0.12) 0%, transparent 70%),
          radial-gradient(ellipse 50% 40% at 90% 100%, rgba(99,102,241,0.1) 0%, transparent 70%)
        `,
      }} />

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220,
        minHeight: '100vh',
        background: 'rgba(13,13,30,0.95)',
        borderRight: '1px solid var(--sf-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: '0 1.25rem 1.75rem', borderBottom: '1px solid var(--sf-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div className="animate-float">
              <Logo size={38} />
            </div>
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

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p className="sf-section-title" style={{ paddingLeft: '0.5rem' }}>Herramientas</p>
          {visibleTabs.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.15))'
                    : 'transparent',
                  color: isActive ? 'var(--sf-text)' : 'var(--sf-text-2)',
                  borderLeft: isActive ? '2px solid var(--sf-primary)' : '2px solid transparent',
                  outline: 'none',
                }}
              >
                <span style={{ fontSize: '1rem', minWidth: '1.25rem' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--sf-border)',
          fontSize: '0.7rem',
          color: 'var(--sf-text-3)',
          lineHeight: 1.6,
        }}>
          <div>v0.1.0 · Open Source</div>
          <a
            href="https://github.com/cyber-haute-couture"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--sf-primary-light)', textDecoration: 'none' }}
          >
            GitHub ↗
          </a>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>

        {/* Top bar */}
        <header style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid var(--sf-border)',
          background: 'rgba(13,13,30,0.7)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--sf-text)', letterSpacing: '-0.01em' }}>
              {NAV_ITEMS.find(t => t.id === activeTab)?.label}
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)', marginTop: '1px' }}>
              Panel de control · StreamForger
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            {/* Channel input */}
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.85rem', color: 'var(--sf-text-3)', pointerEvents: 'none',
              }}>
                #
              </span>
              <input
                id="channel-input"
                type="text"
                placeholder="canal de twitch..."
                value={channel}
                onChange={(e) => setChannel(e.target.value.replace(/^#/, '').toLowerCase())}
                className="sf-input"
                style={{ paddingLeft: '1.5rem', width: '200px' }}
              />
            </div>

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
              {connected ? 'Conectado' : 'Desconectado'}
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
              {activeTab === 'giveaway' && (
                <GiveawayPanel channel={channel} backendUrl={BACKEND_URL} />
              )}
              {activeTab === 'prediction' && (
                <PredictionPanel channel={channel} backendUrl={BACKEND_URL} />
              )}
              {activeTab === 'overlay' && isDesktop && (
                <TransparentOverlay channel={channel} />
              )}
              {activeTab === 'obs' && (
                <ObsPanel channel={channel} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
