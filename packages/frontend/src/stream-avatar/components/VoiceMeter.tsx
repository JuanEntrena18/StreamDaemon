import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/context.js';
import { AudioAnalyzer } from '../engine/AudioAnalyzer.js';
import type { StreamAvatarViseme } from '../types.js';
import styles from './VoiceMeter.module.css';

interface Props {
  deviceId: string;
  enabled: boolean;
  liveLevel?: number;
  liveViseme?: StreamAvatarViseme;
}

const VISEME_BADGES: Record<StreamAvatarViseme, { code: string; file: string }> = {
  closed: { code: 'M / B / P', file: 'mouth-closed.png' },
  slight: { code: 'SLIGHT', file: 'mouth-slight.png' },
  open: { code: 'A · OPEN', file: 'mouth-open.png' },
  wide: { code: 'E / I · WIDE', file: 'mouth-wide.png' },
  round: { code: 'O / U · ROUND', file: 'mouth-round.png' },
  small: { code: 'U · SMALL', file: 'mouth-round.png' },
  narrow: { code: 'S / F · NARROW', file: 'mouth-closed.png' },
};

export function VoiceMeter({ deviceId, enabled, liveLevel, liveViseme = 'closed' }: Props) {
  const { t } = useTranslation();
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const rafRef = useRef<number | null>(null);
  const [internalLevel, setInternalLevel] = useState(0);
  const [peak, setPeak] = useState(0);

  const hasExternalStream = typeof liveLevel === 'number';
  const level = hasExternalStream ? liveLevel : internalLevel;

  useEffect(() => {
    if (!enabled) {
      setPeak(0);
      return;
    }
    setPeak((prev) => Math.max(prev * 0.96, level));
  }, [level, enabled]);

  useEffect(() => {
    if (!enabled || hasExternalStream) {
      setInternalLevel(0);
      if (!enabled) setPeak(0);
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
        setInternalLevel(nextLevel);
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
  }, [deviceId, enabled, hasExternalStream]);

  const bars = 16;
  const activeBars = Math.round(level * bars);
  const visemeInfo = VISEME_BADGES[liveViseme] ?? VISEME_BADGES.closed;
  const isSpeaking = enabled && liveViseme !== 'closed' && level > 0.02;

  return (
    <div className={styles.root}>
      <div className={styles.meterHeader}>
        <span className={styles.statusDotWrap}>
          <span className={isSpeaking ? styles.statusDotSpeaking : enabled ? styles.statusDotIdle : styles.statusDotOff} />
          <span className={styles.label}>
            {enabled ? t('streamAvatar.micDetecting') : t('streamAvatar.micInactiveHint')}
          </span>
        </span>
        <div className={styles.visemeBadge} title={visemeInfo.file}>
          <span className={styles.visemeCode}>{visemeInfo.code}</span>
          <span className={styles.value}>{Math.round(level * 100)}%</span>
        </div>
      </div>

      <div className={styles.bars}>
        {Array.from({ length: bars }).map((_, i) => {
          const isActive = i < activeBars;
          const isHot = i >= bars * 0.75;
          return (
            <div
              key={i}
              className={`${styles.bar} ${isActive ? (isHot ? styles.barHot : styles.barActive) : ''}`}
              style={{
                height: `${35 + (i / (bars - 1)) * 65}%`,
                opacity: isActive ? 0.55 + (i / bars) * 0.45 : 0.35,
              }}
            />
          );
        })}
      </div>

      <div className={styles.peakBar}>
        <div className={styles.peakFill} style={{ width: `${Math.min(peak * 100, 100)}%` }} />
      </div>
    </div>
  );
}
