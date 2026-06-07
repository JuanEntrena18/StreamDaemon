import { useState, useCallback, useEffect } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ScoreboardState } from '@streamforger/shared';

interface Props {
  channel: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export function ScoreboardOverlay({ channel }: Props) {
  const [board, setBoard] = useState<ScoreboardState>({ players: [], title: 'Scoreboard' });
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useSocketEvent('scoreboard:update', useCallback((data: ScoreboardState) => {
    setBoard(data);
  }, []));

  useEffect(() => {
    if (!channel || !connected) return;
    fetch(`${BACKEND_URL}/scoreboard/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (data) setBoard(data); })
      .catch(() => {});
  }, [channel, connected]);

  const { players, title } = board;
  if (players.length === 0) return null;

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...sorted.map((p) => p.score), 1);

  return (
    <div style={{
      position: 'absolute',
      top: '50%', right: 40,
      transform: 'translateY(-50%)',
      fontFamily: "'Inter', sans-serif",
      minWidth: 200,
    }}>
      {/* Title */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.85rem', fontWeight: 700,
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom: 12,
      }}>
        {title}
      </div>

      {/* Players */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((player, i) => {
          const pct = maxScore > 0 ? (player.score / maxScore) * 100 : 0;
          const isFirst = i === 0 && player.score > 0;

          return (
            <div key={player.id} style={{
              position: 'relative',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              {/* Score bar */}
              <div style={{
                position: 'absolute', inset: 0,
                width: `${pct}%`,
                background: isFirst
                  ? 'linear-gradient(90deg, rgba(168,85,247,0.35), rgba(99,102,241,0.25))'
                  : 'rgba(255,255,255,0.06)',
                transition: 'width 0.5s ease',
                borderRadius: 8,
              }} />

              {/* Content */}
              <div style={{
                position: 'relative',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                zIndex: 1,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {/* Rank */}
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: isFirst ? '#a78bfa' : 'rgba(255,255,255,0.35)',
                    minWidth: 16, textAlign: 'center',
                  }}>
                    {isFirst ? '🏆' : `#${i + 1}`}
                  </span>
                  {/* Name */}
                  <span style={{
                    fontSize: '0.85rem', fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                  }}>
                    {player.name}
                  </span>
                </div>
                {/* Score */}
                <span style={{
                  fontSize: '0.95rem', fontWeight: 800,
                  color: isFirst ? '#a78bfa' : 'rgba(255,255,255,0.7)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {player.score}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
