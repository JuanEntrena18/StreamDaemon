import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ChatMessage } from '@streamforger/shared';

const MAX_MESSAGES = 30;

interface Props {
  channel: string;
}

/** Subnautica 2 — deep-ocean bioluminescent chat overlay */
export function Subnautica2ChatOverlay({ channel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; speed: number; opacity: number }[]
  >([]);
  const { socket } = useSocket();

  useSocketEvent(
    'chat:message',
    useCallback((msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
    }, []),
  );

  useEffect(() => {
    if (channel && socket?.connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, socket?.connected]);

  // Generate ambient floating particles
  useEffect(() => {
    const initial = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 20 + 15,
      opacity: Math.random() * 0.5 + 0.2,
    }));
    setParticles(initial);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        fontFamily: "'Courier New', 'Courier', monospace",
      }}
    >
      {/* ── Ambient particles ── */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `rgba(0, 212, 255, ${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(0, 212, 255, 0.8)`,
          }}
          animate={{ y: [0, -(1080 + 50)] }}
          transition={{
            duration: p.speed,
            repeat: Infinity,
            delay: Math.random() * p.speed,
            ease: 'linear',
          }}
        />
      ))}

      {/* ── Depth sonar ring (bottom-left corner decoration) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          width: 80,
          height: 80,
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      >
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid #00d4ff',
            }}
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: 'easeOut',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px solid #00d4ff',
          }}
        />
      </div>

      {/* ── Corner scanner brackets ── */}
      <ScannerBracket position="bottom-left" />
      <ScannerBracket position="bottom-right" />

      {/* ── Chat messages ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 40,
          width: 520,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                background: 'rgba(0, 10, 20, 0.82)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(0, 212, 255, 0.35)',
                borderLeft: '3px solid #00d4ff',
                borderRadius: '0 8px 8px 0',
                padding: '8px 14px',
                boxShadow: '0 0 20px rgba(0, 212, 255, 0.1), inset 0 0 20px rgba(0, 50, 80, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Scanline shimmer */}
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(transparent 40%, rgba(0,212,255,0.04) 50%, transparent 60%)',
                  backgroundSize: '100% 4px',
                }}
                animate={{ backgroundPositionY: ['0px', '200px'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />

              {/* Username label */}
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: msg.user.color ?? '#00d4ff',
                  textShadow: `0 0 8px ${msg.user.color ?? '#00d4ff'}`,
                  marginBottom: 3,
                }}
              >
                ▶ {msg.user.displayName}
              </div>

              {/* Message text */}
              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'rgba(200, 240, 255, 0.92)',
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                }}
              >
                {msg.text}
              </div>

              {/* Bottom data bar */}
              <div
                style={{
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: 0.4,
                }}
              >
                <div
                  style={{
                    height: 1,
                    flex: 1,
                    background: 'linear-gradient(to right, #00d4ff, transparent)',
                  }}
                />
                <span style={{ fontSize: '0.6rem', color: '#00ff88', letterSpacing: '0.1em' }}>
                  SYS:OK
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── HUD header ── */}
      <HudHeader />
    </div>
  );
}

/** Corner scanner bracket decoration */
function ScannerBracket({ position }: { position: 'bottom-left' | 'bottom-right' }) {
  const isRight = position === 'bottom-right';
  const size = 18;
  const thickness = 2;
  const color = 'rgba(0, 212, 255, 0.5)';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 35,
        ...(isRight ? { right: 35 } : { left: 35 }),
        width: size * 3,
        height: size * 3,
        pointerEvents: 'none',
      }}
    >
      {/* Corner L shape */}
      <div style={{ position: 'absolute', bottom: 0, ...(isRight ? { right: 0 } : { left: 0 }) }}>
        <div
          style={{
            width: size,
            height: thickness,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        <div
          style={{
            width: thickness,
            height: size,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            ...(isRight ? { marginLeft: size - thickness } : {}),
          }}
        />
      </div>
    </div>
  );
}

/** Subnautica 2 HUD header bar */
function HudHeader() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('es-ES', { hour12: false }));

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-ES', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 40,
        right: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {/* Left cluster */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(0,10,20,0.7)',
          border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: 4,
          padding: '5px 12px',
          backdropFilter: 'blur(6px)',
        }}
      >
        <motion.div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#00ff88',
            boxShadow: '0 0 8px #00ff88',
          }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#00d4ff',
            textTransform: 'uppercase',
          }}
        >
          SUBNAUTICA II · STREAM LIVE
        </span>
      </div>

      {/* Spacer */}
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'linear-gradient(to right, rgba(0,212,255,0.3), transparent)',
        }}
      />

      {/* Clock */}
      <div
        style={{
          background: 'rgba(0,10,20,0.7)',
          border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: 4,
          padding: '5px 12px',
          backdropFilter: 'blur(6px)',
          fontSize: '0.65rem',
          color: '#00ff88',
          letterSpacing: '0.12em',
          fontWeight: 700,
        }}
      >
        {time}
      </div>
    </div>
  );
}
