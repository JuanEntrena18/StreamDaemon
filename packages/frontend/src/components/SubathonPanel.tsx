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
  follow: '#22c55e',
  tip: '#ec4899',
};

export function SubathonPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<SubathonState | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [subTier1Time, setSubTier1Time] = useState(300);
  const [subTier2Time, setSubTier2Time] = useState(600);
  const [subTier3Time, setSubTier3Time] = useState(900);
  const [otherSubTime, setOtherSubTime] = useState(180);
  const [tipTime, setTipTime] = useState(30);
  const [cheerBitsPerUnit, setCheerBitsPerUnit] = useState(100);
  const [cheerTimePerUnit, setCheerTimePerUnit] = useState(60);
  const [followTime, setFollowTime] = useState(120);
  const [maxLimit, setMaxLimit] = useState(86400);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertDuration, setAlertDuration] = useState(6);
  const [primaryColor, setPrimaryColor] = useState('#ef4444');
  const [accentColor, setAccentColor] = useState('#a78bfa');
  const [bgColor, setBgColor] = useState('#0a0a0f');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');

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
    setSubTier1Time(data.subTier1Time);
    setSubTier2Time(data.subTier2Time);
    setSubTier3Time(data.subTier3Time);
    setOtherSubTime(data.otherSubTime);
    setTipTime(data.tipTime);
    setCheerBitsPerUnit(data.cheerBitsPerUnit);
    setCheerTimePerUnit(data.cheerTimePerUnit);
    setFollowTime(data.followTime);
    setMaxLimit(data.maxLimit);
    setAlertsEnabled(data.alertsEnabled);
    setAlertDuration(data.alertDuration);
    setPrimaryColor(data.primaryColor);
    setAccentColor(data.accentColor);
    setBgColor(data.bgColor);
    setTextColor(data.textColor);
    setFontFamily(data.fontFamily);
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

  const start = () => apiPost('/subathon/start', {
    channel, initialTime: 3600,
    subTier1Time, subTier2Time, subTier3Time, otherSubTime, tipTime,
    cheerBitsPerUnit, cheerTimePerUnit, followTime, maxLimit,
    alertsEnabled, alertDuration, primaryColor, accentColor, bgColor, textColor, fontFamily,
  });
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
  const updateConfig = () => apiPost('/subathon/config', {
    channel,
    subTier1Time, subTier2Time, subTier3Time, otherSubTime, tipTime,
    cheerBitsPerUnit, cheerTimePerUnit, followTime, maxLimit,
    alertsEnabled, alertDuration, primaryColor, accentColor, bgColor, textColor, fontFamily,
  });

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem', alignItems: 'start' }}>
        {/* Left column: config, alerts, design */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Time Config */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p className="sf-section-title">{t('subathon.config')}</p>

          {([
            { key: 'subTier1Time', label: t('subathon.subTier1'), val: subTier1Time, set: setSubTier1Time, step: 30 },
            { key: 'subTier2Time', label: t('subathon.subTier2'), val: subTier2Time, set: setSubTier2Time, step: 30 },
            { key: 'subTier3Time', label: t('subathon.subTier3'), val: subTier3Time, set: setSubTier3Time, step: 30 },
            { key: 'otherSubTime', label: t('subathon.otherSub'), val: otherSubTime, set: setOtherSubTime, step: 30 },
            { key: 'tipTime', label: t('subathon.tipTime'), val: tipTime, set: setTipTime, step: 10 },
            { key: 'cheerTimePerUnit', label: t('subathon.cheerTime', { bits: cheerBitsPerUnit }), val: cheerTimePerUnit, set: setCheerTimePerUnit, step: 10 },
            { key: 'cheerBitsPerUnit', label: t('subathon.cheerBits'), val: cheerBitsPerUnit, set: setCheerBitsPerUnit, step: 50 },
            { key: 'followTime', label: t('subathon.followTime'), val: followTime, set: setFollowTime, step: 30 },
          ] as const).map(({ key, label, val, set, step }) => (
            <div key={key} style={{ marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.2rem' }}>
                {label}
              </label>
              <input type="number" min={0} step={step} value={val}
                onChange={(e) => set(parseInt(e.target.value) || 0)}
                className="sf-input" style={{ width: '100%' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.2rem' }}>
              {t('subathon.limiteMaxSegundos')}
            </label>
            <input type="number" min={0} step={3600} value={maxLimit}
              onChange={(e) => setMaxLimit(parseInt(e.target.value) || 0)}
              className="sf-input" style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Dynamic On-Screen Alerts */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p className="sf-section-title">{t('subathon.alertsTitle')}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)', marginBottom: '0.75rem' }}>
            {t('subathon.alertsDesc')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--sf-text)' }}>
              {t('subathon.alertsEnabled')}
            </label>
            <button onClick={() => setAlertsEnabled(!alertsEnabled)}
              className="sf-btn" style={{
                fontSize: '0.75rem', padding: '0.3rem 0.8rem',
                background: alertsEnabled ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
                border: alertsEnabled ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.1)',
                color: alertsEnabled ? '#a78bfa' : 'var(--sf-text-3)',
              }}>
              {alertsEnabled ? t('subathon.on') : t('subathon.off')}
            </button>
          </div>

          <div style={{ marginBottom: '0.6rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.2rem' }}>
              {t('subathon.alertDuration', { seconds: alertDuration })}
            </label>
            <input type="range" min={3} max={15} step={1} value={alertDuration}
              onChange={(e) => setAlertDuration(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#a78bfa' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--sf-text-3)' }}>
              <span>3s</span><span>15s</span>
            </div>
          </div>
        </div>

        {/* Tailored Design */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p className="sf-section-title">{t('subathon.designTitle')}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)', marginBottom: '0.75rem' }}>
            {t('subathon.designDesc')}
          </p>

          {([
            { key: 'primaryColor', label: t('subathon.primaryColor'), val: primaryColor, set: setPrimaryColor },
            { key: 'accentColor', label: t('subathon.accentColor'), val: accentColor, set: setAccentColor },
            { key: 'bgColor', label: t('subathon.bgColor'), val: bgColor, set: setBgColor },
            { key: 'textColor', label: t('subathon.textColor'), val: textColor, set: setTextColor },
          ] as const).map(({ key, label, val, set }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', minWidth: 100 }}>{label}</label>
              <input type="color" value={val}
                onChange={(e) => set(e.target.value)}
                style={{ width: 36, height: 30, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
              />
              <input type="text" value={val}
                onChange={(e) => set(e.target.value)}
                className="sf-input" style={{ width: 120, fontSize: '0.72rem', fontFamily: 'monospace' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '0.6rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.2rem' }}>
              {t('subathon.fontFamily')}
            </label>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}
              className="sf-input" style={{ width: '100%', fontSize: '0.75rem' }}>
              <option value="Inter, system-ui, sans-serif">Inter (Default)</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
              <option value="'Press Start 2P', cursive">Press Start 2P (Pixel)</option>
              <option value="'Orbitron', sans-serif">Orbitron (Futuristic)</option>
              <option value="'Cinzel', serif">Cinzel (Fantasy)</option>
              <option value="'Luckiest Guy', cursive">Luckiest Guy (Cartoon)</option>
              <option value="'Share Tech Mono', monospace">Share Tech Mono (Tech)</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="system-ui, sans-serif">System UI</option>
            </select>
          </div>

          <button onClick={updateConfig} className="sf-btn" style={{ fontSize: '0.8rem', width: '100%', marginTop: '0.5rem' }}>
            {t('subathon.guardarConfig')}
          </button>
        </div>
        </div>

        {/* Right column: Add time manually */}
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
              {t('subathon.notaOpcional')}
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
