import { useState, useEffect, useCallback } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { apiPost } from '../utils/api';
import type { ScoreboardState } from '@streamforger/shared';

interface Props {
  channel: string;
  backendUrl: string;
}

export function ScoreboardPanel({ channel, backendUrl }: Props) {
  const [board, setBoard] = useState<ScoreboardState>({ players: [], title: 'Scoreboard' });
  const [playerName, setPlayerName] = useState('');
  const [boardTitle, setBoardTitle] = useState('Scoreboard');

  useSocketEvent('scoreboard:update', useCallback((data: ScoreboardState) => {
    setBoard(data);
    setBoardTitle(data.title);
  }, []));

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/scoreboard/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (data) { setBoard(data); setBoardTitle(data.title); } })
      .catch(() => {});
  }, [channel, backendUrl]);

  const addPlayer = () => {
    if (!playerName.trim()) return;
    apiPost('/scoreboard/player/add', { channel, name: playerName.trim() });
    setPlayerName('');
  };

  const removePlayer = (playerId: string) => {
    apiPost('/scoreboard/player/remove', { channel, playerId });
  };

  const setScore = (playerId: string, score: number) => {
    apiPost('/scoreboard/score/set', { channel, playerId, score });
  };

  const increment = (playerId: string) => {
    apiPost('/scoreboard/score/increment', { channel, playerId, amount: 1 });
  };

  const decrement = (playerId: string) => {
    apiPost('/scoreboard/score/decrement', { channel, playerId, amount: 1 });
  };

  const updateTitle = () => {
    apiPost('/scoreboard/title', { channel, title: boardTitle });
  };

  const resetScores = () => {
    apiPost('/scoreboard/reset', { channel });
  };

  const clearBoard = () => {
    apiPost('/scoreboard/clear', { channel });
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          🏆 Scoreboard
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Marcador en vivo para torneos, juegos PVP o competencias.
        </p>
      </div>

      {/* Title */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">📛 Título del marcador</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={boardTitle}
            onChange={(e) => setBoardTitle(e.target.value)}
            className="sf-input"
            style={{ flex: 1 }}
          />
          <button onClick={updateTitle} className="sf-btn sf-btn-primary" style={{ fontSize: '0.8rem' }}>
            Actualizar
          </button>
        </div>
      </div>

      {/* Add player */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">👤 Agregar jugador</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addPlayer(); }}
            placeholder="Nombre del jugador"
            className="sf-input"
            style={{ flex: 1 }}
          />
          <button onClick={addPlayer} className="sf-btn sf-btn-primary" style={{ fontSize: '0.8rem' }}>
            Agregar
          </button>
        </div>
      </div>

      {/* Players list */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p className="sf-section-title" style={{ margin: 0 }}>Jugadores</p>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button onClick={resetScores} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>
              Reset puntajes
            </button>
            <button onClick={clearBoard} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', color: '#f87171' }}>
              Limpiar todo
            </button>
          </div>
        </div>

        {board.players.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-3)', textAlign: 'center', padding: '1rem 0' }}>
            No hay jugadores. Agregá uno arriba.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {board.players.map((player) => {
            const sorted = [...board.players].sort((a, b) => b.score - a.score);
            const rank = sorted.findIndex((p) => p.id === player.id) + 1;
            const isFirst = rank === 1 && player.score > 0;

            return (
              <div key={player.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.5rem 0.75rem',
                background: isFirst ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                border: isFirst ? '1px solid rgba(168,85,247,0.2)' : '1px solid var(--sf-border)',
              }}>
                {/* Rank */}
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, color: isFirst ? '#a78bfa' : 'var(--sf-text-3)',
                  minWidth: 24, textAlign: 'center',
                }}>
                  {isFirst ? '🏆' : `#${rank}`}
                </span>

                {/* Name */}
                <span style={{
                  flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text)',
                }}>
                  {player.name}
                </span>

                {/* Score controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => decrement(player.id)} className="sf-btn" style={{
                    fontSize: '0.7rem', padding: '0.2rem 0.45rem', minWidth: 24,
                    background: 'rgba(239,68,68,0.12)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    -1
                  </button>

                  <input
                    type="number"
                    value={player.score}
                    onChange={(e) => setScore(player.id, parseInt(e.target.value) || 0)}
                    style={{
                      width: 50, textAlign: 'center', fontSize: '0.85rem', fontWeight: 700,
                      background: 'rgba(0,0,0,0.25)', border: '1px solid var(--sf-border)',
                      borderRadius: 6, padding: '0.2rem 0.3rem',
                      color: 'var(--sf-text)', fontVariantNumeric: 'tabular-nums',
                      outline: 'none',
                    }}
                  />

                  <button onClick={() => increment(player.id)} className="sf-btn" style={{
                    fontSize: '0.7rem', padding: '0.2rem 0.45rem', minWidth: 24,
                    background: 'rgba(16,185,129,0.12)', color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    +1
                  </button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removePlayer(player.id)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--sf-text-3)',
                    cursor: 'pointer', fontSize: '0.8rem', padding: '0.25rem',
                    opacity: 0.5, transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                  title="Eliminar jugador"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlay URL */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <p className="sf-section-title">🔌 Overlay URL</p>
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 6,
          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--sf-border)',
          fontSize: '0.78rem', fontFamily: 'monospace', color: '#a78bfa',
          wordBreak: 'break-all',
        }}>
          {backendUrl}/overlay.html?mode=scoreboard&amp;channel={channel}
        </div>
      </div>
    </div>
  );
}
