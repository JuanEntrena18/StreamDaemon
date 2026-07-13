import { useCallback, useEffect, useState } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { apiGet, apiPost } from '../utils/api';
import { useTranslation } from '../i18n/context';
import type { KpiOverview, ViewerSnapshot, GamePerformance, BestSlot, ChannelRaidEvent, TwitchTopGame, ChatStats, StreamSummary, ChannelRecord } from '@streamdaemon/shared';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { SkeletonCard, SkeletonChart } from './Skeletons';
import styles from './KpiPanel.module.css';

type SubTab = 'overview' | 'audience' | 'chat' | 'summary' | 'records' | 'games' | 'slots' | 'topGames';

interface Props {
  channel: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DeltaIndicator({ value }: { value?: number }) {
  if (value === undefined) return null;
  const isPositive = value > 0;
  const isNegative = value < 0;
  const className = `${styles.kpiDelta} ${isPositive ? styles.positive : isNegative ? styles.negative : styles.neutral}`;
  const icon = isPositive ? '↑' : isNegative ? '↓' : '—';
  const displayValue = value === 0 ? '0%' : `${isPositive ? '+' : ''}${value}%`;

  return (
    <div className={className}>
      <span>{icon}</span>
      <span>{displayValue}</span>
    </div>
  );
}

function OverviewTab({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<KpiOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [raids, setRaids] = useState<ChannelRaidEvent[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/kpi/overview/${encodeURIComponent(channel)}?period=${period}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [channel, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useSocketEvent('channel:raid', useCallback((e: ChannelRaidEvent) => {
    setRaids(prev => [e, ...prev].slice(0, 20));
  }, []));

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.periodBar}>
          <SkeletonCard style={{ width: 300, height: 32 }} />
        </div>
        <div className={styles.kpiGrid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} style={{ height: 80 }} />
          ))}
        </div>
      </div>
    );
  }
  if (!data) return <div className={styles.loading}>{t('kpi.waitingData') || 'Esperando datos'}</div>;

  const cards = [
    { label: t('kpi.avgViewers') || 'Promedio Viewers', value: formatNumber(data.avgViewers), delta: data.avgViewersDelta },
    { label: t('kpi.peakViewers') || 'Pico Viewers', value: formatNumber(data.peakViewers), delta: data.peakViewersDelta },
    { label: t('kpi.followersGained') || 'Nuevos Seguidores', value: formatNumber(data.followersGained), delta: data.followersGainedDelta },
    { label: t('kpi.subsGained') || 'Nuevas Subs', value: formatNumber(data.subsGained), delta: data.subsGainedDelta },
    { label: t('kpi.bitsDonated') || 'Bits Donados', value: formatNumber(data.bitsDonated), delta: data.bitsDonatedDelta },
    { label: t('kpi.estimatedRevenue') || 'Ingresos Estimados', value: formatCurrency(data.estimatedRevenue), delta: data.estimatedRevenueDelta },
    { label: t('kpi.totalViews') || 'Vistas Totales', value: formatNumber(data.totalViews), delta: data.totalViewsDelta },
    { label: t('kpi.totalHours') || 'Horas Transmitidas', value: data.totalHoursStreamed.toFixed(1) + 'h', delta: data.totalHoursStreamedDelta },
    { label: t('kpi.streams') || 'Streams', value: data.streamsThisPeriod.toString(), delta: data.streamsThisPeriodDelta },
  ];

  return (
    <div className={styles.tabContent}>
      <div className={styles.periodBar}>
        <span>{t('kpi.period') || 'Período'}:</span>
        {['7d', '30d', '90d', 'all'].map(p => (
          <button key={p} className={`${styles.periodBtn} ${period === p ? styles.active : ''}`} onClick={() => setPeriod(p)}>
            {t(`kpi.period${p}`) || p}
          </button>
        ))}
      </div>
      <div className={styles.kpiGrid}>
        {cards.map(c => (
          <div key={c.label} className={styles.kpiCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className={styles.kpiLabel}>{c.label}</span>
              {period !== 'all' && <DeltaIndicator value={c.delta} />}
            </div>
            <span className={styles.kpiValue}>{c.value}</span>
          </div>
        ))}
      </div>
      {raids.length > 0 && (
        <div className={styles.raidSection}>
          <h3>{t('kpi.recentRaids') || 'Raids Recientes'}</h3>
          <div className={styles.raidList}>
            {raids.map((r, i) => (
              <div key={i} className={styles.raidItem}>
                <span className={styles.raidFrom}>{r.fromDisplayName}</span>
                <span className={styles.raidViewers}>{formatNumber(r.viewerCount)} viewers</span>
                <span className={styles.raidTime}>{new Date(r.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AudienceTab({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const [snapshots, setSnapshots] = useState<ViewerSnapshot[]>([]);
  const [activeViewers, setActiveViewers] = useState(0);

  useEffect(() => {
    if (!channel) return;
    apiPost('/hud/start-poll', { channel, interval: 15 }).catch(() => {});
  }, [channel]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiGet(`/kpi/viewers-history/${encodeURIComponent(channel)}`);
        if (res.ok) {
          const d = await res.json();
          setSnapshots(d.snapshots);
          setActiveViewers(d.activeViewers);
        }
      } catch { /* ignore */ }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [channel]);

  const formattedData = snapshots.map(s => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    viewers: s.viewers,
    chatters: s.chattersActive,
    engagement: s.viewers > 0 ? Math.round(((s.chattersActive || 0) / s.viewers) * 100) : 0
  }));

  const avgViewers = snapshots.length > 0 ? Math.round(snapshots.reduce((acc, s) => acc + s.viewers, 0) / snapshots.length) : 0;
  const peakViewers = snapshots.length > 0 ? Math.max(...snapshots.map(s => s.viewers)) : 0;
  const avgEngagement = snapshots.length > 0 ? Math.round(snapshots.reduce((acc, s) => acc + (s.viewers > 0 ? ((s.chattersActive || 0) / s.viewers) * 100 : 0), 0) / snapshots.length) : 0;

  let trend = 0;
  if (snapshots.length >= 5) {
    const recent = snapshots.slice(-5);
    const oldest = recent[0].viewers;
    const newest = recent[4].viewers;
    trend = oldest > 0 ? Math.round(((newest - oldest) / oldest) * 100) : 0;
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.audienceHeader}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span className={styles.activeViewers}>{t('kpi.activeViewers') || 'Viewers Activos'}: <strong>{activeViewers}</strong></span>
          <span className={styles.snapshotCount}>{snapshots.length} {t('kpi.snapshots') || 'registros'}</span>
        </div>
      </div>
      
      {snapshots.length >= 2 && (
        <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '1.5rem' }}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{t('kpi.trend') || 'Tendencia (1m)'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={styles.kpiValue}>{trend > 0 ? '↑' : trend < 0 ? '↓' : '—'}</span>
              <DeltaIndicator value={trend} />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{t('kpi.avgViewers') || 'Promedio Viewers'}</span>
            <span className={styles.kpiValue}>{avgViewers}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{t('kpi.peakViewers') || 'Pico Viewers'}</span>
            <span className={styles.kpiValue}>{peakViewers}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{t('kpi.avgEngagement') || 'Engagement Prom.'}</span>
            <span className={styles.kpiValue} style={{ color: 'var(--sf-success)' }}>{avgEngagement}%</span>
          </div>
        </div>
      )}

      <div className={styles.chartContainer}>
        {snapshots.length < 2 ? (
          <div className={styles.chartEmpty}>{t('kpi.waitingData') || 'Esperando más datos para mostrar la gráfica...'}</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-border)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--sf-text-2)" fontSize={12} tickMargin={10} minTickGap={30} />
              <YAxis yAxisId="left" stroke="var(--sf-text-2)" fontSize={12} tickFormatter={formatNumber} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--sf-text-2)" fontSize={12} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--sf-bg)', border: '1px solid var(--sf-border)', borderRadius: '8px', color: 'var(--sf-text)' }}
                itemStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line yAxisId="left" type="monotone" name={t('kpi.viewers') || 'Viewers'} dataKey="viewers" stroke="var(--sf-primary)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              <Line yAxisId="left" type="monotone" name={t('kpi.chatters') || 'Chatters'} dataKey="chatters" stroke="var(--sf-accent)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line yAxisId="right" type="monotone" name={t('kpi.engagement') || 'Engagement %'} dataKey="engagement" stroke="var(--sf-success)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function ChatStatsTab({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/kpi/chat-stats/${encodeURIComponent(channel)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channel]);

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.kpiGrid}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} style={{ height: 80 }} />)}
        </div>
        <SkeletonChart height={300} />
      </div>
    );
  }

  if (!stats || stats.timeline.length < 2) {
    return <div className={styles.loading}>{t('kpi.waitingData') || 'Esperando más datos de chat para mostrar las estadísticas...'}</div>;
  }

  const chartData = stats.timeline.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    messagesPerMin: item.messagesPerMin,
  }));

  return (
    <div className={styles.tabContent}>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>{t('kpi.avgMessages') || 'Msgs / min (Prom)'}</span>
          <span className={styles.kpiValue}>{stats.avgMessagesPerMin}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>{t('kpi.peakMessages') || 'Msgs / min (Pico)'}</span>
          <span className={styles.kpiValue}>{stats.peakMessagesPerMin}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>{t('kpi.uniqueChatters') || 'Chatters Únicos'}</span>
          <span className={styles.kpiValue} style={{ color: 'var(--sf-accent)' }}>{stats.uniqueChatters}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>{t('kpi.totalMessages') || 'Mensajes Totales'}</span>
          <span className={styles.kpiValue}>{formatNumber(stats.totalMessages)}</span>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--sf-accent)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--sf-accent)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-border)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--sf-text-2)" fontSize={12} tickMargin={10} minTickGap={30} />
            <YAxis stroke="var(--sf-text-2)" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--sf-bg)', border: '1px solid var(--sf-border)', borderRadius: '8px', color: 'var(--sf-text)' }}
              itemStyle={{ fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Area type="monotone" name={t('kpi.messagesPerMin') || 'Mensajes / min'} dataKey="messagesPerMin" stroke="var(--sf-accent)" fillOpacity={1} fill="url(#colorMsgs)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StreamSummaryTab({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<StreamSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/kpi/stream-summary/${encodeURIComponent(channel)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSummary(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channel]);

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <SkeletonCard style={{ height: 400 }} />
      </div>
    );
  }

  if (!summary) {
    return <div className={styles.loading}>{t('kpi.noStreamSummary') || 'No se encontró un stream reciente para generar el reporte.'}</div>;
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.summaryCard} style={{ background: 'var(--sf-surface)', border: '1px solid var(--sf-border)', borderRadius: '12px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--sf-text)' }}>{t('kpi.streamReport') || 'Reporte de Stream'}</h2>
          <p style={{ margin: 0, color: 'var(--sf-text-2)' }}>{summary.streamTitle}</p>
          <div style={{ marginTop: '1rem', color: 'var(--sf-text-3)', fontSize: '0.9rem' }}>
            {new Date(summary.startedAt).toLocaleDateString()} • {formatDuration(summary.duration)}
          </div>
        </div>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard} style={{ background: 'var(--sf-surface-hover)' }}>
            <span className={styles.kpiLabel}>{t('kpi.peakViewers') || 'Pico Viewers'}</span>
            <span className={styles.kpiValue}>{formatNumber(summary.peakViewers)}</span>
          </div>
          <div className={styles.kpiCard} style={{ background: 'var(--sf-surface-hover)' }}>
            <span className={styles.kpiLabel}>{t('kpi.followersGained') || 'Nuevos Followers'}</span>
            <span className={styles.kpiValue} style={{ color: 'var(--sf-success)' }}>+{summary.followersGained}</span>
          </div>
          <div className={styles.kpiCard} style={{ background: 'var(--sf-surface-hover)' }}>
            <span className={styles.kpiLabel}>{t('kpi.estimatedRevenue') || 'Ingresos'}</span>
            <span className={styles.kpiValue}>{formatCurrency(summary.estimatedRevenue)}</span>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
          <button className="sf-button sf-button--primary" onClick={() => window.open(`https://twitch.tv/${channel}`, '_blank')}>
            {t('kpi.viewChannel') || 'Ver Canal en Twitch'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordsTab({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<ChannelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/kpi/records/${encodeURIComponent(channel)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRecords(d.records); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channel]);

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.kpiGrid}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} style={{ height: 120 }} />)}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return <div className={styles.loading}>{t('kpi.noRecords') || 'No se encontraron récords para este canal.'}</div>;
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {records.map((r, i) => (
          <div key={i} className={styles.kpiCard} style={{ background: 'var(--sf-surface-hover)', borderColor: 'var(--sf-primary-glow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2rem' }}>{r.icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className={styles.kpiLabel}>{r.label}</span>
                <span className={styles.kpiValue} style={{ color: '#fff' }}>{r.value}</span>
              </div>
            </div>
            {r.streamTitle && <div style={{ fontSize: '0.85rem', color: 'var(--sf-text-2)', marginTop: '0.5rem' }}>{r.streamTitle}</div>}
            {r.date && <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)', marginTop: '0.25rem' }}>{new Date(r.date).toLocaleDateString()}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function GamesTab({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const [games, setGames] = useState<GamePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGames = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await apiGet(`/kpi/game-performance/${encodeURIComponent(channel)}`);
      if (res.ok) {
        const d = await res.json();
        setGames(d.games || []);
      }
    } catch {}
    setLoading(false);
  }, [channel]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await apiPost(`/kpi/game-performance/${encodeURIComponent(channel)}/refresh`, {});
      if (res.ok) {
        const d = await res.json();
        setGames(d.games || []);
      }
    } catch {}
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.gamesGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
             <SkeletonCard key={i} style={{ height: 160 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="sf-btn sf-btn-ghost"
          style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
        >
          {refreshing ? '⟳ Actualizando...' : '⟳ Actualizar desde VODs'}
        </button>
      </div>
      {games.length === 0 ? (
        <div className={styles.loading}>{t('kpi.noGamesData') || 'No hay datos de juegos para mostrar en este período.'}</div>
      ) : (
        <div className={styles.gamesGrid}>
          {games.map(g => (
            <div key={g.gameName} className={styles.gameCard}>
              <div className={styles.gameHeader}>
                {g.boxArtUrl && <img src={g.boxArtUrl} alt={g.gameName} className={styles.gameBoxArt} />}
                <div className={styles.gameTitleWrapper}>
                  <h4 className={styles.gameTitle}>{g.gameName}</h4>
                  <span className={styles.gameStreamCount}>{g.streamCount} {t('kpi.streamsCount') || 'streams'}</span>
                </div>
              </div>
              <div className={styles.gameStatsGrid}>
                <div className={styles.gameStat}>
                  <span className={styles.gameStatLabel}>{t('kpi.avgViewers') || 'Prom. Viewers'}</span>
                  <span className={styles.gameStatValue}>{formatNumber(g.avgViewers)}</span>
                </div>
                <div className={styles.gameStat}>
                  <span className={styles.gameStatLabel}>{t('kpi.maxViewers') || 'Max Viewers'}</span>
                  <span className={styles.gameStatValue}>{formatNumber(g.maxViewers)}</span>
                </div>
                <div className={styles.gameStat}>
                  <span className={styles.gameStatLabel}>{t('kpi.followersGained') || 'Nuevos Seguidores'}</span>
                  <span className={styles.gameStatValue} style={{ color: 'var(--sf-success)' }}>+{formatNumber(g.followersGained)}</span>
                </div>
                <div className={styles.gameStat}>
                  <span className={styles.gameStatLabel}>{t('kpi.avgDuration') || 'Duración Promedio'}</span>
                  <span className={styles.gameStatValue}>{formatDuration(g.avgDuration)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlotsTab({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<BestSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/kpi/best-slots/${encodeURIComponent(channel)}?period=all`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSlots(d.slots); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channel]);

  if (loading) {
    return (
      <div className={styles.tabContent}>
         <div className={styles.slotsGrid}>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} style={{ height: 40 }} />
            ))}
         </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return <div className={styles.loading}>{t('kpi.noSlotsData') || 'No hay suficientes datos para determinar los mejores horarios.'}</div>;
  }

  const maxAvg = Math.max(...slots.map(s => s.avgViewers), 1);

  return (
    <div className={styles.tabContent}>
      <p className={styles.slotsSubtitle}>{t('kpi.slotsSubtitle') || 'Basado en el promedio de viewers de streams anteriores:'}</p>
      <div className={styles.slotsGrid}>
        {slots.slice(0, 20).map((s, i) => (
          <div key={i} className={styles.slotBar}>
            <span className={styles.slotLabel}>{t(`kpi.days.${s.dayOfWeek}`) || s.dayOfWeek} {s.hourStart.toString().padStart(2, '0')}:00</span>
            <div className={styles.slotBarTrack}>
              <div className={styles.slotBarFill} style={{ width: `${(s.avgViewers / maxAvg) * 100}%` }} />
            </div>
            <span className={styles.slotValue}>{formatNumber(s.avgViewers)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopTwitchGamesTab() {
  const { t } = useTranslation();
  const [games, setGames] = useState<TwitchTopGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/kpi/top-twitch-games')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setGames(d.games); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.gamesGrid}>
          {Array.from({ length: 12 }).map((_, i) => (
             <SkeletonCard key={i} style={{ height: 160 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.gamesGrid}>
        {games.map((g, index) => (
          <div key={g.id} className={styles.gameCard}>
            <div className={styles.gameHeader}>
              {g.boxArtUrl && <img src={g.boxArtUrl} alt={g.name} className={styles.gameBoxArt} />}
              <div className={styles.gameTitleWrapper}>
                <h4 className={styles.gameTitle}>{index + 1}. {g.name}</h4>
              </div>
            </div>
            <div className={styles.gameStatsGrid} style={{ gridTemplateColumns: '1fr' }}>
              <div className={styles.gameStat}>
                <span className={styles.gameStatLabel}>{t('kpi.estimatedGlobalViewers') || 'Espectadores en vivo (Top 100)'}</span>
                <span className={styles.gameStatValue} style={{ color: 'var(--sf-success)' }}>{formatNumber(g.estimatedViewers)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiPanel({ channel }: Props) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('overview');

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'overview', label: t('kpi.subOverview') || 'Resumen' },
    { id: 'audience', label: t('kpi.subAudience') || 'Audiencia' },
    { id: 'chat', label: t('kpi.subChat') || 'Chat' },
    { id: 'summary', label: t('kpi.subSummary') || 'Resumen Post-Stream' },
    { id: 'records', label: t('kpi.subRecords') || 'Récords' },
    { id: 'games', label: t('kpi.subGames') || 'Por Juego' },
    { id: 'slots', label: t('kpi.subSlots') || 'Mejor Horario' },
    { id: 'topGames', label: t('kpi.subTopGames') || 'Top Espectadores' },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.subTabs}>
        {subTabs.map(st => (
          <button key={st.id} className={`${styles.subTab} ${subTab === st.id ? styles.subTabActive : ''}`} onClick={() => setSubTab(st.id)}>
            {st.label}
          </button>
        ))}
      </div>
      {subTab === 'overview' && <OverviewTab channel={channel} />}
      {subTab === 'audience' && <AudienceTab channel={channel} />}
      {subTab === 'chat' && <ChatStatsTab channel={channel} />}
      {subTab === 'summary' && <StreamSummaryTab channel={channel} />}
      {subTab === 'records' && <RecordsTab channel={channel} />}
      {subTab === 'games' && <GamesTab channel={channel} />}
      {subTab === 'slots' && <SlotsTab channel={channel} />}
      {subTab === 'topGames' && <TopTwitchGamesTab />}
    </div>
  );
}
