import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ChatMessage } from '@streamforger/shared';

const MAX_MESSAGES = 30;

interface Props {
  channel: string;
}

export function AllianceChatOverlay({ channel }: Props) {
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

  const GOLD = '#d4af37';
  const BLUE = '#2b5fc6';
  const LIGHT_BLUE = '#4a7cff';
  const SILVER = '#a8b8d0';

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none', overflow: 'hidden',
        fontFamily: "'Friz Quadrata', 'Times New Roman', serif",
        background: 'linear-gradient(180deg, #0b0e1a 0%, #111630 30%, #1a2040 60%, #111630 100%)',
      }}
    >
      {/* Stone masonry pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${BLUE.replace('#','')}' fill-opacity='0.06'%3E%3Crect x='0' y='0' width='38' height='38' rx='2'/%3E%3Crect x='42' y='0' width='38' height='38' rx='2'/%3E%3Crect x='0' y='42' width='38' height='38' rx='2'/%3E%3Crect x='42' y='42' width='38' height='38' rx='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        pointerEvents: 'none',
      }} />

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }} />

      {/* ── Left pillar (gothic stone column) ── */}
      <div style={{ position: 'absolute', top: '10%', left: 12, width: 3, height: '75%', pointerEvents: 'none' }}>
        <div style={{ width: 3, height: '100%', background: `linear-gradient(180deg, transparent, ${GOLD}22, ${BLUE}44, ${GOLD}22, transparent)`, borderRadius: 2 }} />
      </div>

      {/* ── Right pillar ── */}
      <div style={{ position: 'absolute', top: '10%', right: 12, width: 3, height: '75%', pointerEvents: 'none' }}>
        <div style={{ width: 3, height: '100%', background: `linear-gradient(180deg, transparent, ${GOLD}22, ${BLUE}44, ${GOLD}22, transparent)`, borderRadius: 2 }} />
      </div>

      {/* ── Top Banner / Crest ── */}
      <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', minWidth: 520, pointerEvents: 'none' }}>
        {/* Corner ornaments */}
        <div style={{ position: 'absolute', top: -2, left: -8, width: 20, height: 20, borderTop: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}`, opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: -2, right: -8, width: 20, height: 20, borderTop: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}`, opacity: 0.5 }} />
        <div style={{ position: 'absolute', bottom: -2, left: -8, width: 20, height: 20, borderBottom: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}`, opacity: 0.5 }} />
        <div style={{ position: 'absolute', bottom: -2, right: -8, width: 20, height: 20, borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}`, opacity: 0.5 }} />

        <div style={{
          background: `linear-gradient(180deg, rgba(26,58,138,calc(var(--bg-alpha,0.5)*1.5)) 0%, rgba(15,25,70,calc(var(--bg-alpha,0.5)*1.8)) 100%)`,
          border: `1px solid ${GOLD}44`,
          borderRadius: 8,
          padding: '10px 28px',
          textAlign: 'center',
          boxShadow: `0 0 30px rgba(212,175,55,0.06), inset 0 0 40px rgba(42,95,198,0.08)`,
        }}>
          {/* Crown / Lion decoration */}
          <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>👑</div>

          {/* Title with gold side bars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
            <div style={{ width: 50, height: 1, background: `linear-gradient(to left, ${GOLD}55, transparent)` }} />
            <div>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: `${GOLD}77`, marginBottom: 1 }}>
                🛡️ ¡Por la Alianza!
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: GOLD, textShadow: `0 0 20px ${GOLD}33, 0 2px 4px rgba(0,0,0,0.5)`, letterSpacing: '0.04em', lineHeight: 1.1 }}>
                {channel}
              </div>
            </div>
            <div style={{ width: 50, height: 1, background: `linear-gradient(to right, ${GOLD}55, transparent)` }} />
          </div>

          <div style={{ fontSize: '0.6rem', color: `${GOLD}55`, marginTop: 3, letterSpacing: '0.15em' }}>
            — El Rey honra —
          </div>
        </div>
      </div>

      {/* ── Chat messages (stone scroll style) ── */}
      <div
        style={{
          position: 'absolute', bottom: 100, left: 40,
          width: 480, maxHeight: 520,
          display: 'flex', flexDirection: 'column',
          gap: 3,
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
                    ? `linear-gradient(135deg, ${GOLD}08 0%, rgba(26,58,138,calc(var(--bg-alpha,0.5)*0.5)) 100%)`
                    : `rgba(10,14,30,var(--bg-alpha,0.7))`,
                  border: '1px solid',
                  borderColor: isLast ? `${GOLD}22` : `${LIGHT_BLUE}0f`,
                  borderLeft: `3px solid ${msg.user.color || GOLD}`,
                  borderRadius: '0 6px 6px 0',
                  padding: '8px 16px 8px 14px',
                  position: 'relative',
                }}
              >
                {/* Lion head / shield marker */}
                <div style={{
                  position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)',
                  width: 10, height: 10,
                  background: msg.user.color || GOLD,
                  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                  boxShadow: `0 0 5px ${msg.user.color || GOLD}`,
                  opacity: 0.5,
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 1 }}>
                  {/* Decorative vertical bar */}
                  <div style={{ width: 2, height: 14, background: msg.user.color || GOLD, borderRadius: 1, opacity: 0.35 }} />
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: msg.user.color || GOLD,
                    letterSpacing: '0.04em',
                    textShadow: `${(msg.user.color || GOLD)}22 0 0 6px`,
                  }}>
                    [{msg.user.displayName}]
                  </span>
                  <span style={{ fontSize: '0.5rem', color: `${GOLD}33`, marginLeft: 'auto', letterSpacing: '0.12em' }}>
                    Dice:
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: `${SILVER}CC`, lineHeight: 1.45, wordBreak: 'break-word', paddingLeft: 12 }}>
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Bottom Action Bar (stone + gold) ── */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        <div style={{
          display: 'flex', gap: 6,
          padding: '7px 18px',
          background: 'rgba(10,14,30,0.85)',
          border: `1px solid ${GOLD}18`,
          borderRadius: 8,
          boxShadow: `inset 0 1px 0 ${GOLD}08, 0 4px 20px rgba(0,0,0,0.4)`,
        }}>
          {[{ cmd: '!sorteo', active: true }, { cmd: '!predict', active: false }, { cmd: '!comando', active: false }, { cmd: '!redes', active: false }].map((item) => (
            <div
              key={item.cmd}
              style={{
                padding: '4px 12px',
                border: `1px solid ${item.active ? `${GOLD}33` : `${GOLD}0d`}`,
                borderRadius: 4,
                background: item.active ? `linear-gradient(135deg, ${BLUE}44, ${BLUE}22)` : 'transparent',
                fontSize: '0.58rem',
                fontWeight: 600,
                color: item.active ? GOLD : `${GOLD}44`,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {item.cmd}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom-right decorative resource bars ── */}
      <div style={{ position: 'absolute', bottom: 30, right: 30, pointerEvents: 'none' }}>
        <div style={{ marginBottom: 5 }}>
          <div style={{ fontSize: '0.45rem', color: `${LIGHT_BLUE}55`, letterSpacing: '0.18em', marginBottom: 2, fontWeight: 600 }}>MANA</div>
          <div style={{ width: 140, height: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${LIGHT_BLUE}22`, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: `linear-gradient(90deg, ${LIGHT_BLUE}, #1a3a8a)`, borderRadius: 2 }}
              animate={{ width: ['65%', '85%', '65%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.45rem', color: `${GOLD}55`, letterSpacing: '0.18em', marginBottom: 2, fontWeight: 600 }}>HONOR</div>
          <div style={{ width: 140, height: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${GOLD}22`, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: `linear-gradient(90deg, ${GOLD}, #b8860b)`, borderRadius: 2 }}
              animate={{ width: ['45%', '70%', '45%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom-left Lion crest watermark ── */}
      <div style={{ position: 'absolute', bottom: 16, left: 20, pointerEvents: 'none', opacity: 0.06, fontSize: '4rem', lineHeight: 1 }}>
        🦁
      </div>
    </div>
  );
}