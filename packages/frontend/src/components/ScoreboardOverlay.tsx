import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiGet } from '../utils/api';
import type { FighterState } from '@streamdaemon/shared';
import styles from './ScoreboardOverlay.module.css';

interface Props {
  channel: string;
}

function defaultFighter(): FighterState {
  return {
    p1: { name: 'Player 1', health: 144, rounds: 0, charName: '', portrait: '' },
    p2: { name: 'Player 2', health: 144, rounds: 0, charName: '', portrait: '' },
    maxHealth: 144, roundsToWin: 2,
    timerRemaining: 99, timerRunning: false, timerDuration: 99,
    status: 'waiting',
  };
}

function healthColor(health: number, max: number): string {
  const pct = health / max;
  if (pct > 0.5) return `hsl(${120 * pct}, 80%, 42%)`;
  if (pct > 0.25) return `hsl(${60 + 60 * (pct - 0.25) / 0.25}, 90%, 45%)`;
  return `hsl(0, 85%, 40%)`;
}

function healthBgColor(side: 'p1' | 'p2'): string {
  return side === 'p1' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)';
}

function playerTheme(side: 'p1' | 'p2') {
  return side === 'p1'
    ? { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#93c5fd', glow: 'rgba(59,130,246,0.4)' }
    : { primary: '#ef4444', secondary: '#dc2626', accent: '#fca5a5', glow: 'rgba(239,68,68,0.4)' };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function RoundStars({ count, max, side }: { count: number; max: number; side: 'p1' | 'p2' }) {
  const theme = playerTheme(side);
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: side === 'p1' ? 'flex-start' : 'flex-end' }}>
      {Array.from({ length: max }, (_, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={i < count ? { scale: 1, rotate: 0 } : { scale: 0.7, opacity: 0.3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12, delay: i * 0.1 }}
          style={{
            display: 'inline-block',
            fontSize: '1.1rem',
            lineHeight: 1,
            filter: i < count ? `drop-shadow(0 0 4px ${theme.glow})` : 'none',
          }}
        >
          ★
        </motion.span>
      ))}
    </div>
  );
}

function Portrait({ url, name, side }: { url: string; name: string; side: 'p1' | 'p2' }) {
  const theme = playerTheme(side);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 56, flexShrink: 0 }}>
      {url ? (
        <img
          src={url}
          alt={name}
          style={{
            width: 48, height: 48, borderRadius: 8,
            border: `2px solid ${theme.primary}`,
            objectFit: 'cover',
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: 8,
          border: `2px solid ${theme.primary}`,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', color: theme.accent,
        }}>
          ?
        </div>
      )}
      <span style={{
        fontSize: '0.6rem', fontWeight: 700, color: theme.accent,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: 56, textAlign: 'center',
      }}>
        {name}
      </span>
    </div>
  );
}

export function ScoreboardOverlay({ channel }: Props) {
  const [fighter, setFighter] = useState<FighterState>(defaultFighter);
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useSocketEvent('fighter:update', useCallback((data: FighterState) => {
    setFighter(data);
  }, []));

  useEffect(() => {
    if (!channel) return;
    apiGet(`/fighter/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (data) setFighter(data); })
      .catch((err) => console.warn('Fighter fetch failed:', err));
  }, [channel]);

  const p1Theme = playerTheme('p1');
  const p2Theme = playerTheme('p2');
  const p1Pct = fighter.p1.health / fighter.maxHealth;
  const p2Pct = fighter.p2.health / fighter.maxHealth;
  const timerLow = fighter.timerRemaining <= 10 && fighter.timerRunning;

  return (
    <div className={styles.bar}>
      <div className={styles.mainRow}>
        <div className={styles.playerSide} style={{ justifyContent: 'flex-start' }}>
          <Portrait url={fighter.p1.portrait} name={fighter.p1.charName || fighter.p1.name} side="p1" />
          <div className={styles.playerInfo}>
            <div className={styles.playerName} style={{ color: p1Theme.accent }}>
              {fighter.p1.name}
            </div>
            <div className={styles.healthBar} style={{ background: healthBgColor('p1'), border: `1px solid ${p1Theme.primary}33` }}>
              <motion.div
                layout
                animate={{ width: `${p1Pct * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                className={styles.healthFill}
                style={{
                  background: `linear-gradient(90deg, ${healthColor(fighter.p1.health, fighter.maxHealth)}, ${p1Theme.primary})`,
                  boxShadow: `inset 0 0 8px ${p1Theme.glow}`,
                }}
              />
              <div className={styles.healthText}>
                {fighter.p1.health}
              </div>
            </div>
            <RoundStars count={fighter.p1.rounds} max={fighter.roundsToWin} side="p1" />
          </div>
        </div>

        <div className={styles.centerTimer}>
          <motion.div
            animate={timerLow ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: timerLow ? Infinity : 0, duration: 0.5 }}
            className={styles.timerText}
            style={{
              fontSize: '1.5rem', fontWeight: 900,
              color: timerLow ? '#fbbf24' : 'rgba(255,255,255,0.85)',
              textShadow: timerLow ? '0 0 12px rgba(251,191,36,0.6)' : '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            {formatTime(fighter.timerRemaining)}
          </motion.div>
          <div className={styles.timerLabel}>TIME</div>
        </div>

        <div className={styles.playerSide} style={{ justifyContent: 'flex-end' }}>
          <div className={styles.playerInfo} style={{ textAlign: 'right' }}>
            <div className={styles.playerName} style={{ color: p2Theme.accent }}>
              {fighter.p2.name}
            </div>
            <div className={styles.healthBar} style={{ background: healthBgColor('p2'), border: `1px solid ${p2Theme.primary}33` }}>
              <motion.div
                layout
                animate={{ width: `${p2Pct * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                className={styles.healthFill}
                style={{
                  marginLeft: 'auto',
                  background: `linear-gradient(270deg, ${healthColor(fighter.p2.health, fighter.maxHealth)}, ${p2Theme.primary})`,
                  boxShadow: `inset 0 0 8px ${p2Theme.glow}`,
                }}
              />
              <div className={`${styles.healthText} ${styles['healthText--right']}`}>
                {fighter.p2.health}
              </div>
            </div>
            <RoundStars count={fighter.p2.rounds} max={fighter.roundsToWin} side="p2" />
          </div>
          <Portrait url={fighter.p2.portrait} name={fighter.p2.charName || fighter.p2.name} side="p2" />
        </div>
      </div>

      {fighter.status === 'finished' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.statusBar}
        >
          {fighter.p1.rounds > fighter.p2.rounds
            ? `${fighter.p1.name} WINS!`
            : fighter.p2.rounds > fighter.p1.rounds
              ? `${fighter.p2.name} WINS!`
              : fighter.p1.health > fighter.p2.health
                ? `${fighter.p1.name} WINS!`
                : fighter.p2.health > fighter.p1.health
                  ? `${fighter.p2.name} WINS!`
                  : 'DRAW!'}
        </motion.div>
      )}
    </div>
  );
}
