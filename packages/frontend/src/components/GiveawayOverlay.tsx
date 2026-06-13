import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import type { GiveawayData, GiveawayEntryData } from '@streamforger/shared';

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
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {!hasGiveaway && !spinning && !winner ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', fontWeight: 500,
        }}>
          {t('overlay.esperandoSorteo')}
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: 0, height: '100%',
        }}>
          {/* ── Left: Participants ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            padding: '2rem',
            overflow: 'hidden',
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)',
              marginBottom: '0.5rem',
            }}>
              {t('overlay.participantes', { n: participants.length, total: totalTickets })}
            </div>
            {hasGiveaway && (
              <>
                <div style={{
                  fontSize: '1.4rem', fontWeight: 700, color: '#a78bfa',
                  marginBottom: '0.5rem', lineHeight: 1.2,
                }}>
                  {giveaway.prize}
                </div>
                {giveaway.ticketCost > 0 && (
                  <div style={{
                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)',
                    marginBottom: '1rem',
                  }}>
                    {giveaway.ticketCost} pts/boleto · {giveaway.ticketRewardTitle}
                  </div>
                )}
              </>
            )}
            <div style={{
              flex: 1, overflowY: 'auto', display: 'flex',
              flexDirection: 'column', gap: '0.35rem',
            }}>
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
                      style={{
                        padding: '0.4rem 0.75rem',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 6,
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.8)',
                        fontWeight: 500,
                        borderLeft: '3px solid #7c3aed',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <span>@{name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                        {ticketCount} b ({prob}%)
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right: Wheel ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              marginBottom: '1rem',
            }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                {t('overlay.giro')}
              </span>
              {[10, 15, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpinDuration(s)}
                  style={{
                    padding: '0.2rem 0.55rem', borderRadius: 99, border: '1px solid',
                    borderColor: spinDuration === s ? '#a78bfa' : 'rgba(255,255,255,0.15)',
                    background: spinDuration === s ? 'rgba(124,58,237,0.25)' : 'transparent',
                    color: spinDuration === s ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                    fontSize: '0.7rem', fontWeight: spinDuration === s ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    lineHeight: 1,
                  }}
                >
                  {s}s
                </button>
              ))}
            </div>

            <div style={{
              position: 'relative',
              width: 'min(280px, 80%)',
              aspectRatio: '1',
              marginBottom: '1rem',
            }}>
              {participants.length < 2 ? (
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  border: '2px dashed rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem',
                }}>
                  {t('overlay.esperandoParticipantes')}
                </div>
              ) : (
                <>
                  <canvas
                    ref={wheelRef}
                    width={280}
                    height={280}
                    style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                  />
                  <div style={{
                    position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: '14px solid rgba(255,255,255,0.9)',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                    zIndex: 2,
                  }} />
                </>
              )}
            </div>

            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>
              {totalTickets > 0 ? `${totalTickets} ${t('overlay.boletosTotal')}` : ''}
            </div>

            <button
              onClick={spinWheelManually}
              disabled={participants.length < 2 || spinning}
              style={{
                padding: '0.6rem 2rem', borderRadius: 99, border: 'none',
                background: spinning
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #7c3aed, #6366f1)',
                color: '#fff', fontSize: '0.85rem', fontWeight: 600,
                cursor: participants.length < 2 || spinning ? 'default' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
                opacity: participants.length < 2 ? 0.4 : 1,
              }}
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
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
              zIndex: 100,
            }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              {t('overlay.ganador')}
            </motion.div>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{ fontSize: '3.5rem', fontWeight: 800, color: '#a78bfa', textAlign: 'center', lineHeight: 1.2, marginBottom: '0.5rem' }}
            >
              @{winner.winner}
            </motion.div>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              style={{ fontSize: '1.4rem', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}
            >
              {winner.prize}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
