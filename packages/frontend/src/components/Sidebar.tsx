import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import type { Locale } from '../i18n/types';

export type Tab = 'dashboard' | 'tracker' | 'security' | 'chat' | 'mod' | 'commands' | 'subathon' | 'giveaway' | 'prediction' | 'hud' | 'timer' | 'scoreboard' | 'obs' | 'config' | 'bitrate' | 'vertical' | 'alertsounds' | 'achievements';

export type NavItem = { id: Tab; icon: string; label: string };
export type NavSection = { id: string; label: string; items: NavItem[] };

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  navSections: NavSection[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isDesktop: boolean;
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  version: string;
  t: (key: string) => string;
}

const SIDEBAR_WIDTH_EXPANDED = 220;
const SIDEBAR_WIDTH_COLLAPSED = 56;

export function Sidebar({
  collapsed, onToggleCollapse, mobileOpen, onMobileClose,
  navSections, activeTab, onTabChange,
  isDesktop, alwaysOnTop, onToggleAlwaysOnTop,
  locale, onLocaleChange, version, t,
}: SidebarProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  const isActive = (tab: Tab) => activeTab === tab;

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.625rem',
    padding: '0.625rem 0.75rem', borderRadius: '10px', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem',
    fontWeight: 400, textAlign: 'left',
    transition: 'all 0.15s ease',
    background: 'transparent',
    color: 'var(--sf-text-2)',
    borderLeft: '2px solid transparent',
    outline: 'none',
    width: '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  };

  const sidebarContent = (
    <>
      <div style={{
        padding: collapsed ? '1rem 0' : '1.25rem 1.25rem 1rem',
        borderBottom: '1px solid var(--sf-border)',
        display: 'flex',
        justifyContent: collapsed ? 'center' : undefined,
      }}>
        {collapsed ? (
          <div className="animate-float"><Logo size={28} /></div>
        ) : (
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
        )}
      </div>

      <nav style={{
        flex: 1, padding: collapsed ? '1rem 0.25rem' : '1rem 0.75rem',
        display: 'flex', flexDirection: 'column', gap: collapsed ? '0.75rem' : '1.25rem',
        overflowY: 'auto',
      }}>
        {navSections.map((section) => (
          <div key={section.id}>
            {!collapsed && (
              <p className="sf-section-title" style={{ paddingLeft: '0.5rem', marginBottom: '0.5rem' }}>
                {section.label}
              </p>
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '0.15rem',
              alignItems: collapsed ? 'center' : undefined,
            }}>
              {section.items.map((item) => {
                const active = isActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      onMobileClose();
                    }}
                    title={collapsed ? item.label : undefined}
                    style={{
                      ...btnBase,
                      fontWeight: active ? 600 : 400,
                      background: active
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.15))'
                        : 'transparent',
                      color: active ? 'var(--sf-text)' : 'var(--sf-text-2)',
                      borderLeft: active ? '2px solid var(--sf-primary)' : '2px solid transparent',
                      justifyContent: collapsed ? 'center' : undefined,
                      padding: collapsed ? '0.625rem' : '0.625rem 0.75rem',
                      width: collapsed ? 44 : '100%',
                      minWidth: collapsed ? 44 : undefined,
                      borderRadius: collapsed ? '10px' : '10px',
                    }}
                  >
                    <span style={{ fontSize: collapsed ? '1.2rem' : '1rem', minWidth: collapsed ? undefined : '1.25rem' }}>
                      {item.icon}
                    </span>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ overflow: 'hidden' }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div style={{
        padding: collapsed ? '0.5rem 0' : '0.25rem 0.75rem',
        display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end',
      }}>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? t('app.expandirSidebar') || 'Expandir' : t('app.colapsarSidebar') || 'Colapsar'}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--sf-text-3)', fontSize: '0.85rem',
            padding: '0.4rem 0.5rem', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s',
            width: collapsed ? 44 : undefined,
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--sf-text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--sf-text-3)'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Overlay controls (desktop only) */}
      {isDesktop && !collapsed && (
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--sf-border)',
          display: 'flex', flexDirection: 'column', gap: '0.625rem',
        }}>
          <p className="sf-section-title">{t('app.modoOverlay')}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)' }}>
              {t('app.siempreEncima')}
            </span>
            <button
              onClick={onToggleAlwaysOnTop}
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
      {!collapsed && (
        <div style={{
          padding: '0.875rem 1.25rem',
          borderTop: '1px solid var(--sf-border)',
          fontSize: '0.7rem', color: 'var(--sf-text-3)', lineHeight: 1.6,
        }}>
          <div>{version}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <select
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value as Locale)}
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
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{
          background: 'rgba(13,13,30,0.95)',
          borderRight: '1px solid var(--sf-border)',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
        }}
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile drawer backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onMobileClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            ref={drawerRef}
            key="sidebar-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 101,
              width: '80vw',
              maxWidth: SIDEBAR_WIDTH_EXPANDED,
              background: 'rgba(13,13,30,0.98)',
              borderRight: '1px solid var(--sf-border)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'flex-end', padding: '0.5rem',
            }}>
              <button
                onClick={onMobileClose}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--sf-text-3)', fontSize: '1.25rem',
                  padding: '0.4rem 0.6rem', borderRadius: '6px',
                }}
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
