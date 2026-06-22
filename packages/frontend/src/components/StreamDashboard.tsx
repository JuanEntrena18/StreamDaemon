import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { apiPut, apiGet } from '../utils/api';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { useToast } from '../contexts/ToastContext';
import styles from './StreamDashboard.module.css';

interface Props {
  channel: string;
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

const TYPE_CONFIG = (t: (key: string) => string): Record<string, { icon: string; label: string }> => ({
  follow: { icon: '❤️', label: t('dashboard.typeFollow') },
  sub: { icon: '⭐', label: t('dashboard.typeSub') },
  resub: { icon: '🔄', label: t('dashboard.typeResub') },
  gift: { icon: '🎁', label: t('dashboard.typeGift') },
  raid: { icon: '⚔️', label: t('dashboard.typeRaid') },
  cheer: { icon: '💎', label: t('dashboard.typeCheer') },
  redemption: { icon: '🪄', label: t('dashboard.typeRedeem') },
});

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

export function StreamDashboard({ channel }: Props) {
  const { t, dateLocale } = useTranslation();
  const [previewLoading, setPreviewLoading] = useState(true);
  const [stats, setStats] = useState<HudStats | null>(null);
  const { socket: sock } = useSocket();

  const [title, setTitle] = useState('');
  const [game, setGame] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [missingScope, setMissingScope] = useState(false);

  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [showGameResults, setShowGameResults] = useState(false);
  const [searchingGame, setSearchingGame] = useState(false);
  const gameSearchRef = useRef<ReturnType<typeof setTimeout>>();

  const [allTags, setAllTags] = useState<TagInfo[]>([]);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!channel) return;
    const fetchStats = async () => {
      try {
        const r = await apiGet(`/hud/${channel}`);
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
  }, [channel]);

  useEffect(() => {
    if (!channel) return;
    sock.emit('join:channel', channel);
  }, [sock, channel]);

