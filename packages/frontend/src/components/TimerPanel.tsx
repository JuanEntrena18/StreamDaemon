import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { apiGet, apiPost, OVERLAY_BASE_URL } from '../utils/api';
import type { TimerState } from '@streamdaemon/shared';
import styles from './TimerPanel.module.css';

interface Props {
  channel: string;
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

export function TimerPanel({ channel }: Props) {
  const { t } = useTranslation();
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
    apiGet(`/timer/${channel}`)
      .then((r) => r.json())
      .then((data) => { setTimer(data); setRemaining(data.remaining); })
      .catch(() => {});
  }, [channel]);

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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          {t('timer.title')}
        </h2>
        <p className={styles.subtitle}>
          {t('timer.subtitle')}
        </p>
      </div>

      {/* Timer display */}
      <div className={`glass-card ${styles.timerDisplay}`}>
        <div className={styles.timeText}>
          {isFinished ? '00:00' : formatTime(remaining)}
        </div>

        {timer.label && (
          <div className={styles.timerLabel}>
            {timer.label}
          </div>
        )}

        {isActive && (
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${remaining <= 30 ? styles['progressFill--urgent'] : styles['progressFill--normal']}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        <div className={styles.timerStatus}>
          {isRunning && t('timer.corriendo')}
          {isPaused && t('timer.pausado')}
          {isFinished && t('timer.tiempoCumplido')}
          {timer.status === 'stopped' && t('timer.sinActivo')}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          {!isActive && !isFinished && (
            <button onClick={start} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
              {t('timer.iniciar')}
            </button>
          )}
          {isRunning && (
            <button onClick={pause} className={`sf-btn ${styles.pauseBtn}`}>
              {t('timer.pausar')}
            </button>
          )}
          {isPaused && (
            <button onClick={resume} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
              {t('timer.reanudar')}
            </button>
          )}
          {(isActive || isFinished) && (
            <button onClick={reset} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.85rem' }}>
              {t('timer.reiniciar')}
            </button>
          )}
        </div>
      </div>

      {/* New timer config */}
      {!isActive && (
        <div className={`glass-card ${styles.configCard}`}>
          <p className="sf-section-title">{t('timer.nuevoTimer')}</p>

          {/* Duration presets */}
          <div className="mb-4">
            <label className={styles.durationLabel}>
              {t('timer.duracion')}
            </label>
            <div className={styles.durationPresets}>
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setDuration(p.value); setCustomMinutes(''); }}
                  className={`sf-btn ${styles.presetBtn} ${duration === p.value && !customMinutes ? styles['presetBtn--active'] : styles['presetBtn--inactive']}`}
                >
                  {p.label}
                </button>
              ))}
              <div className="flex-row" style={{ gap: 4 }}>
                  <input
                    type="number" min="1"
                    placeholder={t('timer.min')}
                    value={customMinutes}
                    onChange={(e) => { setCustomMinutes(e.target.value); }}
                    className={`sf-input ${styles.customInput}`}
                  />
                  <span className={styles.customSuffix}>{t('timer.min')}</span>
              </div>
            </div>
          </div>

          {/* Label */}
          <div className="mb-4">
            <label className={styles.durationLabel}>
              {t('timer.etiqueta')}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('timer.etiquetaPlaceholder')}
              className={`sf-input ${styles.labelInput}`}
            />
          </div>

          <button onClick={start} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem' }}>
            {t('timer.iniciarTimer')}
          </button>
        </div>
      )}

      {/* Overlay URL */}
      <div className={`glass-card ${styles.overlayCard}`}>
        <p className="sf-section-title">{t('timer.overlayUrl')}</p>
        <p className="text-sm text-muted mb-2">
          Agregá esta URL como Browser Source en OBS:
        </p>
        <div className={styles.urlBox}>
          {OVERLAY_BASE_URL}/overlay.html?mode=timer&amp;channel={channel}
        </div>
      </div>
    </div>
  );
}
