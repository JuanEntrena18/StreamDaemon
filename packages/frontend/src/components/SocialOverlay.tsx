import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import type { SocialLink } from '@streamdaemon/shared';
import styles from './SocialOverlay.module.css';

const DEFAULT_LINKS: SocialLink[] = [
  { platform: 'twitter',   url: 'https://x.com/',         label: 'Twitter / X' },
  { platform: 'youtube',   url: 'https://youtube.com/',   label: 'YouTube' },
  { platform: 'instagram', url: 'https://instagram.com/', label: 'Instagram' },
  { platform: 'discord',   url: 'https://discord.gg/',    label: 'Discord' },
  { platform: 'tiktok',    url: 'https://tiktok.com/',    label: 'TikTok' },
  { platform: 'github',    url: 'https://github.com/',    label: 'GitHub' },
];

const PLATFORM_EMOJIS: Record<string, string> = {
  twitter:   '🐦',
  youtube:   '📺',
  instagram: '📸',
  discord:   '💬',
  tiktok:    '🎵',
  github:    '💻',
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter:   '#1d9bf0',
  youtube:   '#ff0000',
  instagram: '#e1306c',
  discord:   '#5865f2',
  tiktok:    '#ff0050',
  github:    '#e6edf3',
};

/** Parse social links from URL query params (set by ObsPanel) */
function parseLinksFromUrl(): SocialLink[] | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('socials');
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as SocialLink[];
  } catch {
    // ignore
  }
  return null;
}

export function SocialOverlay() {
  const { t } = useTranslation();
  const [links, setLinks] = useState<SocialLink[]>(() => parseLinksFromUrl() ?? DEFAULT_LINKS);
  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useSocketEvent('social:update', useCallback((data: SocialLink[]) => {
    setLinks(data);
  }, []));

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % links.length);
        setVisible(true);
      }, 500);
    }, 4000);

    return () => clearInterval(interval);
  }, [links.length]);

  const current = links[currentIndex];
  const color = PLATFORM_COLORS[current?.platform ?? ''] ?? '#ffffff';

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        {visible && current && (
          <motion.a
            key={current.platform + currentIndex}
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className={styles.card}
            style={{
              background: 'rgba(0,0,0,0.75)',
              border: 'var(--theme-border)',
              boxShadow: `var(--theme-glow), 0 0 0 1px ${color}33`,
            }}
          >
            <div
              className={styles.iconBox}
              style={{
                background: `${color}22`,
                border: `1px solid ${color}55`,
                boxShadow: `0 0 10px ${color}44`,
              }}
            >
              {PLATFORM_EMOJIS[current.platform] ?? '🌐'}
            </div>

            <div className={styles.textWrap}>
              <div className={styles.platformLabel} style={{ color }}>
                {t('socialOverlay.sigueme')}
              </div>
              <div className={styles.linkLabel}>
                {current.label}
              </div>
            </div>

            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className={styles.arrow}
              style={{ color }}
            >
              →
            </motion.div>
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
