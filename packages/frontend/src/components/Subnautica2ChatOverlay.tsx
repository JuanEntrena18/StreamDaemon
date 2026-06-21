import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ChatMessage } from '@streamforger/shared';
import styles from './Subnautica2ChatOverlay.module.css';

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
  const { socket, connected } = useSocket();

  useSocketEvent(
    'chat:message',
    useCallback((msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
    }, []),
  );

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

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
    <div className={styles.container}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={styles.particle}
          style={{
            left: `${p.x}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
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

      <div className={styles.sonarRing}>
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={styles.sonarCircle}
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: 'easeOut',
            }}
          />
        ))}
        <div className={styles.sonarCircle} />
      </div>

      <ScannerBracket position="bottom-left" />
      <ScannerBracket position="bottom-right" />

      <div className={styles.chatArea}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={styles.msgBubble}
              style={{
                background: `rgba(0, 10, 20, var(--bg-alpha,0.82))`,
                border: '1px solid rgba(0, 212, 255, 0.35)',
                borderLeft: '3px solid #00d4ff',
                boxShadow: '0 0 20px rgba(0, 212, 255, 0.1), inset 0 0 20px rgba(0, 50, 80, 0.3)',
              }}
            >
              <motion.div
                className={styles.scanline}
                style={{
                  background: 'linear-gradient(transparent 40%, rgba(0,212,255,0.04) 50%, transparent 60%)',
                }}
                animate={{ backgroundPositionY: ['0px', '200px'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />

              <div
                className={styles.msgUsername}
                style={{
                  color: msg.user.color ?? '#00d4ff',
                  textShadow: `0 0 8px ${msg.user.color ?? '#00d4ff'}`,
                }}
              >
                ▶ {msg.user.displayName}
              </div>

              <div className={styles.msgText}>
                {msg.text}
              </div>

              <div className={styles.dataBar}>
                <div className={styles.dataLine} />
                <span className={styles.dataLabel}>SYS:OK</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <HudHeader />
    </div>
  );
}

function ScannerBracket({ position }: { position: 'bottom-left' | 'bottom-right' }) {
  const isRight = position === 'bottom-right';
  const size = 18;
  const thickness = 2;
  const color = 'rgba(0, 212, 255, 0.5)';

  return (
    <div
      className={styles.scannerBracket}
      style={{ ...(isRight ? { right: 35 } : { left: 35 }) }}
    >
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
    <div className={styles.headerBar}>
      <div
        className={styles.leftCluster}
        style={{
          background: `rgba(0,10,20,var(--bg-alpha,0.7))`,
          border: '1px solid rgba(0,212,255,0.25)',
        }}
      >
        <motion.div
          className={styles.liveDot}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className={styles.liveText}>SUBNAUTICA II · STREAM LIVE</span>
      </div>

      <div className={styles.spacer} />

      <div
        className={styles.clockBox}
        style={{
          background: `rgba(0,10,20,var(--bg-alpha,0.7))`,
          border: '1px solid rgba(0,212,255,0.25)',
        }}
      >
        {time}
      </div>
    </div>
  );
}
