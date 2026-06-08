import { useState, useEffect } from 'react';
import { useSocketEvent } from '../hooks/useSocket';

interface Props {
  channel: string;
  backendUrl: string;
}

interface ActivityEvent {
  id: string;
  type: 'follow' | 'sub' | 'resub' | 'gift' | 'raid' | 'cheer' | 'redemption';
  user: string;
  message: string;
  timestamp: Date;
  amount?: number;
}

export function StreamActivityFeed({ channel, backendUrl }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useSocketEvent('activity:event', (data: ActivityEvent) => {
    setEvents((prev) => [data, ...prev].slice(0, 50));
  });

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/activity/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});
  }, [channel, backendUrl]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
    follow: { icon: '❤️', label: 'Follows' },
    sub: { icon: '⭐', label: 'Subs' },
    resub: { icon: '🔄', label: 'Re-subs' },
    gift: { icon: '🎁', label: 'Gifts' },
    raid: { icon: '⚔️', label: 'Raids' },
    cheer: { icon: '💎', label: 'Bits' },
    redemption: { icon: '🪄', label: 'Canjes' },
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔴 Fuente de actividad
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Eventos en vivo del canal: follows, subs, raids, bits y canjes
        </p>
      </div>

      {/* Filtros */}
      <div className="glass-card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} className="sf-btn" style={{
          fontSize: '0.72rem', padding: '0.3rem 0.6rem',
          background: filter === 'all' ? 'var(--sf-primary)' : 'var(--sf-surface-hover)',
          color: filter === 'all' ? '#fff' : 'var(--sf-text-2)',
        }}>Todos</button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(key)} className="sf-btn" style={{
            fontSize: '0.72rem', padding: '0.3rem 0.6rem',
            background: filter === key ? 'var(--sf-primary)' : 'var(--sf-surface-hover)',
            color: filter === key ? '#fff' : 'var(--sf-text-2)',
          }}>{cfg.icon} {cfg.label}</button>
        ))}
      </div>

      {/* Lista de eventos */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-3)', textAlign: 'center', padding: '2rem 0' }}>
            {channel ? 'Esperando actividad del canal...' : 'Conectá un canal para ver la actividad.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((event) => (
              <div key={event.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                fontSize: '0.82rem',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{TYPE_CONFIG[event.type]?.icon ?? '📌'}</span>
                <strong style={{ color: 'var(--sf-text)', minWidth: 100 }}>{event.user}</strong>
                <span style={{ color: 'var(--sf-text-2)', flex: 1 }}>{event.message}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
