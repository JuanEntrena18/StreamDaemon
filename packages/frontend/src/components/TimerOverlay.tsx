import { useState, useCallback, useEffect } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { TimerState } from '@streamforger/shared';

interface Props {
  channel: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TimerOverlay({ channel }: Props) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [remaining, setRemaining] = useState(0);
  const { connected } = useSocket();

  useSocketEvent('timer:state', useCallback((data: TimerState) => {
    setTimer(data);
    setRemaining(data.remaining);
  }, []));

  useSocketEvent('timer:tick', useCallback((data: { remaining: number }) => {
    setRemaining(data.remaining);
  }, []));

  useEffect(() => {
    if (!channel || !connected) return;
    fetch(`${BACKEND_URL}/timer/${channel}`)
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
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 8,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Label */}
      {timer.label && (
        <div style={{
          fontSize: '1rem', fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          textTransform: 'uppercase', letterSpacing: '0.15em',
        }}>
          {timer.label}
        </div>
      )}

      {/* Timer display */}
      <div style={{
        fontSize: isUrgent ? '5rem' : '4rem',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        color: timerColor,
        textShadow: `0 0 30px ${timerColor}44, 0 0 60px ${timerColor}22`,
        lineHeight: 1,
        transition: 'font-size 0.3s, color 0.3s',
      }}>
        {isFinished ? '00:00' : formatTime(remaining)}
      </div>

      {/* Status badge */}
      <div style={{
        fontSize: '0.7rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        color: timerColor + '88',
        marginTop: 4,
      }}>
        {isFinished ? 'Tiempo cumplido' : timer.status === 'paused' ? 'Pausado' : 'Corriendo'}
      </div>

      {/* Progress bar */}
      {!isFinished && (
        <div style={{
          width: 200, height: 3,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 99, overflow: 'hidden',
          marginTop: 4,
        }}>
          <div style={{
            width: `${progress * 100}%`, height: '100%',
            background: timerColor,
            borderRadius: 99,
            transition: 'width 1s linear',
          }} />
        </div>
      )}
    </div>
  );
}
