import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import type { Tab } from './Sidebar';
import styles from './CommandPalette.module.css';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  shortcut?: string;
  keywords: string[];
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: Tab) => void;
  onToggleAlwaysOnTop?: () => void;
  alwaysOnTop?: boolean;
}

export function CommandPalette({ isOpen, onClose, onNavigate, onToggleAlwaysOnTop, alwaysOnTop }: CommandPaletteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Generate commands list dynamically
  const getCommands = (): CommandItem[] => {
    const s = (k: string) => t(`nav.${k}`);
    
    const navItems: CommandItem[] = [
      { id: 'dashboard', title: s('gestorTab'), description: 'Panel principal y controles rápidos', icon: '📡', shortcut: 'Ctrl+1', keywords: ['inicio', 'gestor', 'stream', 'panel'], action: () => onNavigate('dashboard') },
      { id: 'tracker', title: s('trackerTab'), description: 'Estadísticas en tiempo real', icon: '📈', shortcut: 'Ctrl+2', keywords: ['estadisticas', 'graficos', 'views', 'subs'], action: () => onNavigate('tracker') },
      { id: 'calendar', title: s('calendarTab'), description: 'Calendario de directos', icon: '📅', keywords: ['calendario', 'programación', 'streams'], action: () => onNavigate('calendar') },
      { id: 'diary', title: s('diaryTab'), description: 'Diario de juegos completados', icon: '🎮', keywords: ['diario', 'juegos', 'completados', 'hltb'], action: () => onNavigate('diary') },
      { id: 'ads', title: s('adsTab'), description: 'Publicidad con imágenes PNG', icon: '📢', keywords: ['publicidad', 'anuncios', 'ads', 'imagenes', 'marguesina'], action: () => onNavigate('ads') },
      { id: 'chat', title: s('chatTab'), description: 'Chat de Twitch integrado', icon: '💬', shortcut: 'Ctrl+4', keywords: ['chat', 'mensajes', 'leer'], action: () => onNavigate('chat') },
      { id: 'security', title: s('antiBotsTab'), description: 'Protección y anti-bots', icon: '🔒', shortcut: 'Ctrl+5', keywords: ['seguridad', 'antibot', 'proteccion'], action: () => onNavigate('security') },
      { id: 'mod', title: s('moderacionTab'), description: 'Herramientas de moderación', icon: '🛡️', shortcut: 'Ctrl+6', keywords: ['mod', 'ban', 'timeout', 'moderador'], action: () => onNavigate('mod') },
      { id: 'commands', title: s('comandosTab'), description: 'Comandos personalizados', icon: '🤖', shortcut: 'Ctrl+7', keywords: ['comandos', 'respuestas', 'bot'], action: () => onNavigate('commands') },
      { id: 'obs', title: s('gameOverlaysTab'), description: 'Overlays para juegos', icon: '🎮', shortcut: 'Ctrl+8', keywords: ['obs', 'juego', 'overlay', 'widget'], action: () => onNavigate('obs') },
      { id: 'subathon', title: s('subathonTab'), description: 'Configurar temporizador de subathon', icon: '🔴', shortcut: 'Ctrl+9', keywords: ['subathon', 'extensible', 'maraton'], action: () => onNavigate('subathon') },
      { id: 'giveaway', title: s('sorteosTab'), description: 'Sorteos en el chat', icon: '🎁', keywords: ['sorteo', 'giveaway', 'regalo'], action: () => onNavigate('giveaway') },
      { id: 'prediction', title: s('prediccionesTab'), description: 'Apuestas y predicciones', icon: '📊', keywords: ['prediccion', 'apuesta', 'puntos'], action: () => onNavigate('prediction') },
      { id: 'hud', title: s('hudTab'), description: 'Overlay HUD general', icon: '📊', keywords: ['hud', 'overlay'], action: () => onNavigate('hud') },
      { id: 'timer', title: s('temporizadorTab'), description: 'Cuenta regresiva', icon: '⏱️', keywords: ['temporizador', 'cuenta', 'atras', 'reloj'], action: () => onNavigate('timer') },
      { id: 'scoreboard', title: s('scoreboardTab'), description: 'Marcador de puntos', icon: '🏆', keywords: ['marcador', 'puntos', 'vs', 'juego'], action: () => onNavigate('scoreboard') },
      { id: 'alertsounds', title: s('alertsoundsTab'), description: 'Sonidos de alerta', icon: '🔊', keywords: ['sonidos', 'alertas', 'audio'], action: () => onNavigate('alertsounds') },
      { id: 'bitrate', title: s('bitrateTab'), description: 'Calculadora de bitrate', icon: '🧮', keywords: ['bitrate', 'calculadora', 'internet', 'obs'], action: () => onNavigate('bitrate') },
      { id: 'vertical', title: s('verticalTab'), description: 'Streaming en formato vertical', icon: '📱', keywords: ['vertical', 'tiktok', 'reels', 'shorts'], action: () => onNavigate('vertical') },
      { id: 'config', title: s('configTab'), description: 'Ajustes de StreamDaemon', icon: '⚙️', keywords: ['configuracion', 'ajustes', 'settings', 'idioma', 'tema'], action: () => onNavigate('config') },
    ];

    const actions: CommandItem[] = [
      {
        id: 'toggle-always-on-top',
        title: alwaysOnTop ? 'Desactivar Siempre Encima' : 'Activar Siempre Encima',
        description: 'Mantiene la ventana por encima del resto',
        icon: '📌',
        keywords: ['siempre', 'encima', 'top', 'pin', 'ventana'],
        action: () => {
          if (onToggleAlwaysOnTop) onToggleAlwaysOnTop();
        }
      }
    ];

    return [...navItems, ...actions];
  };

  const commands = getCommands();
  const lowerQuery = query.toLowerCase().trim();
  
  const filteredCommands = lowerQuery 
    ? commands.filter(c => 
        c.title.toLowerCase().includes(lowerQuery) || 
        c.description.toLowerCase().includes(lowerQuery) ||
        c.keywords.some(k => k.includes(lowerQuery))
      )
    : commands;

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Auto-scroll to selected item
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        const container = listRef.current;
        const offsetTop = activeEl.offsetTop;
        const clientHeight = container.clientHeight;
        const scrollTop = container.scrollTop;

        if (offsetTop < scrollTop) {
          container.scrollTo({ top: offsetTop - 8, behavior: 'smooth' });
        } else if (offsetTop + activeEl.clientHeight > scrollTop + clientHeight) {
          container.scrollTo({ top: offsetTop + activeEl.clientHeight - clientHeight + 8, behavior: 'smooth' });
        }
      }
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={styles.backdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={styles.palette}
          >
            <div className={styles.inputWrapper}>
              <span className={styles.searchIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                ref={inputRef}
                className={styles.input}
                placeholder="Buscar funciones, ajustes o navegar... (Ej: Chat)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck="false"
              />
              <span className={styles.itemShortcut} style={{ fontSize: '0.7rem' }}>ESC</span>
            </div>

            <div className={styles.results} ref={listRef}>
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => {
                  const isActive = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                    >
                      <span className={styles.itemIcon}>{cmd.icon}</span>
                      <div className={styles.itemContent}>
                        <span className={styles.itemTitle}>{cmd.title}</span>
                        <span className={styles.itemDesc}>{cmd.description}</span>
                      </div>
                      {cmd.shortcut && (
                        <span className={styles.itemShortcut}>{cmd.shortcut}</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className={styles.empty}>
                  No se han encontrado resultados para "{query}"
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
