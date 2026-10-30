import { useState, useEffect, useCallback, useRef } from 'react';
import type { ComponentType } from 'react';
import { apiPut, apiGet } from '../utils/api';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { useToast } from '../contexts/ToastContext';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { EmptyState } from './EmptyState';
import type { IconProps } from './icons/IconBase';
import {
  IconHeart, IconStar, IconRefresh, IconGiveaway, IconSword,
  IconGem, IconWand, IconArrowUpRight, IconInbox, IconDashboard,
} from './icons/icons';
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

const TYPE_ICONS: Record<string, ComponentType<IconProps>> = {
  follow: IconHeart,
  sub: IconStar,
  resub: IconRefresh,
  gift: IconGiveaway,
  raid: IconSword,
  cheer: IconGem,
  redemption: IconWand,
};

const TYPE_LABEL: Record<string, string> = {
  follow: 'typeFollow',
  sub: 'typeSub',
  resub: 'typeResub',
  gift: 'typeGift',
  raid: 'typeRaid',
  cheer: 'typeCheer',
  redemption: 'typeRedeem',
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export function StreamDashboard({ channel }: Props) {
  const { t, dateLocale } = useTranslation();
  const { login } = useAuthStatus();
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

  const focusChannelInput = () => {
    document.querySelector<HTMLInputElement>('[data-channel-input]')?.focus();
  };

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);

  if (!channel) {
    return (
      <div className={styles.emptyWrap}>
        <EmptyState
          icon={<IconDashboard size={20} />}
          title={t('dashboard.title')}
          description={t('dashboard.emptyState')}
          actionLabel={t('chat.emptyStateTitle')}
          onAction={focusChannelInput}
        />
      </div>
    );
  }

  const live = !!stats?.isLive;

  return (
    <div className={styles.container}>
      {/* ── Resumen del directo ── */}
      <section className={`sf-card ${styles.summary}`}>
        <div className={styles.summaryMain}>
          <div className={styles.statusRow}>
            <span className={`${styles.statusDot} ${live ? styles.statusDotLive : ''}`} />
            <span className={`${styles.statusLabel} ${live ? styles.statusLabelLive : ''}`}>
              {live ? t('dashboard.enVivo') : t('dashboard.offline')}
            </span>
            {live && (
              <span className={styles.uptime}>{formatUptime(stats?.uptimeSeconds ?? 0)}</span>
            )}
          </div>

          <h2 className={styles.streamTitle} title={stats?.streamTitle || ''}>
            {stats?.streamTitle || t('dashboard.sinTitulo')}
          </h2>
          <p className={styles.streamMeta}>{stats?.gameName || t('dashboard.sinCategoria')}</p>
        </div>

        <div className={styles.statsRow}>
          <Stat label={t('dashboard.statsViewers')} value={stats ? formatNumber(stats.viewers) : '—'} />
          <Stat label={t('dashboard.statsFollowers')} value={stats ? formatNumber(stats.followers) : '—'} />
          <Stat label={t('dashboard.statsSubs')} value={stats ? formatNumber(stats.subscribers) : '—'} />
          <Stat label={t('dashboard.statsUptime')} value={live ? formatUptime(stats?.uptimeSeconds ?? 0) : '—'} />
        </div>

        <a
          href={`https://twitch.tv/${channel}`}
          target="_blank"
          rel="noreferrer"
          className={styles.extLink}
        >
          {t('dashboard.twitchLink')}
          <IconArrowUpRight size={12} />
        </a>
      </section>

      <div className={styles.mainGrid}>
        {/* ── Columna izquierda: preview + actividad ── */}
        <div className={styles.leftCol}>
          <div className={`sf-card ${styles.previewCard}`}>
            <div className={styles.previewWrap}>
              <iframe
                key={channel}
                src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&parent=localhost&parent=127.0.0.1&muted=true`}
                onLoad={() => setPreviewLoading(false)}
                className={styles.previewIframe}
                allow="autoplay; fullscreen"
                allowFullScreen
                title={channel}
              />
              {previewLoading && (
                <div className={styles.previewLoading}>{t('dashboard.cargandoStream')}</div>
              )}
            </div>
          </div>

          <section className={`sf-card ${styles.activityCard}`}>
            <header className={styles.activityHeader}>
              <h3 className={styles.cardTitle}>{t('dashboard.actividadReciente')}</h3>
              <div className={styles.filters}>
                <button
                  onClick={() => setFilter('all')}
                  className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
                >
                  {t('dashboard.todos')}
                </button>
                {Object.keys(TYPE_ICONS).map((key) => {
                  const Icon = TYPE_ICONS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`${styles.filterBtn} ${filter === key ? styles.filterBtnActive : ''}`}
                    >
                      <Icon size={12} />
                      {t(`dashboard.${TYPE_LABEL[key]}`)}
                    </button>
                  );
                })}
              </div>
            </header>

            {filteredEvents.length === 0 ? (
              <div className={styles.activityEmpty}>
                <IconInbox size={16} />
                <div>
                  <p className={styles.activityEmptyTitle}>{t('dashboard.actividadVaciaTitulo')}</p>
                  <p className={styles.activityEmptyDesc}>{t('dashboard.actividadVaciaDesc')}</p>
                </div>
              </div>
            ) : (
              <ul className={styles.eventList} aria-live="polite">
                {filteredEvents.slice(0, 20).map((event) => {
                  const Icon = TYPE_ICONS[event.type] ?? IconInbox;
                  return (
                    <li key={event.id} className={styles.eventItem}>
                      <span className={styles.eventIcon}><Icon size={13} /></span>
                      <strong className={styles.eventUser}>{event.user}</strong>
                      <span className={styles.eventMsg}>{event.message}</span>
                      <span className={styles.eventTime}>
                        {new Date(event.timestamp).toLocaleTimeString(dateLocale || 'es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ── Columna derecha: editor de info ── */}
        <aside className={`sf-card ${styles.infoCard}`}>
          <h3 className={styles.cardTitle}>{t('dashboard.infoTitle')}</h3>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="stream-title">
              {t('dashboard.tituloStream')}
            </label>
            <input
              id="stream-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('dashboard.tituloPlaceholder')}
              className="sf-input"
            />
          </div>

          <div className={styles.field} style={{ position: 'relative' }}>
            <label className={styles.fieldLabel} htmlFor="stream-game">
              {t('dashboard.juegoCategoria')}
            </label>
            <input
              id="stream-game"
              type="text"
              value={game}
              onChange={(e) => handleGameInput(e.target.value)}
              onFocus={() => setShowGameResults(true)}
              onBlur={() => setTimeout(() => setShowGameResults(false), 200)}
              placeholder={t('dashboard.juegoPlaceholder')}
              className="sf-input"
            />
            {searchingGame && <span className={styles.searching}>{t('dashboard.buscando')}</span>}
            {showGameResults && gameResults.length > 0 && (
              <div className={styles.gameSearchResults}>
                {gameResults.map((g) => (
                  <div key={g.id} onClick={() => selectGame(g)} className={styles.gameSearchItem}>
                    {g.boxArtUrl && <img src={g.boxArtUrl} alt="" className={styles.boxArt} />}
                    <span>{g.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              {t('dashboard.tagsStream')}
              {activeTagIds.length > 0 && (
                <span className={styles.fieldCount}>{activeTagIds.length}/10</span>
              )}
            </label>

            <div className={styles.tagList}>
              {activeTagIds.map((tagId) => {
                const tagInfo = allTags.find((tg) => tg.id === tagId);
                return (
                  <span key={tagId} className={styles.tagChip}>
                    {tagInfo?.name ?? tagId}
                    <button
                      type="button"
                      onClick={() => toggleTag(tagId)}
                      className={styles.tagRemove}
                      aria-label={`Remove ${tagInfo?.name ?? tagId}`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              {activeTagIds.length === 0 && (
                <span className={styles.fieldHint}>{t('dashboard.sinTags')}</span>
              )}
            </div>

            <div className={styles.tagInputRow}>
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                placeholder={t('dashboard.tagPlaceholder')}
                className="sf-input"
                maxLength={25}
              />
              <button
                onClick={addCustomTag}
                disabled={activeTagIds.length >= 10}
                className="sf-btn sf-btn-ghost sf-btn-sm"
              >
                {t('dashboard.agregarTag')}
              </button>
            </div>

            {allTags.length > 0 && (
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder={t('dashboard.buscarTags')}
                className="sf-input"
              />
            )}

            {tagSearch && allTags.length > 0 && (
              <div className={styles.tagSuggestions}>
                {allTags
                  .filter((tag) => tag.name.toLowerCase().includes(tagSearch.toLowerCase()) && !activeTagIds.includes(tag.id))
                  .slice(0, 15)
                  .map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={styles.tagBtn}
                      style={{ opacity: tag.isAuto ? 0.55 : 1 }}
                    >
                      {tag.name}{tag.isAuto ? ` ${t('dashboard.auto')}` : ''}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              onClick={saveInfo}
              disabled={saving}
              className="sf-btn sf-btn-primary sf-btn-sm"
            >
              {saving ? t('dashboard.guardando') : t('dashboard.guardarCambios')}
            </button>
            {saved && <span className={styles.savedMsg}>{t('dashboard.guardado')}</span>}
            {missingScope && (
              <button onClick={login} className="sf-btn sf-btn-danger sf-btn-sm">
                {t('dashboard.reconnectTwitch')}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
