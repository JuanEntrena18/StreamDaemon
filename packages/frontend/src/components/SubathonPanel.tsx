import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n/context';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiGet, apiPost, OVERLAY_BASE_URL } from '../utils/api';
import { ConfirmModal } from './ConfirmModal';
import { Toggle } from './Toggle';
import { EmptyState } from './EmptyState';
import type { SubathonState, SubathonAction } from '@streamdaemon/shared';
import styles from './SubathonPanel.module.css';

interface Props {
  channel: string;
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

export function SubathonPanel({ channel }: Props) {
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
  const [showStopConfirm, setShowStopConfirm] = useState(false);

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
    apiGet(`/subathon/${channel}`)
      .then((r) => r.json())
      .then((data) => { setState(data); setRemaining(data.remaining); })
      .catch(() => {});
  }, [channel]);

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
    <div className={styles.container}>
      <div className="mb-5">
        <h2 className="sf-heading">
          {t('subathon.title')}
        </h2>
        <p className="text-sm text-muted">
          {t('subathon.subtitle')}
        </p>
      </div>

      {/* Timer display */}
      <div className="glass-card sf-card text-center mb-5">
        <div className={styles.timerValue}>
          {formatTime(remaining)}
        </div>

        <div className={styles.timerMaxLabel}>
          {t('subathon.limiteMaximo', { duration: formatDuration(maxLimit) })}
        </div>

        {/* Progress bar */}
        {(isActive || isFinished) && (
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{
              width: `${Math.min(progress * 100, 100)}%`,
              background: barColor,
            }} />
          </div>
        )}

        <div className={styles.statusText}>
          {isRunning && t('subathon.corriendo')}
          {isPaused && t('subathon.pausado')}
          {isFinished && t('subathon.tiempoCumplido')}
          {isStopped && !state?.totalAdded && t('subathon.sinActivo')}
          {isStopped && state?.totalAdded && t('subathon.detenido')}
        </div>

        {/* Controls */}
        <div className="flex-center flex-wrap">
          {(isStopped || isFinished) && (
            <button onClick={start} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
              {t('subathon.iniciar')}
            </button>
          )}
          {isRunning && (
            <button onClick={pause} className={styles.controlBtnWarning}>
              {t('subathon.pausar')}
            </button>
          )}
          {isPaused && (
            <button onClick={resume} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
              {t('subathon.reanudar')}
            </button>
          )}
          {isActive && (
            <button onClick={() => setShowStopConfirm(true)} className={styles.controlBtnDanger}>
              {t('subathon.detener')}
            </button>
          )}
          <ConfirmModal
            open={showStopConfirm}
            title={t('subathon.confirmStopTitle')}
            message={t('subathon.confirmStopMsg')}
            confirmLabel={t('subathon.detener')}
            onConfirm={() => { setShowStopConfirm(false); stop(); }}
            onCancel={() => setShowStopConfirm(false)}
            showDontAskAgain
          />
        </div>
      </div>

      <div className="grid-2" style={{ gap: '1.25rem', marginBottom: '1.25rem', alignItems: 'start' }}>
        {/* Left column: config, alerts, design */}
        <div className="flex-col flex-col--gap-lg">
        {/* Time Config */}
        <div className="glass-card sf-card--tight">
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
            <div key={key} className={styles.configField}>
              <label className={styles.configLabel}>{label}</label>
              <input type="number" min={0} step={step} value={val}
                onChange={(e) => set(parseInt(e.target.value) || 0)}
                className="sf-input w-full"
              />
            </div>
          ))}

          <div className={styles.configField}>
            <label className={styles.configLabel}>
              {t('subathon.limiteMaxSegundos')}
            </label>
            <input type="number" min={0} step={3600} value={maxLimit}
              onChange={(e) => setMaxLimit(parseInt(e.target.value) || 0)}
              className="sf-input w-full"
            />
          </div>
        </div>

        {/* Dynamic On-Screen Alerts */}
        <div className="glass-card sf-card--tight">
          <p className="sf-section-title">{t('subathon.alertsTitle')}</p>
          <p className={styles.designDesc}>
            {t('subathon.alertsDesc')}
          </p>

          <div className="flex-row flex-row--gap-md mb-3">
            <label className={styles.alertsToggle}>
              {t('subathon.alertsEnabled')}
            </label>
            <Toggle
              checked={alertsEnabled}
              onChange={setAlertsEnabled}
              label={alertsEnabled ? t('subathon.on') : t('subathon.off')}
              size="md"
            />
          </div>

          <div className={styles.configField}>
            <label className={styles.configLabel}>
              {t('subathon.alertDuration', { seconds: alertDuration })}
            </label>
            <input type="range" min={3} max={15} step={1} value={alertDuration}
              onChange={(e) => setAlertDuration(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#a78bfa' }}
            />
            <div className={styles.rangeLabels}>
              <span>3s</span><span>15s</span>
            </div>
          </div>
        </div>

        {/* Tailored Design */}
        <div className="glass-card sf-card--tight">
          <p className="sf-section-title">{t('subathon.designTitle')}</p>
          <p className={styles.designDesc}>
            {t('subathon.designDesc')}
          </p>

          {([
            { key: 'primaryColor', label: t('subathon.primaryColor'), val: primaryColor, set: setPrimaryColor },
            { key: 'accentColor', label: t('subathon.accentColor'), val: accentColor, set: setAccentColor },
            { key: 'bgColor', label: t('subathon.bgColor'), val: bgColor, set: setBgColor },
            { key: 'textColor', label: t('subathon.textColor'), val: textColor, set: setTextColor },
          ] as const).map(({ key, label, val, set }) => (
            <div key={key} className={styles.colorRow}>
              <label className={styles.colorLabel}>{label}</label>
              <input type="color" value={val}
                onChange={(e) => set(e.target.value)}
                className={styles.colorInput}
              />
              <input type="text" value={val}
                onChange={(e) => set(e.target.value)}
                className={`sf-input ${styles.colorTextInput}`}
              />
            </div>
          ))}

          <div className={styles.configField}>
            <label className={styles.configLabel}>
              {t('subathon.fontFamily')}
            </label>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}
              className="sf-input w-full text-xs">
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

          <button onClick={updateConfig} className="sf-btn w-full text-sm mt-2">
            {t('subathon.guardarConfig')}
          </button>
        </div>
        </div>

        {/* Right column: Add time manually */}
        <div className="glass-card sf-card--tight">
          <p className="sf-section-title">{t('subathon.addTiempo')}</p>

          <div className="mb-3">
            <label className={styles.manualLabel}>
              {t('subathon.usuario')}
            </label>
            <input type="text" value={manualUser}
              onChange={(e) => setManualUser(e.target.value)}
              placeholder={t('subathon.viewerPlaceholder')}
              className="sf-input w-full"
            />
          </div>

          <div className="mb-3">
            <label className={styles.manualLabel}>
              {t('subathon.tiempoSegundos')}
            </label>
            <input type="number" min={1} step={30} value={manualTime}
              onChange={(e) => setManualTime(parseInt(e.target.value) || 0)}
              className="sf-input w-full"
            />
          </div>

          <div className="mb-3">
            <label className={styles.manualLabel}>
              {t('subathon.notaOpcional')}
            </label>
            <input type="text" value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder={t('subathon.razonPlaceholder')}
              className="sf-input w-full"
            />
          </div>

          <button onClick={addTime} disabled={!manualUser || manualTime <= 0}
            className="sf-btn sf-btn-primary w-full text-sm">
            {t('subathon.añadirTiempo')}
          </button>
        </div>
      </div>

      {/* Actions log */}
      <div className="glass-card sf-card--tight mb-5">
        <p className="sf-section-title">{t('subathon.historial')}</p>
        {state && state.actions.length > 0 ? (
          <div className={styles.logContainer}>
            {state.actions.map((a) => (
              <div key={a.id} className={styles.logRow}>
                <span className={styles.logDot} style={{ background: ACTION_COLORS[a.type] }} />
                <span className={styles.logUser}>{a.user}</span>
                <span className={styles.logAmount} style={{ color: ACTION_COLORS[a.type] }}>
                  +{formatDuration(a.timeAdded)}
                </span>
                <span className={styles.logNote}>
                  {t('subathon.' + a.type)}
                  {a.note && ` · ${a.note}`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="⏳"
            title={t('subathon.emptyTitle') || 'Sin actividad'}
            description={t('subathon.emptyDesc') || 'Aún no hay acciones registradas. ¡Inicia el subathon y espera a que tu comunidad participe!'}
          />
        )}
      </div>

      {/* Overlay URL */}
      <div className="glass-card sf-card--tight">
        <p className="sf-section-title">{t('subathon.overlayUrl')}</p>
        <div className={styles.urlBox}>
          {OVERLAY_BASE_URL}/overlays/subathon.html?channel={channel}
        </div>
      </div>
    </div>
  );
}
