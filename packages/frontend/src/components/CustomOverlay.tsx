import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ChatMessage } from '@streamforger/shared';

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
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none', overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      {/* Background decorative gradient orbs */}
      <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Top Bar ── */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'linear-gradient(180deg, rgba(15,15,35,0.92) 0%, rgba(15,15,35,0) 100%)',
          padding: '24px 36px 40px',
          display: 'flex', alignItems: 'flex-end', gap: 16,
        }}
      >
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.div
            style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 12px #ef4444' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ef4444' }}>Live</span>
        </div>

        {/* Channel name */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.03em', lineHeight: 1 }}>
            #{channel}
          </div>
          {gameName && (
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(148,163,184,0.8)', letterSpacing: '0.02em' }}>
              — {gameName}
            </div>
          )}
        </div>
      </div>

      {/* ── Chat messages (bottom-left) ── */}
      <div
        style={{
          position: 'absolute', bottom: 50, left: 36,
          width: 500, maxHeight: 400,
          display: 'flex', flexDirection: 'column-reverse',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{
                  background: 'rgba(15,15,35,0.75)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `3px solid ${msg.user.color || '#7c3aed'}`,
                  borderRadius: '0 10px 10px 0',
                  padding: '8px 14px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${msg.user.color || '#7c3aed'}, ${msg.user.color || '#6366f1'})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}
                  >
                    {msg.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 600,
                    color: msg.user.color || '#a78bfa',
                    letterSpacing: '0.02em',
                  }}>
                    {msg.user.displayName}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(148,163,184,0.4)', marginLeft: 'auto' }}>
                    {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(248,250,252,0.85)', lineHeight: 1.45, wordBreak: 'break-word', paddingLeft: 30 }}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Activity feed (bottom-right) ── */}
      <div
        style={{
          position: 'absolute', bottom: 50, right: 36,
          display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end',
          maxWidth: 280,
        }}
      >
        <AnimatePresence>
          {activities.map((act) => (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                background: 'rgba(15,15,35,0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(124,58,237,0.15)',
                borderRadius: 20,
                padding: '5px 14px',
                fontSize: '0.72rem',
                color: 'rgba(248,250,252,0.7)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontWeight: 600, color: '#a78bfa' }}>{act.user}</span>
              {' '}está viendo el stream
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Bottom brand bar ── */}
      <div
        style={{
          position: 'absolute', bottom: 16, left: 36,
          fontSize: '0.6rem', color: 'rgba(148,163,184,0.25)',
          letterSpacing: '0.1em', fontWeight: 500,
        }}
      >
        streamforger · cyber haute couture
      </div>
    </div>
  );
}
