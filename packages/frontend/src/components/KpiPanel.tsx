import { useCallback, useEffect, useState } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { apiGet, apiPost } from '../utils/api';
import { useTranslation } from '../i18n/context';
import type { KpiOverview, ViewerSnapshot, GamePerformance, BestSlot, ChannelRaidEvent, TwitchTopGame } from '@streamforger/shared';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SkeletonCard } from './Skeletons';
import styles from './KpiPanel.module.css';

type SubTab = 'overview' | 'audience' | 'games' | 'slots' | 'topGames';

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

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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
  if (!data) return <div className={styles.loading}>Seleccioná un período</div>;

  const cards = [
    { label: t('kpi.avgViewers') || 'Promedio Viewers', value: formatNumber(data.avgViewers) },
    { label: t('kpi.peakViewers') || 'Pico Viewers', value: formatNumber(data.peakViewers) },
    { label: t('kpi.followersGained') || 'Nuevos Seguidores', value: formatNumber(data.followersGained) },
    { label: t('kpi.subsGained') || 'Nuevas Subs', value: formatNumber(data.subsGained) },
    { label: t('kpi.bitsDonated') || 'Bits Donados', value: formatNumber(data.bitsDonated) },
    { label: t('kpi.estimatedRevenue') || 'Ingresos Estimados', value: formatCurrency(data.estimatedRevenue) },
    { label: t('kpi.totalViews') || 'Vistas Totales', value: formatNumber(data.totalViews) },
    { label: t('kpi.totalHours') || 'Horas Transmitidas', value: data.totalHoursStreamed.toFixed(1) + 'h' },
    { label: t('kpi.streams') || 'Streams', value: data.streamsThisPeriod.toString() },
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
            <span className={styles.kpiLabel}>{c.label}</span>
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
  const [active, setActive] = useState(0);

  // Auto-start HUD polling so viewer snapshots are collected for the graph
  useEffect(() => {
    if (!channel) return;
    apiPost('/hud/start-poll', { channel, interval: 15 }).catch(() => {});
    // Don't stop the poll on unmount — other panels may depend on it
  }, [channel]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiGet(`/kpi/viewers-history/${encodeURIComponent(channel)}`);
        if (res.ok) {
          const d = await res.json();
          setSnapshots(d.snapshots);
          setActive(d.activeViewers);
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
  }));

  return (
    <div className={styles.tabContent}>
      <div className={styles.audienceHeader}>
        <span className={styles.activeViewers}>{t('kpi.activeViewers') || 'Viewers Activos'}: <strong>{active}</strong></span>
        <span className={styles.snapshotCount}>{snapshots.length} {t('kpi.snapshots') || 'registros'}</span>
      </div>
      <div className={styles.chartContainer}>
        {snapshots.length < 2 ? (
          <div className={styles.chartEmpty}>{t('kpi.waitingData') || 'Esperando más datos para mostrar la gráfica...'}</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-border)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--sf-text-2)" fontSize={12} tickMargin={10} minTickGap={30} />
              <YAxis stroke="var(--sf-text-2)" fontSize={12} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--sf-bg)', border: '1px solid var(--sf-border)', borderRadius: '8px', color: 'var(--sf-text)' }}
                itemStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line type="monotone" name={t('kpi.viewers') || 'Viewers'} dataKey="viewers" stroke="var(--sf-primary)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              <Line type="monotone" name={t('kpi.chatters') || 'Chatters'} dataKey="chatters" stroke="var(--sf-success)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function GamesTab({ channel }: { channel: string }) {
  const { t } = useTranslation();
  const [games, setGames] = useState<GamePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/kpi/game-performance/${encodeURIComponent(channel)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setGames(d.games); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channel]);

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

  if (games.length === 0) {
    return <div className={styles.loading}>{t('kpi.noGamesData') || 'No hay datos de juegos para mostrar en este período.'}</div>;
  }

  return (
    <div className={styles.tabContent}>
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
            <span className={styles.slotLabel}>{DAY_NAMES[s.dayOfWeek]} {s.hourStart.toString().padStart(2, '0')}:00</span>
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
      {subTab === 'games' && <GamesTab channel={channel} />}
      {subTab === 'slots' && <SlotsTab channel={channel} />}
      {subTab === 'topGames' && <TopTwitchGamesTab />}
    </div>
  );
}
