import { useEffect, useRef, useState } from 'react';
import { AudioAnalyzer } from '../engine/AudioAnalyzer.js';
import styles from './VoiceMeter.module.css';

interface Props {
  deviceId: string;
  enabled: boolean;
}

export function VoiceMeter({ deviceId, enabled }: Props) {
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const rafRef = useRef<number | null>(null);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      setPeak(0);
      return;
    }

    const analyzer = new AudioAnalyzer();
    analyzerRef.current = analyzer;

    analyzer.start(deviceId).catch((e) => {
      console.error('[voice-meter] Failed to start microphone', e);
    });

    const tick = () => {
      const data = analyzer.analyze();
      if (data) {
        const nextLevel = Math.min(data.rms * 3, 1);
        setLevel(nextLevel);
        setPeak((prev) => Math.max(prev * 0.97, nextLevel));
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analyzer.stop();
      analyzerRef.current = null;
    };
  }, [deviceId, enabled]);

  const bars = 12;
  const activeBars = Math.round(level * bars);

  return (
    <div className={styles.root}>
      <div className={styles.bars}>
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`${styles.bar} ${i < activeBars ? styles.barActive : ''}`}
            style={{ opacity: i < activeBars ? 0.4 + (i / bars) * 0.6 : 1 }}
          />
        ))}
      </div>
      <div className={styles.labels}>
        <span className={styles.label}>{enabled ? 'Detectando voz...' : 'Activa el avatar para probar el micrófono'}</span>
        <span className={styles.value}>{Math.round(level * 100)}%</span>
      </div>
      <div className={styles.peakBar}>
        <div className={styles.peakFill} style={{ width: `${peak * 100}%` }} />
      </div>
    </div>
  );
}
