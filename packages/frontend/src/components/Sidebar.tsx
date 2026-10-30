import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import { Toggle } from './Toggle';
import { useColorMode } from '../hooks/useColorMode';
import { useUiPreferences } from '../contexts/UiPreferencesContext';
import { TAB_ICONS } from './icons/tabIcons';
import {
  IconStar, IconStarFilled, IconChevronDown, IconChevronRight,
  IconMoon, IconSun, IconGlobe, IconCollapse, IconExpand,
  IconDownload, IconUpload,
} from './icons/icons';
import styles from './Sidebar.module.css';

export type Tab = 'dashboard' | 'tracker' | 'kpi' | 'security' | 'chat' | 'mod' | 'commands' | 'subathon' | 'giveaway' | 'prediction' | 'hud' | 'timer' | 'scoreboard' | 'obs' | 'builder' | 'config' | 'bitrate' | 'vertical' | 'alertsounds' | 'avatars' | 'stream-avatar' | 'speedrun' | 'calendar' | 'diary' | 'ads' | 'vibedaemon';

export type NavItem = { id: Tab; label: string; shortcut?: string };
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
  isLive?: boolean;
  version: string;
  t: (key: string) => string;
  badges?: Record<string, number>;
}

export function Sidebar({
  collapsed, onToggleCollapse, mobileOpen, onMobileClose,
  navSections, activeTab, onTabChange,
  isDesktop, alwaysOnTop, onToggleAlwaysOnTop,
  isLive = false,
  version, t, badges,
}: SidebarProps) {
  const { mode, toggleMode } = useColorMode();
  const {
    favorites, toggleFavorite,
    isSectionCollapsed, toggleSection,
    exportPreferences, importPreferences,
  } = useUiPreferences();

  const [showImportExport, setShowImportExport] = useState(false);

  const allItems = navSections.flatMap((s) => s.items);
  const favoriteItems = favorites
    .map((id) => allItems.find((item) => item.id === id))
    .filter(Boolean) as NavItem[];

  const isActive = (tab: Tab) => activeTab === tab;

  const handleExport = () => {
    const json = exportPreferences();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'streamdaemon-ui-preferences.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const json = ev.target?.result as string;
        importPreferences(json);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const NavButton = ({ item, showShortcut = true }: { item: NavItem; showShortcut?: boolean }) => {
    const Icon = TAB_ICONS[item.id];
    const active = isActive(item.id);
    const badge = badges?.[item.id];
    const isFav = favorites.includes(item.id);

    return (
      <div className={styles.navItemWrap}>
        <button
          onClick={() => { onTabChange(item.id); onMobileClose(); }}
          className={`${styles.navBtn} ${active ? styles.navBtnActive : ''}`}
          title={collapsed ? item.label + (item.shortcut ? ` (${item.shortcut})` : '') : undefined}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
        >
          <span className={`${styles.navIcon} ${active ? styles.navIconActive : ''}`}>
            <Icon size={16} />
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.12 }}
                className={styles.navLabel}
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && showShortcut && item.shortcut && (
            <span className={styles.navShortcut}>{item.shortcut}</span>
          )}
          {!collapsed && badge ? (
            <span className={styles.navBadge}>{badge > 99 ? '99+' : badge}</span>
          ) : null}
          {active && <motion.div layoutId="sidebar-active" className={styles.activeIndicator} />}
        </button>
        {!collapsed && (
          <button
            className={`${styles.favBtn} ${isFav ? styles.favBtnActive : ''}`}
            onClick={() => toggleFavorite(item.id)}
            title={isFav ? t('sidebar.removeFavorite') : t('sidebar.addFavorite')}
            aria-label={isFav ? t('sidebar.removeFavorite') : t('sidebar.addFavorite')}
          >
            {isFav ? <IconStarFilled size={11} /> : <IconStar size={11} />}
          </button>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={`${styles.header} ${collapsed ? styles.headerCollapsed : ''}`}>
        {collapsed ? (
          <div className={styles.logoWrap}><Logo size={28} /></div>
        ) : (
          <div className={styles.headerRow}>
            <div className={styles.logoWrap}><Logo size={30} /></div>
            <div className={styles.headerText}>
              <span className={styles.appName}>StreamDaemon</span>
              {isLive && (
                <span className="sf-live-badge">
                  <span className="sf-live-dot" />
                  EN VIVO
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className={`${styles.nav} ${collapsed ? styles.navCollapsed : ''}`}>
        {/* Favoritos */}
        {!collapsed && favoriteItems.length > 0 && (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>{t('sidebar.favorites')}</p>
            <div className={styles.sectionItems}>
              {favoriteItems.map((item) => (
                <NavButton key={`fav-${item.id}`} item={item} showShortcut={false} />
              ))}
            </div>
            <div className={styles.sectionDivider} />
          </div>
        )}

        {/* Secciones */}
        {navSections.map((section) => {
          const isCollapsed = collapsed ? false : isSectionCollapsed(section.id);
          return (
            <div key={section.id} className={styles.section}>
              {!collapsed && (
                <button
                  className={styles.sectionToggle}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={!isCollapsed}
                >
                  <span className={styles.sectionLabel}>{section.label}</span>
                  <span className={styles.sectionChevron}>
                    {isCollapsed ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />}
                  </span>
                </button>
              )}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className={`${styles.sectionItems} ${collapsed ? styles.sectionItemsCollapsed : ''}`}>
                      {section.items.map((item) => (
                        <NavButton key={item.id} item={item} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`${styles.footer} ${collapsed ? styles.footerCollapsed : ''}`}>
        {isDesktop && !collapsed && (
          <div className={styles.footerRow}>
            <span className={styles.footerLabel}>{t('app.siempreEncima')}</span>
            <Toggle checked={alwaysOnTop} onChange={onToggleAlwaysOnTop} size="sm" />
          </div>
        )}

        <div className={`${styles.footerActions} ${collapsed ? styles.footerActionsCollapsed : ''}`}>
          <button
            onClick={onToggleCollapse}
            className={styles.footerBtn}
            title={collapsed ? t('app.expandirSidebar') : t('app.colapsarSidebar')}
            aria-label={collapsed ? t('app.expandirSidebar') : t('app.colapsarSidebar')}
          >
            {collapsed ? <IconExpand size={15} /> : <IconCollapse size={15} />}
          </button>
          <button
            onClick={toggleMode}
            className={styles.footerBtn}
            title={t('app.toggleTheme')}
            aria-label={t('app.toggleTheme')}
          >
            {mode === 'light' ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>
          {!collapsed && (
            <>
              <button
                onClick={() => onTabChange('config')}
                className={styles.footerBtn}
                title={t('config.languageTitle')}
                aria-label={t('config.languageTitle')}
              >
                <IconGlobe size={15} />
              </button>
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className={styles.footerBtn}
                title={t('sidebar.importExport')}
                aria-label={t('sidebar.importExport')}
              >
                <IconDownload size={15} />
              </button>
            </>
          )}
        </div>

        {/* Import / Export panel */}
        <AnimatePresence>
          {showImportExport && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={styles.importExportPanel}
            >
              <p className={styles.importExportTitle}>{t('sidebar.importExport')}</p>
              <div className={styles.importExportActions}>
                <button className="sf-btn sf-btn-secondary" onClick={handleExport}>
                  <IconDownload size={13} /> {t('sidebar.export')}
                </button>
                <button className="sf-btn sf-btn-ghost" onClick={handleImport}>
                  <IconUpload size={13} /> {t('sidebar.import')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && <div className={styles.version}>{version}</div>}
      </div>
    </>
  );

  // Mobile drawer
  if (mobileOpen) {
    return (
      <>
        <div className={styles.backdrop} onClick={onMobileClose} />
        <div className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <button onClick={onMobileClose} className={styles.drawerClose}>✕</button>
          </div>
          {sidebarContent}
        </div>
      </>
    );
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      {sidebarContent}
    </aside>
  );
}
