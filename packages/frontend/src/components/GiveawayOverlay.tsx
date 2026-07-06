import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import type { GiveawayData, GiveawayEntryData } from '@streamdaemon/shared';
import styles from './GiveawayOverlay.module.css';

interface Props {
  channel: string;
}

interface TicketInfo {
  user: string;
  tickets: number;
}

const WHEEL_COLORS = [
  '#7c3aed', '#6366f1', '#8b5cf6', '#a78bfa',
  '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#f97316',
];

export function GiveawayOverlay({ channel }: Props) {
  const { t } = useTranslation();
  const [giveaway, setGiveaway] = useState<GiveawayData | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [winner, setWinner] = useState<{ winner: string; prize: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(15);
  const [rotation, setRotation] = useState(0);
  const { socket, connected } = useSocket();
  const wheelRef = useRef<HTMLCanvasElement>(null);

  useSocketEvent('giveaway:start', useCallback((data: GiveawayData) => {
    setGiveaway(data);
    setParticipants(data.participants);
    setTickets(data.tickets || []);
    setTotalTickets(data.totalTickets || 0);
    setWinner(null);
    setSpinning(false);
    setRotation(0);
  }, []));

  useSocketEvent('giveaway:entry', useCallback((data: GiveawayEntryData) => {
    setParticipants(data.participants);
    setTickets(data.tickets || []);
    setTotalTickets(data.totalTickets || 0);
  }, []));

  useSocketEvent('giveaway:end', useCallback((data: GiveawayData) => {
    setParticipants(data.participants);
    setTickets(data.tickets || []);
    setTotalTickets(data.totalTickets || 0);
    if (data.winnerId) {
      setSpinning(true);
    }
  }, []));

  useSocketEvent('giveaway:winner', useCallback((data: { winner: string; prize: string }) => {
    setWinner(data);
    setSpinning(false);
    setTimeout(() => setWinner(null), 20000);
  }, []));

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useEffect(() => {
    drawWheel();
  }, [participants, rotation, giveaway]);

  function drawWheel() {
    const canvas = wheelRef.current;
    if (!canvas || participants.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 4;
    const slice = (2 * Math.PI) / participants.length;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    for (let i = 0; i < participants.length; i++) {
      const startAngle = i * slice - Math.PI / 2;
      const endAngle = startAngle + slice;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(participants[i].substring(0, 10), r - 10, 3);
      ctx.restore();
    }

    ctx.restore();
  }

  function spinWheelManually() {
    if (participants.length < 2 || spinning) return;
    setSpinning(true);
    setWinner(null);

    const slice = (2 * Math.PI) / participants.length;
    const spins = 5 + Math.floor(Math.random() * 5);
    const target = Math.random() * slice;
    const totalRotation = spins * 2 * Math.PI + target;
    const startRotation = rotation;
    const endRotation = startRotation + totalRotation;
    const duration = spinDuration * 1000;
    const startTime = performance.now();

    function animate(time: number) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setRotation(startRotation + totalRotation * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(endRotation);
        setSpinning(false);
        const normalized = ((endRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const winnerIdx = Math.floor(((2 * Math.PI - normalized) % (2 * Math.PI)) / slice) % participants.length;
        setWinner({ winner: participants[winnerIdx], prize: giveaway?.prize ?? '' });
        setTimeout(() => setWinner(null), 20000);
      }
    }

    requestAnimationFrame(animate);
  }

  const hasGiveaway = giveaway && giveaway.status === 'active';

  return (
    <div className={styles.container} style={{ background: 'rgba(0,0,0,0.82)' }}>
      {!hasGiveaway && !spinning && !winner ? (
        <div className={styles.waiting}>
          {t('overlay.esperandoSorteo')}
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.leftPanel}>
            <div className={styles.participantsHeader}>
              {t('overlay.participantes', { n: participants.length, total: totalTickets })}
            </div>
            {hasGiveaway && (
              <>
                <div className={styles.prizeName}>
                  {giveaway.prize}
                </div>
                {giveaway.ticketCost > 0 && (
                  <div className={styles.prizeMeta}>
                    {giveaway.ticketCost} pts/boleto · {giveaway.ticketRewardTitle}
                  </div>
                )}
              </>
            )}
            <div className={styles.participantsList}>
              <AnimatePresence>
                {participants.map((name) => {
                  const t = tickets.find((t) => t.user === name);
                  const ticketCount = t?.tickets ?? 1;
                  const prob = totalTickets > 0 ? ((ticketCount / totalTickets) * 100).toFixed(1) : '0';
                  return (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={styles.participantItem}
                    >
                      <span>@{name}</span>
                      <span className={styles.participantTickets}>
                        {ticketCount} b ({prob}%)
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <div className={styles.rightPanel}>
            <div className={styles.spinControls}>
              <span className={styles.spinLabel}>
                {t('overlay.giro')}
              </span>
              {[10, 15, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpinDuration(s)}
                  className={`${styles.durationBtn} ${spinDuration === s ? styles['durationBtn--active'] : styles['durationBtn--inactive']}`}
                >
                  {s}s
                </button>
              ))}
            </div>

            <div className={styles.wheelContainer}>
              {participants.length < 2 ? (
                <div className={styles.wheelPlaceholder}>
                  {t('overlay.esperandoParticipantes')}
                </div>
              ) : (
                <>
                  <canvas
                    ref={wheelRef}
                    width={280}
                    height={280}
                    className={styles.wheelCanvas}
                  />
                  <div className={styles.wheelPointer} />
                </>
              )}
            </div>

            <div className={styles.totalTickets}>
              {totalTickets > 0 ? `${totalTickets} ${t('overlay.boletosTotal')}` : ''}
            </div>

            <button
              onClick={spinWheelManually}
              disabled={participants.length < 2 || spinning}
              className={`${styles.spinBtn} ${participants.length < 2 || spinning ? styles['spinBtn--disabled'] : styles['spinBtn--active']}`}
            >
              {spinning ? t('overlay.girando') : t('overlay.girarRuleta')}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={styles.winnerOverlay}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className={styles.winnerLabel}
            >
              {t('overlay.ganador')}
            </motion.div>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className={styles.winnerName}
            >
              @{winner.winner}
            </motion.div>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className={styles.winnerPrize}
            >
              {winner.prize}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
