import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiPost, apiGet, OVERLAY_BASE_URL } from '../utils/api';
import { useTranslation } from '../i18n/context';
import type { FighterState } from '@streamforger/shared';
import styles from './ScoreboardPanel.module.css';

interface Props {
  channel: string;
}

function presetDamage(fighter: FighterState | null, key: string) {
  const presets: Record<string, { p1?: number; p2?: number }> = {
    'light': { p1: 5, p2: 5 },
    'medium': { p1: 15, p2: 15 },
    'heavy': { p1: 30, p2: 30 },
    'special': { p1: 50, p2: 50 },
    'ko': { p1: (fighter?.p1.health ?? 144), p2: (fighter?.p2.health ?? 144) },
  };
  return presets[key] || presets.medium;
}

export function ScoreboardPanel({ channel }: Props) {
  const { t } = useTranslation();
  const [fighter, setFighter] = useState<FighterState | null>(null);
  const { socket, connected } = useSocket();
  const [config, setConfig] = useState({
    p1Name: 'Player 1', p1CharName: '', p1Portrait: '',
    p2Name: 'Player 2', p2CharName: '', p2Portrait: '',
    maxHealth: 144, roundsToWin: 2, timerDuration: 99,
  });

  useEffect(() => {
    if (channel && connected) socket.emit('join:channel', channel);
  }, [channel, connected, socket]);

  useSocketEvent('fighter:update', useCallback((data: FighterState) => {
    setFighter(data);
  }, []));

  useEffect(() => {
    if (!channel) return;
    apiGet(`/fighter/${channel}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setFighter(data);
          setConfig({
            p1Name: data.p1.name, p1CharName: data.p1.charName, p1Portrait: data.p1.portrait,
            p2Name: data.p2.name, p2CharName: data.p2.charName, p2Portrait: data.p2.portrait,
            maxHealth: data.maxHealth, roundsToWin: data.roundsToWin, timerDuration: data.timerDuration,
          });
        }
      })
      .catch(() => {});
  }, [channel]);

  const saveConfig = () => {
    apiPost('/fighter/config', { channel, ...config });
  };

  const damage = (player: 'p1' | 'p2', amount: number) => {
    apiPost('/fighter/damage', { channel, player, amount });
  };

  const heal = (player: 'p1' | 'p2', amount: number) => {
    apiPost('/fighter/heal', { channel, player, amount });
  };

  const giveRound = (player: 'p1' | 'p2') => {
    apiPost('/fighter/round', { channel, player });
  };

  const timerStart = () => apiPost('/fighter/timer/start', { channel });
  const timerPause = () => apiPost('/fighter/timer/pause', { channel });
  const timerReset = () => apiPost('/fighter/timer/reset', { channel });
  const resetMatch = () => apiPost('/fighter/reset', { channel });

  const damagePreset = (key: string) => {
    const p = presetDamage(fighter, key);
    if (p.p1) damage('p1', p.p1);
    if (p.p2) damage('p2', p.p2);
  };

  return (
    <div className={styles.container}>
      <div className="mb-5">
        <h2 className="sf-heading flex-row flex-row--gap-md">
          {t('scoreboard.title')}
        </h2>
        <p className="text-sm text-muted">
          {t('scoreboard.subtitle')}
        </p>
      </div>

      <div className="glass-card sf-card--tight mb-5">
        <p className="sf-section-title">{t('scoreboard.presetsTitle')}</p>
        <div className="flex-wrap">
          {['light', 'medium', 'heavy', 'special', 'ko'].map((key) => (
            <button
              key={key}
              onClick={() => damagePreset(key)}
              className={`sf-btn ${key === 'ko' ? styles.presetBtnKo : styles.presetBtnDefault}`}
            >
              {key === 'light' && '🤜 Light (5)'}
              {key === 'medium' && '👊 Medium (15)'}
              {key === 'heavy' && '💥 Heavy (30)'}
              {key === 'special' && '🔥 Special (50)'}
              {key === 'ko' && '💀 KO'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2 mb-5">
        {/* P1 Card */}
        <div className="glass-card sf-card--tight">
          <p className={styles.playerLabelP1}>{fighter?.p1.name || t('scoreboard.p1')}</p>
          <div className="mb-3">
            <div className={styles.healthTrackP1}>
              <motion.div
                animate={{ width: `${fighter ? (fighter.p1.health / fighter.maxHealth) * 100 : 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                className={styles.healthFillP1}
              />
            </div>
            <div className={styles.healthInfo}>
              <span>❤️ {fighter?.p1.health ?? 0} / {fighter?.maxHealth ?? 144}</span>
              <span>⭐ {fighter?.p1.rounds ?? 0}/{fighter?.roundsToWin ?? 2}</span>
            </div>
          </div>
          <div className="flex-wrap flex-wrap--sm">
            <button onClick={() => damage('p1', 10)} className={styles.damageBtn}>-10</button>
            <button onClick={() => damage('p1', 25)} className={styles.damageBtn}>-25</button>
            <button onClick={() => damage('p1', 50)} className={styles.damageBtn}>-50</button>
            <button onClick={() => heal('p1', 25)} className={styles.healBtn}>+25</button>
            <button onClick={() => heal('p1', 50)} className={styles.healBtn}>+50</button>
            <button onClick={() => giveRound('p1')} className={styles.roundBtn}>⭐ Ronda</button>
          </div>
        </div>

        {/* P2 Card */}
        <div className="glass-card sf-card--tight">
          <p className={styles.playerLabelP2}>{fighter?.p2.name || t('scoreboard.p2')}</p>
          <div className="mb-3">
            <div className={styles.healthTrackP2}>
              <motion.div
                animate={{ width: `${fighter ? (fighter.p2.health / fighter.maxHealth) * 100 : 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                className={styles.healthFillP2}
              />
            </div>
            <div className={styles.healthInfo}>
              <span>❤️ {fighter?.p2.health ?? 0} / {fighter?.maxHealth ?? 144}</span>
              <span>⭐ {fighter?.p2.rounds ?? 0}/{fighter?.roundsToWin ?? 2}</span>
            </div>
          </div>
          <div className="flex-wrap flex-wrap--sm">
            <button onClick={() => damage('p2', 10)} className={styles.damageBtn}>-10</button>
            <button onClick={() => damage('p2', 25)} className={styles.damageBtn}>-25</button>
            <button onClick={() => damage('p2', 50)} className={styles.damageBtn}>-50</button>
            <button onClick={() => heal('p2', 25)} className={styles.healBtn}>+25</button>
            <button onClick={() => heal('p2', 50)} className={styles.healBtn}>+50</button>
            <button onClick={() => giveRound('p2')} className={styles.roundBtn}>⭐ Ronda</button>
          </div>
        </div>
      </div>

      <div className="glass-card sf-card--tight mb-5">
        <p className="sf-section-title">{t('scoreboard.timerTitle')}</p>
        <div className="flex-row flex-row--gap-lg mb-3">
          <div className={styles.timerValue}>
            {fighter ? `${Math.floor(fighter.timerRemaining / 60)}:${(fighter.timerRemaining % 60).toString().padStart(2, '0')}` : '--:--'}
          </div>
          <div className={styles.timerStatus}>
            {fighter?.timerRunning ? '▶ RUNNING' : fighter?.status === 'finished' ? '🏁 FINISHED' : '⏸ STOPPED'}
          </div>
        </div>
        <div className="flex-wrap">
          <button onClick={timerStart} className="sf-btn sf-btn-primary text-sm">
            ▶ {t('scoreboard.start')}
          </button>
          <button onClick={timerPause} className="sf-btn text-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>
            ⏸ {t('scoreboard.pause')}
          </button>
          <button onClick={timerReset} className="sf-btn text-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>
            ⏹ {t('scoreboard.reset')}
          </button>
          <button onClick={resetMatch} className="sf-btn text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            🔄 {t('scoreboard.resetMatch')}
          </button>
        </div>
      </div>

      <div className="glass-card sf-card--tight mb-5">
        <p className="sf-section-title">{t('scoreboard.configTitle')}</p>
        <div className="grid-2 mb-4">
          <div>
            <p className={styles.playerLabelP1} style={{ marginBottom: '0.5rem' }}>{t('scoreboard.p1')}</p>
            <input type="text" value={config.p1Name} onChange={(e) => setConfig({ ...config, p1Name: e.target.value })} className="sf-input w-full text-sm" placeholder={t('scoreboard.playerName')} style={{ marginBottom: '0.375rem' }} />
            <input type="text" value={config.p1CharName} onChange={(e) => setConfig({ ...config, p1CharName: e.target.value })} className="sf-input w-full text-sm" placeholder={t('scoreboard.charName')} style={{ marginBottom: '0.375rem' }} />
            <input type="text" value={config.p1Portrait} onChange={(e) => setConfig({ ...config, p1Portrait: e.target.value })} className="sf-input w-full text-sm" placeholder={t('scoreboard.portraitUrl')} />
          </div>
          <div>
            <p className={styles.playerLabelP2} style={{ marginBottom: '0.5rem' }}>{t('scoreboard.p2')}</p>
            <input type="text" value={config.p2Name} onChange={(e) => setConfig({ ...config, p2Name: e.target.value })} className="sf-input w-full text-sm" placeholder={t('scoreboard.playerName')} style={{ marginBottom: '0.375rem' }} />
            <input type="text" value={config.p2CharName} onChange={(e) => setConfig({ ...config, p2CharName: e.target.value })} className="sf-input w-full text-sm" placeholder={t('scoreboard.charName')} style={{ marginBottom: '0.375rem' }} />
            <input type="text" value={config.p2Portrait} onChange={(e) => setConfig({ ...config, p2Portrait: e.target.value })} className="sf-input w-full text-sm" placeholder={t('scoreboard.portraitUrl')} />
          </div>
        </div>
        <div className={styles.configGrid}>
          <div>
            <label className={styles.configLabel}>{t('scoreboard.maxHealth')}</label>
            <input type="number" value={config.maxHealth} onChange={(e) => setConfig({ ...config, maxHealth: parseInt(e.target.value) || 144 })} className="sf-input w-full text-sm" />
          </div>
          <div>
            <label className={styles.configLabel}>{t('scoreboard.roundsToWin')}</label>
            <input type="number" value={config.roundsToWin} onChange={(e) => setConfig({ ...config, roundsToWin: parseInt(e.target.value) || 2 })} className="sf-input w-full text-sm" />
          </div>
          <div>
            <label className={styles.configLabel}>{t('scoreboard.timerDuration')}</label>
            <input type="number" value={config.timerDuration} onChange={(e) => setConfig({ ...config, timerDuration: parseInt(e.target.value) || 99 })} className="sf-input w-full text-sm" />
          </div>
        </div>
        <button onClick={saveConfig} className="sf-btn sf-btn-primary w-full text-sm">
          💾 {t('scoreboard.saveConfig')}
        </button>
      </div>

      <div className="glass-card sf-card--tight">
        <p className="sf-section-title">{t('scoreboard.overlayUrl')}</p>
        <div className={styles.urlBox}>
          {OVERLAY_BASE_URL}/overlay.html?mode=scoreboard&amp;channel={channel}
        </div>
      </div>
    </div>
  );
}
