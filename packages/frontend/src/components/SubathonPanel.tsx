import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n/context';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiPost, OVERLAY_BASE_URL } from '../utils/api';
import type { SubathonState, SubathonAction } from '@streamforger/shared';

interface Props {
  channel: string;
  backendUrl: string;
}

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const ACTION_COLORS: Record<SubathonAction['type'], string> = {
  sub: '#9147ff',
  bits: '#f59e0b',
  redeem: '#10b981',
  manual: '#6366f1',
};

export function SubathonPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<SubathonState | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [subTime, setSubTime] = useState(300);
  const [bitTime, setBitTime] = useState(60);
  const [bitsPerUnit, setBitsPerUnit] = useState(100);
  const [maxLimit, setMaxLimit] = useState(86400);

  const [manualUser, setManualUser] = useState('');
  const [manualTime, setManualTime] = useState(60);
  const [manualNote, setManualNote] = useState('');

  const { socket, connected } = useSocket();

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useSocketEvent('subathon:state', useCallback((data: SubathonState) => {
    setState(data);
    setRemaining(data.remaining);
    setSubTime(data.subTime);
    setBitTime(data.bitTime);
    setBitsPerUnit(data.bitsPerUnit);
    setMaxLimit(data.maxLimit);
  }, []));

  useSocketEvent('subathon:tick', useCallback((data: { remaining: number }) => {
    setRemaining(data.remaining);
  }, []));

  useSocketEvent('subathon:time-added', useCallback((data: { amount: number; reason: string; user: string }) => {
    setRemaining((r) => r + data.amount);
  }, []));

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/subathon/${channel}`)
      .then((r) => r.json())
      .then((data) => { setState(data); setRemaining(data.remaining); })
      .catch(() => {});
  }, [channel, backendUrl]);

  const start = () => apiPost('/subathon/start', { channel, subTime, bitTime, bitsPerUnit, maxLimit, initialTime: 3600 });
  const pause = () => apiPost('/subathon/pause', { channel });
  const resume = () => apiPost('/subathon/resume', { channel });
  const stop = () => apiPost('/subathon/stop', { channel });
  const addTime = () => {
    if (!manualUser || manualTime <= 0) return;
    apiPost('/subathon/add-time', { channel, type: 'manual', user: manualUser, amount: manualTime, note: manualNote || 'Manual' });
    setManualUser('');
    setManualTime(60);
    setManualNote('');
  };
  const updateConfig = () => apiPost('/subathon/config', { channel, subTime, bitTime, bitsPerUnit, maxLimit });

  const isRunning = state?.status === 'running';
  const isPaused = state?.status === 'paused';
  const isStopped = state?.status === 'stopped';
  const isFinished = state?.status === 'finished';
  const isActive = isRunning || isPaused;

  const progress = maxLimit > 0 ? remaining / maxLimit : 0;
  const barColor = progress > 0.75 ? '#ef4444' : progress > 0.5 ? '#f59e0b' : '#a78bfa';

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          {t('subathon.title')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          {t('subathon.subtitle')}
        </p>
      </div>

      {/* Timer display */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        <div style={{
          fontSize: '3.5rem', fontWeight: 800, color: 'var(--sf-text)',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
          marginBottom: '0.25rem',
        }}>
          {formatTime(remaining)}
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginBottom: '0.75rem' }}>
          {t('subathon.limiteMaximo', { duration: formatDuration(maxLimit) })}
        </div>

        {/* Progress bar */}
        {(isActive || isFinished) && (
          <div style={{
            width: '100%', height: 6, borderRadius: 99, overflow: 'hidden',
            background: 'rgba(255,255,255,0.08)', marginBottom: '0.5rem',
            position: 'relative',
          }}>
            <div style={{
              width: `${Math.min(progress * 100, 100)}%`, height: '100%',
              background: barColor,
              borderRadius: 99, transition: 'width 1s linear, background 1s',
            }} />
          </div>
        )}

        <div style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginBottom: '1rem' }}>
          {isRunning && t('subathon.corriendo')}
          {isPaused && t('subathon.pausado')}
          {isFinished && t('subathon.tiempoCumplido')}
          {isStopped && !state?.totalAdded && t('subathon.sinActivo')}
          {isStopped && state?.totalAdded && t('subathon.detenido')}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {(isStopped || isFinished) && (
            <button onClick={start} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
              {t('subathon.iniciar')}
            </button>
          )}
          {isRunning && (
            <button onClick={pause} className="sf-btn" style={{
              fontSize: '0.85rem',
              background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
              {t('subathon.pausar')}
            </button>
          )}
          {isPaused && (
            <button onClick={resume} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
              {t('subathon.reanudar')}
            </button>
          )}
          {isActive && (
            <button onClick={stop} className="sf-btn" style={{
              fontSize: '0.85rem',
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
            }}>
              {t('subathon.detener')}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Config */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p className="sf-section-title">{t('subathon.config')}</p>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>
              {t('subathon.tiempoPorSub')}
            </label>
            <input type="number" min={0} step={30} value={subTime}
              onChange={(e) => setSubTime(parseInt(e.target.value) || 0)}
              className="sf-input" style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>
              {t('subathon.tiempoPorBits', { bits: bitsPerUnit })}
            </label>
            <input type="number" min={0} step={10} value={bitTime}
              onChange={(e) => setBitTime(parseInt(e.target.value) || 0)}
              className="sf-input" style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>
              {t('subathon.bitsPorUnidad')}
            </label>
            <input type="number" min={1} step={50} value={bitsPerUnit}
              onChange={(e) => setBitsPerUnit(parseInt(e.target.value) || 100)}
              className="sf-input" style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>
              {t('subathon.limiteMaxSegundos')}
            </label>
            <input type="number" min={0} step={3600} value={maxLimit}
              onChange={(e) => setMaxLimit(parseInt(e.target.value) || 0)}
              className="sf-input" style={{ width: '100%' }}
            />
          </div>

          <button onClick={updateConfig} className="sf-btn" style={{ fontSize: '0.8rem', width: '100%' }}>
            {t('subathon.guardarConfig')}
          </button>
        </div>

        {/* Add time manually */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p className="sf-section-title">{t('subathon.addTiempo')}</p>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>
              {t('subathon.usuario')}
            </label>
            <input type="text" value={manualUser}
              onChange={(e) => setManualUser(e.target.value)}
              placeholder={t('subathon.viewerPlaceholder')}
              className="sf-input" style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>
              {t('subathon.tiempoSegundos')}
            </label>
            <input type="number" min={1} step={30} value={manualTime}
              onChange={(e) => setManualTime(parseInt(e.target.value) || 0)}
              className="sf-input" style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>
              Nota (opcional)
            </label>
            <input type="text" value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder={t('subathon.razonPlaceholder')}
              className="sf-input" style={{ width: '100%' }}
            />
          </div>

          <button onClick={addTime} disabled={!manualUser || manualTime <= 0}
            className="sf-btn sf-btn-primary" style={{ fontSize: '0.8rem', width: '100%' }}>
            {t('subathon.añadirTiempo')}
          </button>
        </div>
      </div>

      {/* Actions log */}
      {state && state.actions.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <p className="sf-section-title">{t('subathon.historial')}</p>
          <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {state.actions.map((a) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.4rem 0.6rem', borderRadius: 6,
                background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: ACTION_COLORS[a.type], flexShrink: 0,
                }} />
                <span style={{ color: 'var(--sf-text)', fontWeight: 600, minWidth: 80 }}>
                  {a.user}
                </span>
                <span style={{ color: ACTION_COLORS[a.type], fontWeight: 600 }}>
                  +{formatDuration(a.timeAdded)}
                </span>
                <span style={{ color: 'var(--sf-text-3)' }}>
                  {t('subathon.' + a.type)}
                  {a.note && ` · ${a.note}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overlay URL */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <p className="sf-section-title">{t('subathon.overlayUrl')}</p>
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 6,
          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--sf-border)',
          fontSize: '0.78rem', fontFamily: 'monospace', color: '#a78bfa',
          wordBreak: 'break-all',
        }}>
          {OVERLAY_BASE_URL}/overlays/subathon.html?channel={channel}
        </div>
      </div>
    </div>
  );
}
