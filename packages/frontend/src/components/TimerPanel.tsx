import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiPost, OVERLAY_BASE_URL } from '../utils/api';
import type { TimerState } from '@streamforger/shared';

interface Props {
  channel: string;
  backendUrl: string;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const DURATION_PRESETS = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
];

export function TimerPanel({ channel, backendUrl }: Props) {
  const [timer, setTimer] = useState<TimerState>({ status: 'stopped', remaining: 0, duration: 0, label: '' });
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(300);
  const [label, setLabel] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');

  const { socket, connected } = useSocket();

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useSocketEvent('timer:state', useCallback((data: TimerState) => {
    setTimer(data);
    setRemaining(data.remaining);
  }, []));

  useSocketEvent('timer:tick', useCallback((data: { remaining: number }) => {
    setRemaining(data.remaining);
  }, []));

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/timer/${channel}`)
      .then((r) => r.json())
      .then((data) => { setTimer(data); setRemaining(data.remaining); })
      .catch(() => {});
  }, [channel, backendUrl]);

  const start = () => {
    const dur = customMinutes ? parseInt(customMinutes) * 60 : duration;
    apiPost('/timer/start', { channel, duration: dur, label });
  };

  const pause = () => apiPost('/timer/pause', { channel });
  const resume = () => apiPost('/timer/resume', { channel });
  const reset = () => apiPost('/timer/reset', { channel });

  const isRunning = timer.status === 'running';
  const isPaused = timer.status === 'paused';
  const isFinished = timer.status === 'finished';
  const isActive = isRunning || isPaused;

  const progress = timer.duration > 0 ? remaining / timer.duration : 0;

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          ⏱️ Temporizador
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Cuenta regresiva en vivo para el stream. Aparece como overlay en OBS.
        </p>
      </div>

      {/* Timer display */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        <div style={{
          fontSize: '3.5rem', fontWeight: 800, color: 'var(--sf-text)',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
          marginBottom: '0.5rem',
        }}>
          {isFinished ? '00:00' : formatTime(remaining)}
        </div>

        {timer.label && (
          <div style={{ fontSize: '0.85rem', color: 'var(--sf-text-2)', marginBottom: '0.75rem' }}>
            {timer.label}
          </div>
        )}

        {isActive && (
          <div style={{
            width: '100%', height: 4, borderRadius: 99, overflow: 'hidden',
            background: 'rgba(255,255,255,0.08)', marginBottom: '0.75rem',
          }}>
            <div style={{
              width: `${progress * 100}%`, height: '100%',
              background: remaining <= 30 ? '#ef4444' : '#a78bfa',
              borderRadius: 99, transition: 'width 1s linear',
            }} />
          </div>
        )}

        <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginBottom: '1rem' }}>
          {isRunning && 'Corriendo'}
          {isPaused && 'Pausado'}
          {isFinished && '⏰ Tiempo cumplido'}
          {timer.status === 'stopped' && 'Sin temporizador activo'}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isActive && !isFinished && (
            <button onClick={start} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
              ▶ Iniciar
            </button>
          )}
          {isRunning && (
            <button onClick={pause} className="sf-btn" style={{
              fontSize: '0.85rem',
              background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
              ⏸ Pausar
            </button>
          )}
          {isPaused && (
            <button onClick={resume} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
              ▶ Reanudar
            </button>
          )}
          {(isActive || isFinished) && (
            <button onClick={reset} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.85rem' }}>
              ⏹ Reiniciar
            </button>
          )}
        </div>
      </div>

      {/* New timer config */}
      {!isActive && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <p className="sf-section-title">⏲️ Nuevo temporizador</p>

          {/* Duration presets */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.4rem', display: 'block' }}>
              Duración
            </label>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setDuration(p.value); setCustomMinutes(''); }}
                  className="sf-btn"
                  style={{
                    fontSize: '0.75rem', padding: '0.35rem 0.7rem',
                    background: duration === p.value && !customMinutes
                      ? 'var(--sf-primary)' : 'var(--sf-surface-hover)',
                    color: duration === p.value && !customMinutes ? '#fff' : 'var(--sf-text-2)',
                    border: duration === p.value && !customMinutes
                      ? '1px solid var(--sf-primary)' : '1px solid var(--sf-border)',
                  }}
                >
                  {p.label}
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number" min="1"
                  placeholder="min"
                  value={customMinutes}
                  onChange={(e) => { setCustomMinutes(e.target.value); }}
                  className="sf-input"
                  style={{ width: 60, fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)' }}>min</span>
              </div>
            </div>
          </div>

          {/* Label */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.4rem', display: 'block' }}>
              Etiqueta (opcional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Pausa, Speedrun, Sorteo..."
              className="sf-input"
              style={{ maxWidth: 300 }}
            />
          </div>

          <button onClick={start} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
            ▶ Iniciar temporizador
          </button>
        </div>
      )}

      {/* Overlay URL */}
      <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.25rem' }}>
        <p className="sf-section-title">🔌 Overlay URL</p>
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 6,
          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--sf-border)',
          fontSize: '0.78rem', fontFamily: 'monospace', color: '#a78bfa',
          wordBreak: 'break-all',
        }}>
          {OVERLAY_BASE_URL}/overlay.html?mode=timer&amp;channel={channel}
        </div>
      </div>
    </div>
  );
}
