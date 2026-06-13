import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiPost, OVERLAY_BASE_URL } from '../utils/api';
import { useTranslation } from '../i18n/context';
import type { FighterState } from '@streamforger/shared';

interface Props {
  channel: string;
  backendUrl: string;
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

export function ScoreboardPanel({ channel, backendUrl }: Props) {
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
    fetch(`${backendUrl}/fighter/${channel}`)
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
  }, [channel, backendUrl]);

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
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {t('scoreboard.title')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          {t('scoreboard.subtitle')}
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">{t('scoreboard.presetsTitle')}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['light', 'medium', 'heavy', 'special', 'ko'].map((key) => (
            <button
              key={key}
              onClick={() => damagePreset(key)}
              className="sf-btn"
              style={{
                background: key === 'ko' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                color: key === 'ko' ? '#f87171' : 'var(--sf-text)',
                fontSize: '0.78rem', padding: '0.4rem 0.75rem',
              }}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p className="sf-section-title" style={{ color: '#3b82f6' }}>{fighter?.p1.name || t('scoreboard.p1')}</p>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
              height: 20, borderRadius: 4, overflow: 'hidden', background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.2)',
            }}>
              <motion.div
                animate={{ width: `${fighter ? (fighter.p1.health / fighter.maxHealth) * 100 : 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                  borderRadius: 3,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.75rem', color: 'var(--sf-text-2)' }}>
              <span>❤️ {fighter?.p1.health ?? 0} / {fighter?.maxHealth ?? 144}</span>
              <span>⭐ {fighter?.p1.rounds ?? 0}/{fighter?.roundsToWin ?? 2}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            <button onClick={() => damage('p1', 10)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>-10</button>
            <button onClick={() => damage('p1', 25)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>-25</button>
            <button onClick={() => damage('p1', 50)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>-50</button>
            <button onClick={() => heal('p1', 25)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>+25</button>
            <button onClick={() => heal('p1', 50)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>+50</button>
            <button onClick={() => giveRound('p1')} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>⭐ Ronda</button>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p className="sf-section-title" style={{ color: '#ef4444' }}>{fighter?.p2.name || t('scoreboard.p2')}</p>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
              height: 20, borderRadius: 4, overflow: 'hidden', background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <motion.div
                animate={{ width: `${fighter ? (fighter.p2.health / fighter.maxHealth) * 100 : 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                  borderRadius: 3,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.75rem', color: 'var(--sf-text-2)' }}>
              <span>❤️ {fighter?.p2.health ?? 0} / {fighter?.maxHealth ?? 144}</span>
              <span>⭐ {fighter?.p2.rounds ?? 0}/{fighter?.roundsToWin ?? 2}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            <button onClick={() => damage('p2', 10)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>-10</button>
            <button onClick={() => damage('p2', 25)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>-25</button>
            <button onClick={() => damage('p2', 50)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>-50</button>
            <button onClick={() => heal('p2', 25)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>+25</button>
            <button onClick={() => heal('p2', 50)} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>+50</button>
            <button onClick={() => giveRound('p2')} className="sf-btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>⭐ Ronda</button>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">{t('scoreboard.timerTitle')}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{
            fontSize: '2rem', fontWeight: 900, fontFamily: 'monospace',
            fontVariantNumeric: 'tabular-nums', color: 'var(--sf-text)',
          }}>
            {fighter ? `${Math.floor(fighter.timerRemaining / 60)}:${(fighter.timerRemaining % 60).toString().padStart(2, '0')}` : '--:--'}
          </div>
          <div style={{
            fontSize: '0.72rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {fighter?.timerRunning ? '▶ RUNNING' : fighter?.status === 'finished' ? '🏁 FINISHED' : '⏸ STOPPED'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={timerStart} className="sf-btn sf-btn-primary" style={{ fontSize: '0.8rem' }}>
            ▶ {t('scoreboard.start')}
          </button>
          <button onClick={timerPause} className="sf-btn" style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)' }}>
            ⏸ {t('scoreboard.pause')}
          </button>
          <button onClick={timerReset} className="sf-btn" style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)' }}>
            ⏹ {t('scoreboard.reset')}
          </button>
          <button onClick={resetMatch} className="sf-btn" style={{ fontSize: '0.8rem', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            🔄 {t('scoreboard.resetMatch')}
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">{t('scoreboard.configTitle')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3b82f6', marginBottom: '0.5rem' }}>{t('scoreboard.p1')}</p>
            <input type="text" value={config.p1Name} onChange={(e) => setConfig({ ...config, p1Name: e.target.value })} className="sf-input" placeholder={t('scoreboard.playerName')} style={{ fontSize: '0.8rem', marginBottom: '0.375rem', width: '100%' }} />
            <input type="text" value={config.p1CharName} onChange={(e) => setConfig({ ...config, p1CharName: e.target.value })} className="sf-input" placeholder={t('scoreboard.charName')} style={{ fontSize: '0.8rem', marginBottom: '0.375rem', width: '100%' }} />
            <input type="text" value={config.p1Portrait} onChange={(e) => setConfig({ ...config, p1Portrait: e.target.value })} className="sf-input" placeholder={t('scoreboard.portraitUrl')} style={{ fontSize: '0.8rem', width: '100%' }} />
          </div>
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>{t('scoreboard.p2')}</p>
            <input type="text" value={config.p2Name} onChange={(e) => setConfig({ ...config, p2Name: e.target.value })} className="sf-input" placeholder={t('scoreboard.playerName')} style={{ fontSize: '0.8rem', marginBottom: '0.375rem', width: '100%' }} />
            <input type="text" value={config.p2CharName} onChange={(e) => setConfig({ ...config, p2CharName: e.target.value })} className="sf-input" placeholder={t('scoreboard.charName')} style={{ fontSize: '0.8rem', marginBottom: '0.375rem', width: '100%' }} />
            <input type="text" value={config.p2Portrait} onChange={(e) => setConfig({ ...config, p2Portrait: e.target.value })} className="sf-input" placeholder={t('scoreboard.portraitUrl')} style={{ fontSize: '0.8rem', width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>{t('scoreboard.maxHealth')}</label>
            <input type="number" value={config.maxHealth} onChange={(e) => setConfig({ ...config, maxHealth: parseInt(e.target.value) || 144 })} className="sf-input" style={{ fontSize: '0.8rem', width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>{t('scoreboard.roundsToWin')}</label>
            <input type="number" value={config.roundsToWin} onChange={(e) => setConfig({ ...config, roundsToWin: parseInt(e.target.value) || 2 })} className="sf-input" style={{ fontSize: '0.8rem', width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-2)', display: 'block', marginBottom: '0.25rem' }}>{t('scoreboard.timerDuration')}</label>
            <input type="number" value={config.timerDuration} onChange={(e) => setConfig({ ...config, timerDuration: parseInt(e.target.value) || 99 })} className="sf-input" style={{ fontSize: '0.8rem', width: '100%' }} />
          </div>
        </div>
        <button onClick={saveConfig} className="sf-btn sf-btn-primary" style={{ fontSize: '0.8rem', width: '100%' }}>
          💾 {t('scoreboard.saveConfig')}
        </button>
      </div>

      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <p className="sf-section-title">{t('scoreboard.overlayUrl')}</p>
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 6,
          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--sf-border)',
          fontSize: '0.78rem', fontFamily: 'monospace', color: '#a78bfa',
          wordBreak: 'break-all',
        }}>
          {OVERLAY_BASE_URL}/overlay.html?mode=scoreboard&amp;channel={channel}
        </div>
      </div>
    </div>
  );
}
