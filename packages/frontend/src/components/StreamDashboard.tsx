import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiPut } from '../utils/api';

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

interface HudStats {
  viewers: number;
  followers: number;
  subscribers: number;
  uptimeSeconds: number;
  streamTitle: string;
  gameName: string;
  isLive: boolean;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  follow: { icon: '❤️', label: 'Follows' },
  sub: { icon: '⭐', label: 'Subs' },
  resub: { icon: '🔄', label: 'Re-subs' },
  gift: { icon: '🎁', label: 'Gifts' },
  raid: { icon: '⚔️', label: 'Raids' },
  cheer: { icon: '💎', label: 'Bits' },
  redemption: { icon: '🪄', label: 'Canjes' },
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export function StreamDashboard({ channel, backendUrl }: Props) {
  const [previewLoading, setPreviewLoading] = useState(true);
  const [stats, setStats] = useState<HudStats | null>(null);

  // Stream info editor state
  const [title, setTitle] = useState('');
  const [game, setGame] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Activity feed state
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState('all');

  // Fetch HUD stats
  useEffect(() => {
    if (!channel) return;
    const fetchStats = async () => {
      try {
        const r = await fetch(`${backendUrl}/hud/${channel}`);
        if (r.ok) {
          const data = await r.json();
          setStats(data);
          setTitle(data.streamTitle || '');
          setGame(data.gameName || '');
        }
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [channel, backendUrl]);

  // Fetch activity events
  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/activity/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});
  }, [channel, backendUrl]);

  // Save stream info
  const saveInfo = async () => {
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const r = await apiPut('/stream/info', { channel, title, game });
      if (!r.ok) {
        const data = await r.json();
        setSaveError(data.error || 'Error al guardar');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setSaveError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);

  if (!channel) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.5rem' }}>
            Gestor del Stream
          </h2>
          <p style={{ color: 'var(--sf-text-3)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto' }}>
            Ingresá un canal de Twitch en la barra superior para ver la previsualización, editar la info del stream y seguir la actividad en vivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Top section: Preview + Info ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: '0.25rem', overflow: 'hidden' }}
        >
          <div style={{
            position: 'relative', width: '100%', paddingBottom: '56.25%',
            borderRadius: 'var(--sf-radius-sm)', overflow: 'hidden', background: '#0a0a1a',
          }}>
            <iframe
              src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`}
              onLoad={() => setPreviewLoading(false)}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
            />
            {previewLoading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0a0a1a', fontSize: '0.85rem', color: 'var(--sf-text-3)',
              }}>
                Cargando stream...
              </div>
            )}
          </div>
        </motion.div>

        {/* Info + Stats */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card"
          style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: stats?.isLive ? '#34d399' : '#6b7280',
                boxShadow: stats?.isLive ? '0 0 8px rgba(52,211,153,0.5)' : 'none',
              }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: stats?.isLive ? '#34d399' : 'var(--sf-text-3)' }}>
                {stats?.isLive ? 'EN VIVO' : 'OFFLINE'}
              </span>
            </div>
            <a
              href={`https://twitch.tv/${channel}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: '0.75rem', color: 'var(--sf-primary-light)', textDecoration: 'none' }}
            >
              ↗ Twitch
            </a>
          </div>

          {/* Stream info editor */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'block' }}>
              Título del stream
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del stream..."
              className="sf-input"
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'block' }}>
              Juego / Categoría
            </label>
            <input
              type="text"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              placeholder="Ej: Just Chatting, Valorant..."
              className="sf-input"
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={saveInfo} disabled={saving} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            {saved && <span style={{ fontSize: '0.72rem', color: '#34d399' }}>✓ Guardado</span>}
            {saveError && <span style={{ fontSize: '0.72rem', color: '#f87171' }}>{saveError}</span>}
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
            paddingTop: '0.75rem', borderTop: '1px solid var(--sf-border)',
          }}>
            <StatCard label="Viewers" value={stats ? formatNumber(stats.viewers) : '—'} />
            <StatCard label="Followers" value={stats ? formatNumber(stats.followers) : '—'} />
            <StatCard label="Subs" value={stats ? formatNumber(stats.subscribers) : '—'} />
            <StatCard label="Uptime" value={stats && stats.isLive ? formatUptime(stats.uptimeSeconds) : '—'} />
          </div>
        </motion.div>
      </div>

      {/* ── Activity Feed ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card"
        style={{ padding: '1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔴 Actividad reciente
          </h3>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            <button onClick={() => setFilter('all')} className="sf-btn" style={{
              fontSize: '0.68rem', padding: '0.25rem 0.5rem',
              background: filter === 'all' ? 'var(--sf-primary)' : 'var(--sf-surface-hover)',
              color: filter === 'all' ? '#fff' : 'var(--sf-text-2)',
              border: 'none', borderRadius: 6, cursor: 'pointer',
            }}>Todos</button>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilter(key)} className="sf-btn" style={{
                fontSize: '0.68rem', padding: '0.25rem 0.5rem',
                background: filter === key ? 'var(--sf-primary)' : 'var(--sf-surface-hover)',
                color: filter === key ? '#fff' : 'var(--sf-text-2)',
                border: 'none', borderRadius: 6, cursor: 'pointer',
              }}>{cfg.icon} {cfg.label}</button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-3)', textAlign: 'center', padding: '1.5rem 0' }}>
            {channel ? 'Esperando actividad del canal...' : 'Conectá un canal para ver la actividad.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredEvents.slice(0, 20).map((event) => (
              <div key={event.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.4rem 0.625rem',
                background: 'rgba(255,255,255,0.02)', borderRadius: 6,
                fontSize: '0.8rem',
              }}>
                <span style={{ fontSize: '1rem' }}>{TYPE_CONFIG[event.type]?.icon ?? '📌'}</span>
                <strong style={{ color: 'var(--sf-text)', minWidth: 80, fontSize: '0.78rem' }}>{event.user}</strong>
                <span style={{ color: 'var(--sf-text-2)', flex: 1, fontSize: '0.78rem' }}>{event.message}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', whiteSpace: 'nowrap' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '0.5rem 0.625rem',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 8,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sf-text)' }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', marginTop: '1px' }}>{label}</div>
    </div>
  );
}
