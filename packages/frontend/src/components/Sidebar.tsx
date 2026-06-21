import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import type { Locale } from '../i18n/types';
import styles from './Sidebar.module.css';

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

  const sidebarContent = (
    <>
      <div className={collapsed ? styles.brandSectionCollapsed : styles.brandSectionExpanded}>
        {collapsed ? (
          <div className="animate-float"><Logo size={28} /></div>
        ) : (
          <div className={styles.brandSection}>
            <div className="animate-float"><Logo size={38} /></div>
            <div>
              <div className={styles.brandName}>StreamForger</div>
              <div className={styles.brandSub}>by Cyber Haute Couture</div>
            </div>
          </div>
        )}
      </div>

      <nav className={`${styles.nav} ${collapsed ? styles.navCollapsed : styles.navExpanded}`}>
        {navSections.map((section) => (
          <div key={section.id}>
            {!collapsed && (
              <p className={`sf-section-title ${styles.sectionTitle}`}>{section.label}</p>
            )}
            <div className={`${styles.sectionItems} ${collapsed ? styles.sectionItemsCentered : ''}`}>
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
                    className={`${styles.navBtn} ${collapsed ? styles.navBtnCollapsed : styles.navBtnExpanded} ${active ? styles.navBtnActive : ''}`}
                  >
                    <span className={`${styles.navIcon} ${collapsed ? styles.navIconCollapsed : styles.navIconExpanded}`}>
                      {item.icon}
                    </span>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          className={styles.navLabel}
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
      <div className={`${styles.collapseArea} ${collapsed ? styles.collapseAreaCentered : styles.collapseAreaEnd}`}>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? t('app.expandirSidebar') || 'Expandir' : t('app.colapsarSidebar') || 'Colapsar'}
          className={`${styles.collapseBtn} ${!collapsed ? styles.collapseBtnWide : ''}`}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--sf-text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--sf-text-3)'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Overlay controls (desktop only) */}
      {isDesktop && !collapsed && (
        <div className={styles.overlaySection}>
          <p className="sf-section-title">{t('app.modoOverlay')}</p>
          <div className={styles.overlayRow}>
            <span className={styles.overlayLabel}>{t('app.siempreEncima')}</span>
            <button
              onClick={onToggleAlwaysOnTop}
              title={alwaysOnTop ? t('app.desactivarSiempreEncima') : t('app.activarSiempreEncima')}
              className={`${styles.toggle} ${alwaysOnTop ? styles.toggleOn : ''}`}
            >
              <span className={styles.toggleThumb} style={{ left: alwaysOnTop ? 'calc(100% - 18px)' : 2 }} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className={styles.footer}>
          <div>{version}</div>
          <div className={styles.footerRow}>
            <select
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value as Locale)}
              className={styles.langSelect}
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
            className={styles.footerLink}
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
        className={styles.sidebar}
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
            className={styles.backdrop}
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
            className={styles.drawer}
          >
            <div className={styles.drawerHeader}>
              <button
                onClick={onMobileClose}
                className={styles.drawerClose}
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