  useEffect(() => {
    if (!channel) return;
    apiGet(`/activity/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});
  }, [channel]);

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
    addEvent({ id: `${Date.now()}-follow`, type: 'follow', user: data.userDisplayName, message: t('dashboard.eventFollow'), timestamp: Date.now() });
  });
  useSocketEvent('channel:subscribe', (data: { userDisplayName: string; tier: string }) => {
    const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[data.tier] ?? data.tier;
    addEvent({ id: `${Date.now()}-sub`, type: 'sub', user: data.userDisplayName, message: t('dashboard.eventSub', { tier: tierLabel }), timestamp: Date.now() });
  });
  useSocketEvent('channel:subscription-message', (data: { userDisplayName: string; tier: string; cumulativeMonths: number }) => {
    const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[data.tier] ?? data.tier;
    addEvent({ id: `${Date.now()}-resub`, type: 'resub', user: data.userDisplayName, message: t('dashboard.eventResub', { tier: tierLabel, months: data.cumulativeMonths }), timestamp: Date.now() });
  });
  useSocketEvent('channel:subgift', (data: { gifterDisplayName: string; amount: number; tier: string }) => {
    const tierLabel = { '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3' }[data.tier] ?? data.tier;
    addEvent({ id: `${Date.now()}-gift`, type: 'gift', user: data.gifterDisplayName, message: t('dashboard.eventGift', { amount: data.amount, tier: tierLabel }), timestamp: Date.now(), amount: data.amount });
  });
  useSocketEvent('channel:redemption', (data: { userDisplayName: string; rewardTitle: string; rewardCost: number }) => {
    addEvent({ id: `${Date.now()}-redeem`, type: 'redemption', user: data.userDisplayName, message: t('dashboard.eventRedeem', { reward: data.rewardTitle, cost: data.rewardCost }), timestamp: Date.now() });
  });
  useSocketEvent('channel:cheer', (data: { userDisplayName: string; bits: number }) => {
    addEvent({ id: `${Date.now()}-cheer`, type: 'cheer', user: data.userDisplayName, message: t('dashboard.eventBits', { bits: data.bits }), timestamp: Date.now(), amount: data.bits });
  });

  const toast = useToast();

  const saveInfo = async () => {
    setSaving(true);
    setSaved(false);
    setMissingScope(false);
    try {
      const r = await apiPut('/hud/stream/info', { channel, title, gameName: game || undefined, tags: activeTagIds });
      if (!r.ok) {
        const data = await r.json();
        if (data.error === 'missing_scope') {
          setMissingScope(true);
        }
        toast.error(data.error === 'missing_scope' ? data.message : (data.error || t('dashboard.errorGuardar')));
      } else {
        toast.success(t('dashboard.guardado'));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      toast.error(t('dashboard.errorConexion'));
    } finally {
      setSaving(false);
    }
  };

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);

  if (!channel) {
    return (
      <div className={styles.emptyState}>
        <div className={`glass-card ${styles.emptyCard}`}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
          <h2 className="sf-heading mb-2">{t('dashboard.title')}</h2>
          <p className="text-dim" style={{ fontSize: '0.9rem', maxWidth: 400, margin: '0 auto' }}>
            {t('dashboard.emptyState')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ── Activity Feed (top) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card ${styles.activityCard}`}
      >
        <div className={styles.activityHeader}>
          <h3 className="flex-row--gap-sm" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--sf-text)' }}>
            {t('dashboard.actividadReciente')}
          </h3>
          <div className="flex-row--gap-sm flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : styles.filterBtnInactive}`}
            >{t('dashboard.todos')}</button>
            {Object.entries(TYPE_CONFIG(t)).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`${styles.filterBtn} ${filter === key ? styles.filterBtnActive : styles.filterBtnInactive}`}
              >{cfg.icon} {cfg.label}</button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <p className="text-dim text-center" style={{ fontSize: '0.82rem', padding: '1.5rem 0' }}>
            {channel ? t('dashboard.esperandoActividad') : t('dashboard.conectarParaActividad')}
          </p>
        ) : (
          <div className="flex-col--gap-sm" style={{ gap: 4 }} aria-live="polite">
            {filteredEvents.slice(0, 20).map((event) => (
              <div key={event.id} className={styles.eventItem}>
                <span className={styles.eventIcon}>{TYPE_CONFIG(t)[event.type]?.icon ?? '📌'}</span>
                <strong className={styles.eventUser}>{event.user}</strong>
                <span className={styles.eventMsg}>{event.message}</span>
                <span className={styles.eventTime}>{new Date(event.timestamp).toLocaleTimeString(dateLocale || 'es-ES')}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Bottom section: Preview + Info ── */}
      <div className={styles.bottomGrid}>
        {/* Preview */}
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          className={`glass-card ${styles.previewCard}`}
        >
          <div className={styles.previewWrap}>
            <iframe
              key={channel}
              src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&parent=localhost&parent=127.0.0.1&muted=true`}
              onLoad={() => setPreviewLoading(false)}
              className={styles.previewIframe}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
            {previewLoading && (
              <div className={styles.previewLoading}>{t('dashboard.cargandoStream')}</div>
            )}
          </div>
        </motion.div>

        {/* Info + Stats */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className={`glass-card ${styles.infoCard}`}
        >
          {/* Live indicator */}
          <div className="flex-between">
            <div className="flex-row--gap-sm">
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: stats?.isLive ? '#34d399' : '#6b7280',
                boxShadow: stats?.isLive ? '0 0 8px rgba(52,211,153,0.5)' : 'none',
              }} />
              <span style={{
                fontSize: '0.82rem', fontWeight: 600,
                color: stats?.isLive ? '#34d399' : 'var(--sf-text-3)',
              }}>
                {stats?.isLive ? t('dashboard.enVivo') : t('dashboard.offline')}
              </span>
            </div>
            <a
              href={`https://twitch.tv/${channel}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-muted" style={{ color: 'var(--sf-primary-light)', textDecoration: 'none' }}
            >
              {t('dashboard.twitchLink')}
            </a>
          </div>

          {/* Stream info editor */}
          <div>
            <label className="sf-label mb-2">{t('dashboard.tituloStream')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('dashboard.tituloPlaceholder')}
              className="sf-input"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <label className="sf-label mb-2">{t('dashboard.juegoCategoria')}</label>
            <input
              type="text"
              value={game}
              onChange={(e) => handleGameInput(e.target.value)}
              onFocus={() => setShowGameResults(true)}
              onBlur={() => setTimeout(() => setShowGameResults(false), 200)}
              placeholder={t('dashboard.juegoPlaceholder')}
              className="sf-input"
              style={{ fontSize: '0.82rem' }}
            />
            {searchingGame && <span className="text-dim" style={{ position: 'absolute', right: 8, top: 28, fontSize: '0.65rem' }}>{t('dashboard.buscando')}</span>}
            {showGameResults && gameResults.length > 0 && (
              <div className={styles.gameSearchResults}>
                {gameResults.map((g) => (
                  <div key={g.id} onClick={() => selectGame(g)} className={styles.gameSearchItem}>
                    {g.boxArtUrl && <img src={g.boxArtUrl} alt="" style={{ width: 28, height: 38, borderRadius: 4, objectFit: 'cover' }} />}
                    <span>{g.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="sf-label mb-2">
              {t('dashboard.tagsStream')} {activeTagIds.length > 0 && <span className="text-dim" style={{ fontSize: '0.65rem' }}>({activeTagIds.length}/10)</span>}
            </label>
            <div className="flex-col--gap-sm">
              <div className="flex-row flex-wrap" style={{ gap: '0.3rem', minHeight: 24 }}>
                {activeTagIds.map((tagId) => {
                  const tagInfo = allTags.find((t) => t.id === tagId);
                  return (
                    <span key={tagId} className={styles.tagChip}>
                      {tagInfo?.name ?? tagId}
                      <span onClick={() => toggleTag(tagId)} className={styles.tagRemove}>×</span>
                    </span>
                  );
                })}
                {activeTagIds.length === 0 && (
                  <span className="text-dim" style={{ fontSize: '0.68rem' }}>{t('dashboard.sinTags')}</span>
                )}
              </div>
              <div className="flex-row" style={{ gap: '0.3rem' }}>
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                  placeholder={t('dashboard.tagPlaceholder')}
                  className="sf-input"
                  style={{ flex: 1, fontSize: '0.75rem' }}
                  maxLength={25}
                />
                <button onClick={addCustomTag} disabled={activeTagIds.length >= 10} className="sf-btn" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                  {t('dashboard.agregarTag')}
                </button>
              </div>
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder={allTags.length > 0 ? t('dashboard.buscarTags') : ''}
                className="sf-input"
                style={{ fontSize: '0.75rem', display: allTags.length > 0 ? '' : 'none' }}
              />
              {tagSearch && allTags.length > 0 && (
                <div className="flex-row flex-wrap" style={{ gap: '0.3rem', maxHeight: 80, overflowY: 'auto' }}>
                  {allTags
                    .filter((tag) => tag.name.toLowerCase().includes(tagSearch.toLowerCase()) && !activeTagIds.includes(tag.id))
                    .slice(0, 15)
                    .map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={styles.tagBtn}
                        style={{ opacity: tag.isAuto ? 0.5 : 1 }}
                      >{tag.name}{tag.isAuto ? ` (${t('dashboard.auto')})` : ''}</button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-row" style={{ gap: '0.75rem', paddingTop: '0.25rem' }}>
            <button onClick={saveInfo} disabled={saving} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
              {saving ? t('dashboard.guardando') : t('dashboard.guardarCambios')}
            </button>
            {saved && <span style={{ fontSize: '0.72rem', color: '#34d399' }}>{t('dashboard.guardado')}</span>}
            {missingScope && (
              <button onClick={() => window.location.href = '/auth/login'}
                className="sf-btn"
                style={{
                  fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                  background: 'rgba(239,68,68,0.1)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}>
                {t('dashboard.reconnectTwitch')}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <StatCard label={t('dashboard.statsViewers')} value={stats ? formatNumber(stats.viewers) : '—'} />
            <StatCard label={t('dashboard.statsFollowers')} value={stats ? formatNumber(stats.followers) : '—'} />
            <StatCard label={t('dashboard.statsSubs')} value={stats ? formatNumber(stats.subscribers) : '—'} />
            <StatCard label={t('dashboard.statsUptime')} value={stats && stats.isLive ? formatUptime(stats.uptimeSeconds) : '—'} />
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
      <div className="text-dim" style={{ fontSize: '0.65rem', marginTop: '1px' }}>{label}</div>
    </div>
  );
}
