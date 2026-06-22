import { useState, useCallback, useEffect } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { apiGet } from '../utils/api';
import type { TimerState } from '@streamforger/shared';
import styles from './TimerOverlay.module.css';

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

export function TimerOverlay({ channel }: Props) {
  const { t } = useTranslation();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [remaining, setRemaining] = useState(0);
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
    if (!channel || !connected) return;
    apiGet(`/timer/${channel}`)
      .then((r) => r.json())
      .then((data) => { setTimer(data); setRemaining(data.remaining); })
      .catch(() => {});
  }, [channel, connected]);

  if (!timer || timer.status === 'stopped') return null;

  const progress = timer.duration > 0 ? remaining / timer.duration : 0;
  const isFinished = timer.status === 'finished';
  const isUrgent = remaining <= 30 && timer.status === 'running';

  const timerColor = isFinished
    ? '#10b981'
    : isUrgent
      ? '#ef4444'
      : '#a78bfa';

  return (
    <div className={styles.center}>
      {timer.label && (
        <div className={styles.label}>
          {timer.label}
        </div>
      )}

      <div
        className={`${styles.timer} ${isUrgent ? styles['timer--urgent'] : styles['timer--normal']}`}
        style={{
          color: timerColor,
          textShadow: `0 0 30px ${timerColor}44, 0 0 60px ${timerColor}22`,
        }}
      >
        {isFinished ? '00:00' : formatTime(remaining)}
      </div>

      <div className={styles.statusBadge} style={{ color: timerColor + '88' }}>
        {isFinished ? t('timer.tiempoCumplido') : timer.status === 'paused' ? t('timer.pausado') : t('timer.corriendo')}
      </div>

      {!isFinished && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress * 100}%`, background: timerColor }} />
        </div>
      )}
    </div>
  );
}
