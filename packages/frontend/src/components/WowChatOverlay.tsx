import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ChatMessage } from '@streamforger/shared';

const MAX_MESSAGES = 30;

interface Props {
  channel: string;
}

export function WowChatOverlay({ channel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { socket, connected } = useSocket();

  useSocketEvent('chat:message', useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
  }, []));

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none', overflow: 'hidden',
        fontFamily: "'Friz Quadrata', 'Times New Roman', serif",
        background: 'linear-gradient(180deg, #08080c 0%, #0f0b08 30%, #1a1410 70%, #0f0b08 100%)',
      }}
    >
      {/* Background vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />

      {/* Subtle background pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffd100\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', pointerEvents: 'none' }} />

      {/* ── Top Frame (WoW quest / title frame) ── */}
      <div
        style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          minWidth: 500,
        }}
      >
        {/* Frame top corners */}
        <div style={{ position: 'absolute', top: -4, left: -12, width: 24, height: 24, borderTop: '2px solid #ffd100', borderLeft: '2px solid #ffd100', opacity: 0.6 }} />
        <div style={{ position: 'absolute', top: -4, right: -12, width: 24, height: 24, borderTop: '2px solid #ffd100', borderRight: '2px solid #ffd100', opacity: 0.6 }} />

        <div
          style={{
            background: `linear-gradient(180deg, rgba(45,27,0, calc(var(--bg-alpha,0.5)*1.7)) 0%, rgba(20,12,4, calc(var(--bg-alpha,0.5)*1.8)) 100%)`,
            border: '1px solid rgba(255,209,0,0.3)',
            borderRadius: 6,
            padding: '8px 24px',
            textAlign: 'center',
            boxShadow: '0 0 20px rgba(255,209,0,0.05), inset 0 0 30px rgba(255,209,0,0.03)',
          }}
        >
          {/* Title with decorative lines */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(to left, rgba(255,209,0,0.4), transparent)' }} />
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,209,0,0.6)', marginBottom: 2 }}>
                🛡️ Chat del canal
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffd100', textShadow: '0 0 20px rgba(255,209,0,0.3), 0 2px 4px rgba(0,0,0,0.5)', letterSpacing: '0.02em', lineHeight: 1.1 }}>
                {channel}
              </div>
            </div>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, rgba(255,209,0,0.4), transparent)' }} />
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,209,0,0.4)', marginTop: 4, letterSpacing: '0.12em' }}>
            — Stream en vivo —
          </div>
        </div>

        {/* Frame bottom corners */}
        <div style={{ position: 'absolute', bottom: -4, left: -12, width: 24, height: 24, borderBottom: '2px solid #ffd100', borderLeft: '2px solid #ffd100', opacity: 0.6 }} />
        <div style={{ position: 'absolute', bottom: -4, right: -12, width: 24, height: 24, borderBottom: '2px solid #ffd100', borderRight: '2px solid #ffd100', opacity: 0.6 }} />
      </div>

      {/* ── Chat messages (quest log style) ── */}
      <div
        style={{
          position: 'absolute', bottom: 100, left: 40,
          width: 480, maxHeight: 500,
          display: 'flex', flexDirection: 'column',
          gap: 2,
          overflow: 'hidden',
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: isLast ? 0.1 : 0 }}
                style={{
                  background: isLast
                    ? 'linear-gradient(135deg, rgba(255,209,0,0.06) 0%, rgba(45,27,0,calc(var(--bg-alpha,0.5)*0.7)) 100%)'
                    : `rgba(10,8,6,var(--bg-alpha,0.7))`,
                  border: '1px solid',
                  borderColor: isLast ? 'rgba(255,209,0,0.2)' : 'rgba(255,209,0,0.06)',
                  borderLeft: `3px solid ${msg.user.color || '#ffd100'}`,
                  borderRadius: '0 4px 4px 0',
                  padding: '7px 14px 7px 12px',
                  position: 'relative',
                }}
              >
                {/* Quest-style diamond marker */}
                <div style={{
                  position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)',
                  width: 8, height: 8,
                  background: msg.user.color || '#ffd100',
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  boxShadow: `0 0 6px ${msg.user.color || '#ffd100'}`,
                  opacity: 0.6,
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 1 }}>
                  {/* Class color bar */}
                  <div style={{
                    width: 2, height: 14,
                    background: msg.user.color || '#ffd100',
                    borderRadius: 1, opacity: 0.5,
                  }} />
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    color: msg.user.color || '#ffd100',
                    letterSpacing: '0.04em',
                    textShadow: `0 0 6px ${msg.user.color || '#ffd100'}33`,
                  }}>
                    [{msg.user.displayName}]
                  </span>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,209,0,0.25)', marginLeft: 'auto', letterSpacing: '0.1em' }}>
                    Dice:
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(220,200,170,0.9)', lineHeight: 1.45, wordBreak: 'break-word', paddingLeft: 10 }}>
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Bottom Action Bar ── */}
      <div
        style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        }}
      >
        <div style={{
          display: 'flex', gap: 4,
          padding: '6px 14px',
          background: 'rgba(10,8,6,0.8)',
          border: '1px solid rgba(255,209,0,0.15)',
          borderRadius: 6,
          boxShadow: 'inset 0 1px 0 rgba(255,209,0,0.05)',
        }}>
          {['!sorteo', '!predict', '!comando', '!redes'].map((cmd, i) => (
            <div
              key={cmd}
              style={{
                padding: '4px 10px',
                border: '1px solid rgba(255,209,0,0.1)',
                borderRadius: 4,
                background: i === 0 ? 'rgba(255,209,0,0.08)' : 'transparent',
                fontSize: '0.6rem',
                fontWeight: 600,
                color: i === 0 ? '#ffd100' : 'rgba(255,209,0,0.4)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'default',
              }}
            >
              {cmd}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom-right HP/Resource bar (decorative) ── */}
      <div style={{ position: 'absolute', bottom: 30, right: 30, pointerEvents: 'none' }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: '0.5rem', color: 'rgba(255,209,0,0.25)', letterSpacing: '0.15em', marginBottom: 2 }}>CHAT</div>
          <div style={{ width: 140, height: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,209,0,0.1)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: 'linear-gradient(90deg, #ffd100, #ff8c00)', borderRadius: 2 }}
              animate={{ width: ['60%', '80%', '60%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.5rem', color: 'rgba(0,184,255,0.25)', letterSpacing: '0.15em', marginBottom: 2 }}>ACTIVIDAD</div>
          <div style={{ width: 140, height: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,184,255,0.1)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: 'linear-gradient(90deg, #00b8ff, #0066ff)', borderRadius: 2 }}
              animate={{ width: ['40%', '65%', '40%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      {/* ── Left decorative frame (like a quest tracker frame) ── */}
      <div style={{ position: 'absolute', top: '20%', left: 16, pointerEvents: 'none' }}>
        <div style={{ width: 3, height: 200, background: 'linear-gradient(180deg, transparent, rgba(255,209,0,0.1), transparent)', borderRadius: 2 }} />
      </div>
      <div style={{ position: 'absolute', top: '20%', right: 16, pointerEvents: 'none' }}>
        <div style={{ width: 3, height: 200, background: 'linear-gradient(180deg, transparent, rgba(255,209,0,0.1), transparent)', borderRadius: 2 }} />
      </div>
    </div>
  );
}
