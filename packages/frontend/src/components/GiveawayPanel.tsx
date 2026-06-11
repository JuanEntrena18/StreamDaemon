import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';

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

const DURATION_OPTIONS = [
  { value: 30,  label: '30 seg' },
  { value: 60,  label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 604800, label: '7 días' },
  { value: 2592000, label: '30 días' },
];

const WHEEL_COLORS = [
  '#7c3aed', '#6366f1', '#8b5cf6', '#a78bfa',
  '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#f97316',
];

export function GiveawayPanel({ channel, backendUrl }: Props) {
  const [prize, setPrize] = useState('');
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState<ActiveGiveaway | null>(null);
  const [ticketCost, setTicketCost] = useState(1000);
  const [ticketRewardTitle, setTicketRewardTitle] = useState('Sorteo');

  // Wheel state
  const [wheelNames, setWheelNames] = useState<string[]>([]);
  const [wheelInput, setWheelInput] = useState('');
  const [importText, setImportText] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(15);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useSocketEvent('giveaway:start', useCallback((data: ActiveGiveaway) => {
    setActive(data);
    setMessage('');
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
    setMessage('');
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
    } else {
      setMessage('Error al iniciar sorteo');
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

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🎁 Sorteos
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Gestiona sorteos con sistema de boletos, multiplicador por suscripción y ruleta aleatoria
        </p>
        <div style={{
          marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: 8,
          background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
          fontSize: '0.78rem', color: 'var(--sf-text-2)', lineHeight: 1.5,
        }}>
          <strong style={{ color: '#22d3ee' }}>⚙️ Configuración automática:</strong>
          {' '}Crea una recompensa de puntos de canal en Twitch llamada{' '}
          <strong>"Sorteo"</strong> con un costo de{' '}
          <strong>1000 puntos</strong>. Cuando un viewer la canjee durante un
          sorteo activo, recibirá boletos extra automáticamente (1 boleto por
          cada 1000 pts canjeados).
        </div>
        <div style={{
          marginTop: '0.5rem', padding: '0.75rem 1rem', borderRadius: 8,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          fontSize: '0.78rem', color: 'var(--sf-text-2)', lineHeight: 1.5,
        }}>
          <strong style={{ color: '#fbbf24' }}>👑 Multiplicador por suscripción:</strong>
          {' '}Los suscriptores obtienen boletos extra automáticamente al escribir{' '}
          <strong>!sorteo</strong>: Tier 1 = ×2, Tier 2 = ×5, Tier 3 = ×10 boletos.
          Los no suscriptores reciben 1 boleto base.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
                <div className="glass-card glass-card--accent animate-glow" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <span className="sf-badge sf-badge-success" style={{ marginBottom: '0.625rem' }}>
                        <span className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sf-success)', display: 'inline-block' }} />
                        Sorteo activo
                      </span>
                      <h3 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--sf-text)', marginTop: '0.25rem', lineHeight: 1.3 }}>
                        {active.prize}
                      </h3>
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 10, padding: '0.875rem 1rem',
                    marginBottom: '1.25rem',
                  }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
                          {active.entries}
                        </span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399' }}>participantes</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa' }}>
                          {active.totalTickets}
                        </span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a78bfa' }}>boletos totales</div>
                      </div>
                      {active.ticketCost > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)' }}>
                          {active.ticketCost} pts/boleto · {active.ticketRewardTitle}
                        </div>
                      )}
                    </div>
                    {active.tickets && active.tickets.length > 0 && (
                      <details style={{ marginTop: '0.75rem' }}>
                        <summary style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', cursor: 'pointer' }}>
                          Ver boletos por participante
                        </summary>
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {active.tickets.map((t) => {
                            const prob = active.totalTickets > 0 ? ((t.tickets / active.totalTickets) * 100).toFixed(1) : '0';
                            return (
                              <div key={t.user} style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: '0.78rem', color: 'var(--sf-text-2)',
                                padding: '0.2rem 0.4rem', borderRadius: 4,
                                background: 'rgba(255,255,255,0.03)',
                              }}>
                                <span>@{t.user}</span>
                                <span>{t.tickets} boletos ({prob}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                  <button onClick={endGiveaway} className="sf-btn sf-btn-danger" style={{ width: '100%' }}>
                    Finalizar sorteo y escoger ganador
                  </button>
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
                  <p className="sf-section-title">Nuevo sorteo</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.375rem', fontWeight: 500 }}>
                        Premio
                      </label>
                      <input
                        type="text"
                        placeholder="ej. Suscripción de 3 meses..."
                        value={prize}
                        onChange={(e) => setPrize(e.target.value)}
                        disabled={!channel}
                        className="sf-input"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.375rem', fontWeight: 500 }}>
                        Duración
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {DURATION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setDuration(opt.value)}
                            disabled={!channel}
                            style={{
                              padding: '0.35rem 0.875rem', borderRadius: 99, border: '1px solid',
                              borderColor: duration === opt.value ? 'var(--sf-primary)' : 'var(--sf-border)',
                              background: duration === opt.value ? 'rgba(124,58,237,0.2)' : 'transparent',
                              color: duration === opt.value ? '#a78bfa' : 'var(--sf-text-3)',
                              fontSize: '0.8rem', fontWeight: duration === opt.value ? 600 : 400,
                              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
                              opacity: !channel ? 0.4 : 1,
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.375rem', fontWeight: 500 }}>
                        Boletos por puntos de canal (opcional)
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="number"
                          placeholder="Puntos por boleto (0 = desactivado)"
                          value={ticketCost || ''}
                          onChange={(e) => setTicketCost(parseInt(e.target.value) || 0)}
                          disabled={!channel}
                          className="sf-input"
                          style={{ flex: 1 }}
                        />
                        <input
                          type="text"
                          placeholder="Nombre de la recompensa"
                          value={ticketRewardTitle}
                          onChange={(e) => setTicketRewardTitle(e.target.value)}
                          disabled={!channel || !ticketCost}
                          className="sf-input"
                          style={{ flex: 1 }}
                        />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--sf-text-3)', marginTop: '0.25rem' }}>
                        {ticketCost > 0
                          ? `Los viewers pueden canjear "${ticketRewardTitle || '...'}" por ${ticketCost} pts para obtener boletos extra`
                          : 'Desactivado — solo se usará el comando !sorteo'}
                      </div>
                    </div>
                    <button
                      onClick={startGiveaway}
                      disabled={!prize.trim() || !channel}
                      className="sf-btn sf-btn-primary"
                      style={{ width: '100%', marginTop: '0.25rem' }}
                    >
                      🎁 Iniciar sorteo
                    </button>
                    {message && <p style={{ fontSize: '0.8rem', color: 'var(--sf-warning)', textAlign: 'center' }}>{message}</p>}
                    {!channel && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', textAlign: 'center' }}>
                        Ingresa tu canal de Twitch en la barra superior
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
            <p className="sf-section-title" style={{ marginBottom: '0.75rem' }}>🎡 Ruleta aleatoria</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Añade nombres y haz girar la ruleta para escoger un ganador al azar.
            </p>

            <details style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', cursor: 'pointer', userSelect: 'none' }}>
                📋 Importar lista de nombres
              </summary>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Pega aquí los nombres, separados por comas o uno por línea&#10;Ej: usuario1, usuario2, usuario3&#10;o:&#10;usuario1&#10;usuario2"
                className="sf-input"
                style={{ marginTop: '0.5rem', minHeight: 80, fontSize: '0.78rem', lineHeight: 1.5, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
                  Añadir a la ruleta
                </button>
                <span style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', alignSelf: 'center' }}>
                  Nombres separados por comas o saltos de línea
                </span>
              </div>
            </details>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={wheelInput}
                onChange={(e) => setWheelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addWheelName(); }}
                placeholder="Nombre del participante"
                className="sf-input"
                style={{ flex: 1, fontSize: '0.82rem' }}
              />
              <button
                onClick={addWheelName}
                disabled={!wheelInput.trim()}
                className="sf-btn sf-btn-primary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
              >
                Añadir
              </button>
            </div>

            {wheelNames.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
                {wheelNames.map((name, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.2rem 0.6rem', borderRadius: 99,
                      background: `${WHEEL_COLORS[i % WHEEL_COLORS.length]}33`,
                      border: `1px solid ${WHEEL_COLORS[i % WHEEL_COLORS.length]}66`,
                      fontSize: '0.78rem', color: 'var(--sf-text-2)',
                    }}
                  >
                    {name}
                    <button
                      onClick={() => removeWheelName(i)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--sf-text-3)',
                        cursor: 'pointer', padding: 0, fontSize: '0.85rem', lineHeight: 1,
                      }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', fontWeight: 500 }}>
                ⏱ Duración del giro
              </span>
              {[10, 15, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpinDuration(s)}
                  style={{
                    padding: '0.25rem 0.625rem', borderRadius: 99, border: '1px solid',
                    borderColor: spinDuration === s ? 'var(--sf-primary)' : 'var(--sf-border)',
                    background: spinDuration === s ? 'rgba(124,58,237,0.2)' : 'transparent',
                    color: spinDuration === s ? '#a78bfa' : 'var(--sf-text-3)',
                    fontSize: '0.72rem', fontWeight: spinDuration === s ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
                  }}
                >
                  {s} seg
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', marginBottom: '1rem' }}>
              {wheelNames.length < 2 ? (
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  border: '2px dashed var(--sf-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--sf-text-3)', fontSize: '0.82rem',
                }}>
                  Añade al menos 2 nombres
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
                    borderTop: '14px solid var(--sf-text)',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                    zIndex: 2,
                  }} />
                </>
              )}
            </div>

            <button
              onClick={spinWheel}
              disabled={wheelNames.length < 2 || spinning}
              className={`sf-btn ${spinning ? 'sf-btn-ghost' : 'sf-btn-primary'}`}
              style={{ width: '100%', marginBottom: winner ? '0.75rem' : 0 }}
            >
              {spinning ? '🎡 Girando...' : '🎡 Girar ruleta'}
            </button>

            {winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: '0.75rem 1rem', borderRadius: 'var(--sf-radius-sm)',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600, marginBottom: '0.15rem' }}>
                  🏆 GANADOR
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#6ee7b7' }}>
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
