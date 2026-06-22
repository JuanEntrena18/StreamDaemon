import { useState, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import styles from './ChatOverlayControls.module.css';

interface Props {
  onClose: () => void;
}

const OVERLAY_LS_KEY = 'streamforger-chat-overlay-settings';

function loadOverlaySettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(OVERLAY_LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveOverlaySettings(settings: Record<string, unknown>) {
  try {
    localStorage.setItem(OVERLAY_LS_KEY, JSON.stringify(settings));
  } catch {}
}

function pillClasses(active: boolean, extra?: string) {
  return `${styles.pillBtn} ${active ? styles['pillBtn--active'] : ''} ${extra || ''}`;
}

const FONT_OPTIONS = [
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Monospace', value: "'Courier New', monospace" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Arial Black', value: "'Arial Black', Impact, sans-serif" },
];

export function ChatOverlayControls({ onClose }: Props): ReactNode {
  const { t } = useTranslation();
  const ls = loadOverlaySettings();
  const [overlayOpacity, setOverlayOpacity] = useState<number>(() => (ls.opacity as number) ?? 0.9);
  const [overlaySize, setOverlaySize] = useState<'sm' | 'md' | 'lg'>(() => (ls.size as 'sm' | 'md' | 'lg') ?? 'md');
  const [overlayBgMode, setOverlayBgMode] = useState<'transparent' | 'black'>(() => (ls.bgMode as 'transparent' | 'black') ?? 'black');
  const [overlayFont, setOverlayFont] = useState<string>(() => (ls.font as string) ?? "'Inter', sans-serif");
  const [overlayFontSize, setOverlayFontSize] = useState<number>(() => (ls.fontSize as number) ?? 14);

  const changeOverlaySize = useCallback((size: 'sm' | 'md' | 'lg') => {
    setOverlaySize(size);
    saveOverlaySettings({ ...loadOverlaySettings(), size });
    const dims = { sm: [300, 450], md: [400, 600], lg: [550, 800] };
    if (window.streamforger) {
      window.streamforger.overlay.resize(dims[size][0], dims[size][1]);
    }
  }, []);

  const changeOverlayOpacity = useCallback((val: number) => {
    setOverlayOpacity(val);
    saveOverlaySettings({ ...loadOverlaySettings(), opacity: val });
    if (window.streamforger) {
      window.streamforger.overlay.setOpacity(val);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className={styles.overlayControlBox}
    >
      <div className="flex-between mb-2">
        <span className="sf-section-title" style={{ margin: 0 }}>{t('chat.controlOverlay')}</span>
        <button onClick={onClose} className="sf-btn sf-btn-danger" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
          {t('chat.cerrar')}
        </button>
      </div>
      <div className="flex-wrap mb-1">
        <div className="flex-row--gap-sm">
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <button
              key={s}
              onClick={() => changeOverlaySize(s)}
              className={pillClasses(overlaySize === s, styles['pillBtn--sm'])}
              style={{ textTransform: 'uppercase' }}
            >{s === 'sm' ? t('chat.small') : s === 'md' ? t('chat.medium') : t('chat.large')}</button>
          ))}
        </div>
        <div className="flex-row--gap-sm" style={{ flex: 1, maxWidth: 180 }}>
          <span className="text-dim" style={{ fontSize: '0.68rem' }}>{t('chat.opacidad')}</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={overlayOpacity}
            onChange={(e) => changeOverlayOpacity(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#7c3aed' }}
          />
        </div>
      </div>
      <div className="flex-row--gap-sm flex-wrap mt-2">
        <button
          onClick={() => {
            const next = overlayBgMode === 'transparent' ? 'black' : 'transparent';
            setOverlayBgMode(next);
            saveOverlaySettings({ ...loadOverlaySettings(), bgMode: next });
            window.streamforger?.overlay.setBgMode?.(next);
          }}
          className={`${styles.pillBtn} ${styles['pillBtn--sm']}`}
        >
          {overlayBgMode === 'transparent' ? t('chat.fondoTransparente') : t('chat.fondoNegro')}
        </button>

        <select
          value={overlayFont}
          onChange={(e) => {
            setOverlayFont(e.target.value);
            saveOverlaySettings({ ...loadOverlaySettings(), font: e.target.value });
            window.streamforger?.overlay.setFont?.(e.target.value);
          }}
          style={{
            padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid var(--sf-border)',
            background: 'transparent', color: 'var(--sf-text-3)',
            fontSize: '0.68rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
          }}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <div className="flex-row--gap-sm">
          <span style={{ fontSize: '0.6rem', color: 'var(--sf-text-3)' }}>A</span>
          <input
            type="range"
            min={10}
            max={24}
            value={overlayFontSize}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setOverlayFontSize(v);
              saveOverlaySettings({ ...loadOverlaySettings(), fontSize: v });
              window.streamforger?.overlay.setFontSize?.(v);
            }}
            style={{ width: 60, accentColor: '#7c3aed', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem', color: 'var(--sf-text-3)' }}>A</span>
          <span className="text-dim" style={{ fontSize: '0.6rem', minWidth: 16 }}>{overlayFontSize}</span>
        </div>
      </div>
    </motion.div>
  );
}
