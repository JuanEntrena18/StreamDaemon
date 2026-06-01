import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketEvent } from '../hooks/useSocket';

interface Props {
  channel: string;
  backendUrl: string;
}

interface ActiveGiveaway {
  id: string;
  prize: string;
  status: string;
  entries: number;
}

const DURATION_OPTIONS = [
  { value: 30,  label: '30 seg' },
  { value: 60,  label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
];

export function GiveawayPanel({ channel, backendUrl }: Props) {
  const [prize, setPrize] = useState('');
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState<ActiveGiveaway | null>(null);

  useSocketEvent('giveaway:start', useCallback((data: ActiveGiveaway) => {
    setActive(data);
    setMessage('');
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

  const startGiveaway = async () => {
    if (!prize.trim() || !channel) return;
    const res = await fetch(`${backendUrl}/giveaways/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, prize: prize.trim(), duration }),
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
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🎁 Sorteos
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Gestiona sorteos en tiempo real a través del chat de Twitch.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {active ? (
          /* ── Active giveaway card ── */
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="glass-card glass-card--accent animate-glow"
              style={{ padding: '1.5rem', marginBottom: '1rem' }}
            >
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
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 10,
                padding: '0.875rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
                  {active.entries}
                </span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399' }}>participantes</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)' }}>Escribe !sorteo en el chat para participar</div>
                </div>
              </div>

              <button
                id="end-giveaway-btn"
                onClick={endGiveaway}
                className="sf-btn sf-btn-danger"
                style={{ width: '100%' }}
              >
                Finalizar sorteo y escoger ganador
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── Create giveaway form ── */
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
                    id="giveaway-prize-input"
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
                          padding: '0.35rem 0.875rem',
                          borderRadius: 99,
                          border: '1px solid',
                          borderColor: duration === opt.value ? 'var(--sf-primary)' : 'var(--sf-border)',
                          background: duration === opt.value ? 'rgba(124,58,237,0.2)' : 'transparent',
                          color: duration === opt.value ? '#a78bfa' : 'var(--sf-text-3)',
                          fontSize: '0.8rem',
                          fontWeight: duration === opt.value ? 600 : 400,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s ease',
                          opacity: !channel ? 0.4 : 1,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  id="start-giveaway-btn"
                  onClick={startGiveaway}
                  disabled={!prize.trim() || !channel}
                  className="sf-btn sf-btn-primary"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                >
                  🎁 Iniciar sorteo
                </button>

                {message && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--sf-warning)', textAlign: 'center' }}>{message}</p>
                )}
                {!channel && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', textAlign: 'center' }}>
                    Ingresa tu canal de Twitch en la barra superior para comenzar
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
