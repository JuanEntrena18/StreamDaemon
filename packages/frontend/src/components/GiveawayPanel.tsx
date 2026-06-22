import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { useToast } from '../contexts/ToastContext';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState } from './EmptyState';
import styles from './GiveawayPanel.module.css';

interface Props {
  channel: string;
  backendUrl: string;
}

interface ActiveGiveaway {
  id: string;
  prize: string;
  status: string;
  entries: number;
  participants: string[];
  tickets: { user: string; tickets: number }[];
  totalTickets: number;
  ticketCost: number;
  ticketRewardTitle: string;
}



const WHEEL_COLORS = [
  '#7c3aed', '#6366f1', '#8b5cf6', '#a78bfa',
  '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#f97316',
];

export function GiveawayPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [prize, setPrize] = useState('');
  const [duration, setDuration] = useState(60);
  const [active, setActive] = useState<ActiveGiveaway | null>(null);
  const [ticketCost, setTicketCost] = useState(1000);
  const [ticketRewardTitle, setTicketRewardTitle] = useState(t('giveaway.configText2'));

  // Wheel state
  const [wheelNames, setWheelNames] = useState<string[]>([]);
  const [wheelInput, setWheelInput] = useState('');
  const [importText, setImportText] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(15);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const { socket, connected } = useSocket();
  const DURATION_OPTIONS = [
    { value: 30,  label: t('giveaway.dur30s') },
    { value: 60,  label: t('giveaway.dur1m') },
    { value: 120, label: t('giveaway.dur2m') },
    { value: 300, label: t('giveaway.dur5m') },
    { value: 600, label: t('giveaway.dur10m') },
    { value: 604800, label: t('giveaway.dur7d') },
    { value: 2592000, label: t('giveaway.dur30d') },
  ];

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useSocketEvent('giveaway:start', useCallback((data: ActiveGiveaway) => {
    setActive(data);
  }, []));

  useSocketEvent('giveaway:entry', useCallback((data: { user: string; participants: string[]; tickets: { user: string; tickets: number }[]; count: number; totalTickets: number }) => {
    setActive((prev) => prev ? {
      ...prev,
      entries: data.count,
      participants: data.participants,
      tickets: data.tickets,
      totalTickets: data.totalTickets,
    } : prev);
  }, []));

  useSocketEvent('giveaway:end', useCallback(() => {
    setActive(null);
  }, []));

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/giveaways/${channel}/active`)
      .then((r) => r.json())
      .then((data) => { if (data && data.id) setActive(data); })
      .catch(() => {});
  }, [channel, backendUrl]);

  useEffect(() => {
    if (autoSpin && wheelNames.length >= 2 && !spinning) {
      setSpinning(true);
      setWinner(null);
      const slice = (2 * Math.PI) / wheelNames.length;
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
          setAutoSpin(false);
          const normalized = ((endRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          const winnerIdx = Math.floor(((2 * Math.PI - normalized) % (2 * Math.PI)) / slice) % wheelNames.length;
          setWinner(wheelNames[winnerIdx]);
        }
      }
      requestAnimationFrame(animate);
    }
  }, [autoSpin, wheelNames]);

  useEffect(() => {
    drawWheel();
  }, [wheelNames, rotation]);

  function drawWheel() {
    const canvas = wheelRef.current;
    if (!canvas || wheelNames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 4;
    const slice = (2 * Math.PI) / wheelNames.length;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    for (let i = 0; i < wheelNames.length; i++) {
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
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(wheelNames[i].substring(0, 12), r - 12, 4);
      ctx.restore();
    }

    ctx.restore();
  }

  function addWheelName() {
    const name = wheelInput.trim();
    if (!name || wheelNames.includes(name)) return;
    setWheelNames([...wheelNames, name]);
    setWheelInput('');
    setWinner(null);
  }

  function removeWheelName(idx: number) {
    setWheelNames(wheelNames.filter((_, i) => i !== idx));
    setWinner(null);
  }

  function spinWheel() {
    if (wheelNames.length < 2 || spinning) return;
    setSpinning(true);
    setWinner(null);

    const slice = (2 * Math.PI) / wheelNames.length;
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
      const currentRotation = startRotation + totalRotation * eased;
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(endRotation);
        setSpinning(false);
        const normalized = ((endRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const winnerIdx = Math.floor(((2 * Math.PI - normalized) % (2 * Math.PI)) / slice) % wheelNames.length;
        setWinner(wheelNames[winnerIdx]);
      }
    }

    requestAnimationFrame(animate);
  }

  const startGiveaway = async () => {
    if (!prize.trim() || !channel) return;
    const res = await fetch(`${backendUrl}/giveaways/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        prize: prize.trim(),
        duration,
        ticketCost: ticketCost || 0,
        ticketRewardTitle: ticketRewardTitle || '',
      }),
    });
    if (res.ok) {
      setPrize('');
      toast.success(t('giveaway.sorteoIniciado') || 'Sorteo iniciado');
    } else {
      toast.error(t('giveaway.errorIniciar') || 'Error al iniciar sorteo');
    }
  };

  const endGiveaway = async () => {
    if (!active) return;
    await fetch(`${backendUrl}/giveaways/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, id: active.id }),
    });
    if (active.participants && active.participants.length >= 2) {
      setWheelNames([...active.participants]);
      setRotation(0);
      setTimeout(() => setAutoSpin(true), 300);
    }
  };

  const handleEndConfirm = () => {
    setShowEndConfirm(false);
    endGiveaway();
  };

  return (
    <div className={styles.container}>
      <div className="mb-5">
        <h2 className="sf-heading flex-row flex-row--gap-md">
          {t('giveaway.title')}
        </h2>
        <p className="text-sm text-muted">
          {t('giveaway.subtitle')}
        </p>
        <div className={styles.infoBannerCyan}>
          <strong className={styles.infoBannerTitle}>{t('giveaway.configTitle')}</strong>
          {' '}{t('giveaway.configText1')}{' '}
          <strong>"{t('giveaway.configText2')}"</strong> con un costo de{' '}
          <strong>{t('giveaway.configText3')}</strong>. {t('giveaway.configText4')}
        </div>
        <div className={styles.infoBannerAmber}>
          <strong className={styles.infoBannerAmberTitle}>{t('giveaway.subMultiplier')}</strong>
          {' '}{t('giveaway.subMultiplierDesc')}{' '}
          <strong>!sorteo</strong>{t('giveaway.subMultiplierDetail')}
        </div>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* ── Existing giveaway system ── */}
        <div>
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <div className="glass-card glass-card--accent animate-glow sf-card">
                  <div className="flex-between mb-4">
                    <div>
                      <span className="sf-badge sf-badge-success mb-3">
                        <span className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sf-success)', display: 'inline-block' }} />
                        {t('giveaway.activo')}
                      </span>
                      <h3 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--sf-text)', marginTop: '0.25rem', lineHeight: 1.3 }}>
                        {active.prize}
                      </h3>
                    </div>
                  </div>
                  <div className={styles.activeStatsBox}>
                    <div className="flex-wrap" style={{ gap: '1.5rem' }}>
                      <div>
                        <span className={styles.statValueGreen}>
                          {active.entries}
                        </span>
                        <div className={styles.statLabelGreen}>{t('giveaway.participantes')}</div>
                      </div>
                      <div>
                        <span className={styles.statValuePurple}>
                          {active.totalTickets}
                        </span>
                        <div className={styles.statLabelPurple}>{t('giveaway.boletosTotales')}</div>
                      </div>
                      {active.ticketCost > 0 && (
                        <div className={styles.ticketCost}>
                          {active.ticketCost} pts/boleto · {active.ticketRewardTitle}
                        </div>
                      )}
                    </div>
                    {active.tickets && active.tickets.length > 0 && (
                      <details className="mt-3">
                        <summary className={styles.summaryText}>
                          {t('giveaway.verBoletos')}
                        </summary>
                        <div className="flex-col flex-col--gap-sm mt-2">
                          {active.tickets.map((entry) => {
                            const prob = active.totalTickets > 0 ? ((entry.tickets / active.totalTickets) * 100).toFixed(1) : '0';
                            return (
                              <div key={entry.user} className={styles.ticketRow}>
                                <span>@{entry.user}</span>
                                <span>{entry.tickets} {t('giveaway.boletos')} ({prob}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                  <button onClick={() => setShowEndConfirm(true)} className="sf-btn sf-btn-danger w-full">
                    {t('giveaway.finalizar')}
                  </button>
                  <ConfirmModal
                    open={showEndConfirm}
                    title={t('giveaway.confirmEndTitle')}
                    message={t('giveaway.confirmEndMsg')}
                    confirmLabel={t('giveaway.finalizar')}
                    onConfirm={handleEndConfirm}
                    onCancel={() => setShowEndConfirm(false)}
                    showDontAskAgain
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <p className="sf-section-title">{t('giveaway.nuevoSorteo')}</p>
                  <div className={styles.formGroup}>
                    <div>
                      <label className="sf-label" style={{ marginBottom: '0.375rem', fontWeight: 500 }}>
                        {t('giveaway.premio')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('giveaway.premioPlaceholder')}
                        value={prize}
                        onChange={(e) => setPrize(e.target.value)}
                        disabled={!channel}
                        className="sf-input"
                      />
                    </div>
                    <div>
                      <label className="sf-label" style={{ marginBottom: '0.375rem', fontWeight: 500 }}>
                        {t('giveaway.duracion')}
                      </label>
                      <div className="flex-wrap">
                        {DURATION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setDuration(opt.value)}
                            disabled={!channel}
                            className={`sf-pill-selector__pill ${duration === opt.value ? 'sf-pill-selector__pill--active' : ''}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="sf-label" style={{ marginBottom: '0.375rem', fontWeight: 500 }}>
                        {t('giveaway.puntosCanal')}
                      </label>
                      <div className="flex-row flex-row--gap-sm">
                        <input
                          type="number"
                          placeholder={t('giveaway.puntosPorBoleto')}
                          value={ticketCost || ''}
                          onChange={(e) => setTicketCost(parseInt(e.target.value) || 0)}
                          disabled={!channel}
                          className="sf-input flex-1"
                        />
                        <input
                          type="text"
                          placeholder={t('giveaway.recompensaPlaceholder')}
                          value={ticketRewardTitle}
                          onChange={(e) => setTicketRewardTitle(e.target.value)}
                          disabled={!channel || !ticketCost}
                          className="sf-input flex-1"
                        />
                      </div>
                      <div className="text-dim" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                        {ticketCost > 0
                          ? t('giveaway.puntosDesc', { reward: ticketRewardTitle || '...', cost: ticketCost })
                          : t('giveaway.puntosDesactivado')}
                      </div>
                    </div>
                    <button
                      onClick={startGiveaway}
                      disabled={!prize.trim() || !channel}
                      className="sf-btn sf-btn-primary w-full mt-2"
                    >
                      {t('giveaway.iniciar')}
                    </button>

                    {!channel && (
                      <p className="text-xs text-dim text-center">
                        {t('giveaway.emptyChannel')}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Spin wheel ── */}
        <div>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <p className="sf-section-title mb-3">{t('giveaway.ruleta')}</p>
            <p className={styles.description}>
              {t('giveaway.ruletaDesc')}
            </p>

            <details className="mb-3">
              <summary className={styles.summaryText} style={{ userSelect: 'none' }}>
                {t('giveaway.importar')}
              </summary>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={t('giveaway.importarPlaceholder')}
                className={`sf-input ${styles.importTextarea}`}
              />
              <div className="flex-row flex-row--gap-sm mt-2">
                <button
                  onClick={() => {
                    const names = importText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
                    if (names.length === 0) return;
                    setWheelNames((prev) => {
                      const existing = new Set(prev);
                      const newNames = names.filter((n) => !existing.has(n));
                      return [...prev, ...newNames];
                    });
                    setImportText('');
                    setWinner(null);
                  }}
                  disabled={!importText.trim()}
                  className="sf-btn sf-btn-primary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.875rem' }}
                >
                  {t('giveaway.añadirARuleta')}
                </button>
                <span className={styles.hintText}>
                  {t('giveaway.nombresHint')}
                </span>
              </div>
            </details>

            <div className="flex-row flex-row--gap-sm mb-3">
              <input
                type="text"
                value={wheelInput}
                onChange={(e) => setWheelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addWheelName(); }}
                placeholder={t('giveaway.participantePlaceholder')}
                className="sf-input flex-1"
                style={{ fontSize: '0.82rem' }}
              />
              <button
                onClick={addWheelName}
                disabled={!wheelInput.trim()}
                className="sf-btn sf-btn-primary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              >
                {t('giveaway.añadir')}
              </button>
            </div>

            {wheelNames.length > 0 && (
              <div className="flex-wrap mb-4">
                {wheelNames.map((name, i) => (
                  <span
                    key={i}
                    className={styles.wheelChip}
                    style={{
                      background: `${WHEEL_COLORS[i % WHEEL_COLORS.length]}33`,
                      border: `1px solid ${WHEEL_COLORS[i % WHEEL_COLORS.length]}66`,
                    }}
                  >
                    {name}
                    <button
                      onClick={() => removeWheelName(i)}
                      className={styles.wheelRemoveBtn}
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex-row flex-row--gap-sm mb-3">
              <span className="text-dim" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
                {t('giveaway.giroDuracion')}
              </span>
              {[10, 15, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpinDuration(s)}
                  className={`sf-pill-selector__pill sf-pill-selector__pill--sm ${spinDuration === s ? 'sf-pill-selector__pill--active' : ''}`}
                >
                  {s} {t('giveaway.seg')}
                </button>
              ))}
            </div>

            <div className={styles.wheelContainer}>
              {wheelNames.length < 2 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EmptyState
                    icon="🎡"
                    title={t('giveaway.emptyTitle') || 'Ruleta vacía'}
                    description={t('giveaway.minimoNombres') || 'Añade al menos 2 nombres para girar la ruleta.'}
                  />
                </div>
              ) : (
                <>
                  <canvas
                    ref={wheelRef}
                    width={280}
                    height={280}
                    style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                  />
                  <div className={styles.wheelPointer} />
                </>
              )}
            </div>

            <button
              onClick={spinWheel}
              disabled={wheelNames.length < 2 || spinning}
              className={`sf-btn w-full ${spinning ? 'sf-btn-ghost' : 'sf-btn-primary'}`}
              style={{ marginBottom: winner ? '0.75rem' : 0 }}
            >
              {spinning ? t('giveaway.girando') : t('giveaway.girar')}
            </button>

            {winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.winnerBox}
              >
                <div className={styles.winnerLabel}>
                  {t('giveaway.ganador')}
                </div>
                <div className={styles.winnerName}>
                  {winner}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
