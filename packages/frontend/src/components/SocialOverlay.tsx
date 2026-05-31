import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketEvent } from '../hooks/useSocket';
import type { SocialLink } from '@streamforger/shared';

const DEFAULT_LINKS: SocialLink[] = [
  { platform: 'twitter', url: 'https://x.com/', label: 'Twitter / X' },
  { platform: 'youtube', url: 'https://youtube.com/', label: 'YouTube' },
  { platform: 'instagram', url: 'https://instagram.com/', label: 'Instagram' },
  { platform: 'discord', url: 'https://discord.gg/', label: 'Discord' },
  { platform: 'tiktok', url: 'https://tiktok.com/', label: 'TikTok' },
  { platform: 'github', url: 'https://github.com/', label: 'GitHub' },
];

const PLATFORM_EMOJIS: Record<string, string> = {
  twitter: '🐦',
  youtube: '📺',
  instagram: '📸',
  discord: '💬',
  tiktok: '🎵',
  github: '💻',
};

export function SocialOverlay() {
  const [links, setLinks] = useState<SocialLink[]>(DEFAULT_LINKS);
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

  return (
    <div className="fixed bottom-6 right-6">
      <AnimatePresence mode="wait">
        {visible && current && (
          <motion.a
            key={current.platform + currentIndex}
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="flex items-center gap-3 px-5 py-3 rounded-lg text-lg font-semibold"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: 'var(--theme-border)',
              boxShadow: 'var(--theme-glow)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <span className="text-2xl">{PLATFORM_EMOJIS[current.platform] ?? '🌐'}</span>
            <span>{current.label}</span>
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
