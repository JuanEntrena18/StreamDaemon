import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import type { ChatMessage } from '@streamdaemon/shared';
import styles from './CustomOverlay.module.css';

const MAX_MESSAGES = 40;

interface Props {
  channel: string;
}

interface Activity {
  id: string;
  user: string;
  type: 'message' | 'join' | 'cheer';
  timestamp: number;
}

export function CustomOverlay({ channel }: Props) {
  const { t, dateLocale } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const { socket, connected } = useSocket();
  const params = new URLSearchParams(window.location.search);
  const gameName = params.get('game') || '';
  const recentCharters = useRef<Set<string>>(new Set());

  useSocketEvent('chat:message', useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
    if (!recentCharters.current.has(msg.user.displayName)) {
      recentCharters.current.add(msg.user.displayName);
      setActivities((prev) => [
        { id: msg.id, user: msg.user.displayName, type: 'join', timestamp: Date.now() },
        ...prev.slice(-9),
      ]);
    }
  }, []));

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  // Periodic cleanup of activity hints
  useEffect(() => {
    if (activities.length === 0) return;
    const id = setTimeout(() => {
      setActivities((prev) => prev.filter((a) => Date.now() - a.timestamp < 5000));
    }, 5000);
    return () => clearTimeout(id);
  }, [activities.length]);

  return (
    <div
      className={styles.container}
      style={{
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div
        className={styles.topBar}
        style={{
          background: `linear-gradient(180deg, rgba(15,15,35,calc(var(--bg-alpha,0.75)*1.2)) 0%, rgba(15,15,35,0) 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.div
            className={styles.liveDot}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className={styles.liveLabel}>Live</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div className={styles.channelName}>
            #{channel}
          </div>
          {gameName && (
            <div className={styles.gameName}>
              — {gameName}
            </div>
          )}
        </div>
      </div>

      <div className={styles.chatArea}>
        <div className={styles.chatInner}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={styles.msgBubble}
                style={{
                  background: `rgba(15,15,35,var(--bg-alpha,0.75))`,
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `3px solid ${msg.user.color || '#7c3aed'}`,
                }}
              >
                <div className={styles.msgHeader}>
                  <div
                    className={styles.msgAvatar}
                    style={{
                      background: `linear-gradient(135deg, ${msg.user.color || '#7c3aed'}, ${msg.user.color || '#6366f1'})`,
                    }}
                  >
                    {msg.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className={styles.msgUser} style={{ color: msg.user.color || '#a78bfa' }}>
                    {msg.user.displayName}
                  </span>
                  <span className={styles.msgTime}>
                    {new Date(msg.timestamp).toLocaleTimeString(dateLocale || 'es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={styles.msgBody}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.activityArea}>
        <AnimatePresence>
          {activities.map((act) => (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={styles.activityChip}
              style={{
                background: `rgba(15,15,35,var(--bg-alpha,0.6))`,
                border: '1px solid rgba(124,58,237,0.15)',
              }}
            >
              <span className={styles.activityUser}>{act.user}</span>
              {' '}{t('customOverlay.viendoStream')}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className={styles.brandBar}>
        {t('customOverlay.brandBar')}
      </div>
    </div>
  );
}
