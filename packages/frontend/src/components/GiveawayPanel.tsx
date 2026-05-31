import { useState, useEffect, useCallback } from 'react';
import { useSocketEvent } from '../hooks/useSocket';

interface Props {
  channel: string;
  backendUrl: string;
}

interface ActiveGiveaway {
  id: string;
  prize: string;
  status: string;
  entries: number;
}

export function GiveawayPanel({ channel, backendUrl }: Props) {
  const [prize, setPrize] = useState('');
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState<ActiveGiveaway | null>(null);

  useSocketEvent('giveaway:start', useCallback((data: ActiveGiveaway) => {
    setActive(data);
    setMessage('');
  }, []));

  useSocketEvent('giveaway:end', useCallback(() => {
    setActive(null);
    setMessage('');
  }, []));

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/giveaways/${channel}/active`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) setActive(data);
      })
      .catch(() => {});
  }, [channel, backendUrl]);

  const startGiveaway = async () => {
    if (!prize.trim() || !channel) return;
    const res = await fetch(`${backendUrl}/giveaways/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, prize: prize.trim(), duration }),
    });
    if (res.ok) {
      setPrize('');
    } else {
      setMessage('Error al iniciar sorteo');
    }
  };

  const endGiveaway = async () => {
    if (!active) return;
    await fetch(`${backendUrl}/giveaways/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, id: active.id }),
    });
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">🎁 Sorteos</h2>

      {active ? (
        <div className="space-y-3">
          <div className="bg-zinc-900 rounded p-4 border border-zinc-700">
            <p className="text-sm text-zinc-400">Sorteo activo</p>
            <p className="text-lg font-bold text-green-400">{active.prize}</p>
            <p className="text-sm text-zinc-500">{active.entries} participantes</p>
          </div>
          <button
            onClick={endGiveaway}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors"
          >
            Finalizar sorteo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Premio del sorteo..."
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            disabled={!channel}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-50"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 shrink-0">Duración:</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={!channel}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm focus:outline-none"
            >
              <option value={30}>30 seg</option>
              <option value={60}>1 min</option>
              <option value={120}>2 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
            </select>
          </div>
          <button
            onClick={startGiveaway}
            disabled={!prize.trim() || !channel}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white py-2 rounded transition-colors disabled:text-zinc-500"
          >
            Iniciar sorteo
          </button>
          {message && <p className="text-sm text-yellow-400">{message}</p>}
          {!channel && <p className="text-xs text-zinc-500">Ingresa un canal para comenzar</p>}
        </div>
      )}
    </div>
  );
}
