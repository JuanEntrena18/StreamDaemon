import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { apiPut, apiGet } from '../utils/api';
import { useSocket, useSocketEvent } from '../hooks/useSocket';

interface Props {
  channel: string;
  backendUrl: string;
}

interface ActivityEvent {
  id: string;
  type: string;
  user: string;
  message: string;
  timestamp: number;
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

interface GameResult {
  id: string;
  name: string;
  boxArtUrl: string;
}

interface TagInfo {
  id: string;
  name: string;
  isAuto: boolean;
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
  const { socket: sock } = useSocket();

  // Stream info editor state
  const [title, setTitle] = useState('');
  const [game, setGame] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Game search
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [showGameResults, setShowGameResults] = useState(false);
  const [searchingGame, setSearchingGame] = useState(false);
  const gameSearchRef = useRef<ReturnType<typeof setTimeout>>();

  // Tags
  const [allTags, setAllTags] = useState<TagInfo[]>([]);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');

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

  // Join socket room for real-time events
  useEffect(() => {
    if (!channel) return;
    sock.emit('join:channel', channel);
  }, [sock, channel]);

  // Fetch historical activity events on mount
  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/activity/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});
  }, [channel, backendUrl]);

  // Game search with debounce
  const handleGameInput = (value: string) => {
    setGame(value);
    setShowGameResults(true);
    if (gameSearchRef.current) clearTimeout(gameSearchRef.current);
    if (!value.trim()) { setGameResults([]); return; }
    gameSearchRef.current = setTimeout(async () => {
      setSearchingGame(true);
      const r = await apiGet(`/hud/games/search?query=${encodeURIComponent(value)}`);
      if (r.ok) {
        const data = await r.json();
        setGameResults(data);
      }
      setSearchingGame(false);
    }, 300);
  };

  const selectGame = (g: GameResult) => {
    setGame(g.name);
    setGameResults([]);
    setShowGameResults(false);
  };

  // Fetch tags on mount
  useEffect(() => {
    if (!channel) return;
    apiGet(`/hud/tags/${channel}`).then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      setAllTags(data.allTags ?? []);
      setActiveTagIds(data.activeTagIds ?? []);
      if (data.gameName) setGame(data.gameName);
    });
  }, [channel]);

  const toggleTag = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };
  const [customTagInput, setCustomTagInput] = useState('');
  const addCustomTag = () => {
    const name = customTagInput.trim().slice(0, 25);
    if (!name || activeTagIds.includes(name) || activeTagIds.length >= 10) return;
    setActiveTagIds((prev) => [...prev, name]);
    setCustomTagInput('');
  };

  const addEvent = useCallback((e: ActivityEvent) => {
    setEvents((prev) => [e, ...prev].slice(0, 50));
  }, []);

  useSocketEvent('channel:follow', (data: { userDisplayName: string }) => {
    addEvent({ id: `${Date.now()}-follow`, type: 'follow', user: data.userDisplayName, message: 'siguió el canal', timestamp: Date.now() });
  });
  useSocketEvent('channel:subscribe', (data: { userDisplayName: string; tier: string }) => {
    const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[data.tier] ?? data.tier;
    addEvent({ id: `${Date.now()}-sub`, type: 'sub', user: data.userDisplayName, message: `se suscribió (${tierLabel})`, timestamp: Date.now() });
  });
  useSocketEvent('channel:subscription-message', (data: { userDisplayName: string; tier: string; cumulativeMonths: number }) => {
    const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[data.tier] ?? data.tier;
    addEvent({ id: `${Date.now()}-resub`, type: 'resub', user: data.userDisplayName, message: `renovó suscripción (${tierLabel}, ${data.cumulativeMonths} meses)`, timestamp: Date.now() });
  });
  useSocketEvent('channel:subgift', (data: { gifterDisplayName: string; amount: number; tier: string }) => {
    const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[data.tier] ?? data.tier;
    addEvent({ id: `${Date.now()}-gift`, type: 'gift', user: data.gifterDisplayName, message: `regaló ${data.amount} suscripción(es) (${tierLabel})`, timestamp: Date.now(), amount: data.amount });
  });
  useSocketEvent('channel:redemption', (data: { userDisplayName: string; rewardTitle: string; rewardCost: number }) => {
    addEvent({ id: `${Date.now()}-redeem`, type: 'redemption', user: data.userDisplayName, message: `canjeó ${data.rewardTitle} (${data.rewardCost} pts)`, timestamp: Date.now() });
  });
  useSocketEvent('channel:cheer', (data: { userDisplayName: string; bits: number }) => {
    addEvent({ id: `${Date.now()}-cheer`, type: 'cheer', user: data.userDisplayName, message: `donó ${data.bits} bits`, timestamp: Date.now(), amount: data.bits });
  });

  // Save stream info
  const saveInfo = async () => {
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const r = await apiPut('/hud/stream/info', { channel, title, gameName: game || undefined, tags: activeTagIds });
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
      {/* ── Activity Feed (top, full-width) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ padding: '1.25rem', marginBottom: '1.25rem' }}
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

      {/* ── Bottom section: Preview + Info ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: '1.25rem',
      }}>
        {/* Preview */}
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          className="glass-card"
          style={{ padding: '0.25rem', overflow: 'hidden' }}
        >
          <div style={{
            position: 'relative', width: '100%', paddingBottom: '56.25%',
            borderRadius: 'var(--sf-radius-sm)', overflow: 'hidden', background: '#0a0a1a',
          }}>
            <iframe
              key={channel}
              src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&parent=localhost&parent=127.0.0.1&muted=true`}
              onLoad={() => setPreviewLoading(false)}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
            {previewLoading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', color: 'var(--sf-text-3)', pointerEvents: 'none',
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
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.25rem', display: 'block' }}>
              Juego / Categoría
            </label>
            <input
              type="text"
              value={game}
              onChange={(e) => handleGameInput(e.target.value)}
              onFocus={() => setShowGameResults(true)}
              onBlur={() => setTimeout(() => setShowGameResults(false), 200)}
              placeholder="Ej: Just Chatting, Valorant..."
              className="sf-input"
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
            {searchingGame && <span style={{ position: 'absolute', right: 8, top: 28, fontSize: '0.65rem', color: 'var(--sf-text-3)' }}>Buscando...</span>}
            {showGameResults && gameResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--sf-surface)', border: '1px solid var(--sf-border)',
                borderRadius: 8, maxHeight: 180, overflowY: 'auto', marginTop: 4,
              }}>
                {gameResults.map((g) => (
                  <div key={g.id} onClick={() => selectGame(g)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.625rem', cursor: 'pointer', fontSize: '0.8rem',
                    borderBottom: '1px solid var(--sf-border)', color: 'var(--sf-text)',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sf-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {g.boxArtUrl && <img src={g.boxArtUrl} alt="" style={{ width: 28, height: 38, borderRadius: 4, objectFit: 'cover' }} />}
                    <span>{g.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.35rem', display: 'block' }}>
              Tags del stream {activeTagIds.length > 0 && <span style={{ color: 'var(--sf-text-3)', fontSize: '0.65rem' }}>({activeTagIds.length}/10)</span>}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {/* Active tag chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', minHeight: 24 }}>
                {activeTagIds.map((tagId) => {
                  const tagInfo = allTags.find((t) => t.id === tagId);
                  return (
                    <span key={tagId} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                      fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: 12,
                      background: 'var(--sf-primary)', color: '#fff',
                    }}>
                      {tagInfo?.name ?? tagId}
                      <span onClick={() => toggleTag(tagId)} style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.7 }}>×</span>
                    </span>
                  );
                })}
                {activeTagIds.length === 0 && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)' }}>Sin tags</span>
                )}
              </div>
              {/* Custom tag input */}
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                  placeholder="Tag personalizado (max 25 chars)"
                  className="sf-input"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  maxLength={25}
                />
                <button onClick={addCustomTag} disabled={activeTagIds.length >= 10} className="sf-btn" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                  + Tag
                </button>
              </div>
              {/* Filter/search available tags */}
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder={allTags.length > 0 ? 'Buscar tags disponibles...' : ''}
                className="sf-input"
                style={{ width: '100%', fontSize: '0.75rem', display: allTags.length > 0 ? '' : 'none' }}
              />
              {/* Available tags list */}
              {tagSearch && allTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: 80, overflowY: 'auto' }}>
                  {allTags
                    .filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()) && !activeTagIds.includes(t.id))
                    .slice(0, 15)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        style={{
                          fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: 12, border: 'none',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                          background: 'var(--sf-surface-hover)', color: 'var(--sf-text-2)',
                          opacity: t.isAuto ? 0.5 : 1,
                        }}
                      >{t.name}{t.isAuto ? ' (auto)' : ''}</button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.25rem' }}>
            <button onClick={saveInfo} disabled={saving} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
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
