import { useCallback, useEffect, useState } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { apiGet } from '../utils/api';
import { useTranslation } from '../i18n/context';
import type { KpiOverview, ViewerSnapshot, GamePerformance, BestSlot, ChannelRaidEvent } from '@streamforger/shared';
import styles from './KpiPanel.module.css';

type SubTab = 'overview' | 'audience' | 'games' | 'slots';

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

function MiniChart({ data, color = '#6366f1' }: { data: ViewerSnapshot[]; color?: string }) {
  if (data.length < 2) return <div className={styles.chartEmpty}>Esperando datos...</div>;
  const values = data.map(d => d.viewers);
  const max = Math.max(...values, 1);
  const w = 400;
  const h = 100;
  const stepX = w / (values.length - 1);
  const points = values.map((v, i) => `${i * stepX},${h - (v / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.chartSvg} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      <path d={`M0,${h} ${points} ${w},${h}Z`} fill={color} fillOpacity="0.1" />
    </svg>
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

  if (loading) return <div className={styles.loading}>Cargando...</div>;
  if (!data) return <div className={styles.loading}>Seleccioná un período</div>;

  const cards = [
    { label: t('kpi.avgViewers'), value: formatNumber(data.avgViewers) },
    { label: t('kpi.peakViewers'), value: formatNumber(data.peakViewers) },
    { label: t('kpi.followersGained'), value: formatNumber(data.followersGained) },
    { label: t('kpi.subsGained'), value: formatNumber(data.subsGained) },
    { label: t('kpi.bitsDonated'), value: formatNumber(data.bitsDonated) },
    { label: t('kpi.estimatedRevenue'), value: formatCurrency(data.estimatedRevenue) },
    { label: t('kpi.totalViews'), value: formatNumber(data.totalViews) },
    { label: t('kpi.totalHours'), value: data.totalHoursStreamed.toFixed(1) + 'h' },
    { label: t('kpi.streams'), value: data.streamsThisPeriod.toString() },
  ];

  return (
    <div className={styles.tabContent}>
      <div className={styles.periodBar}>
        <span>{t('kpi.period')}:</span>
        {['7d', '30d', '90d', 'all'].map(p => (
          <button key={p} className={`${styles.periodBtn} ${period === p ? styles.active : ''}`} onClick={() => setPeriod(p)}>
            {t(`kpi.period${p}`)}
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
          <h3>{t('kpi.recentRaids')}</h3>
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

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await apiGet(`/kpi/viewers-history/${encodeURIComponent(channel)}`);
        if (res.ok) {
          const d = await res.json();
          setSnapshots(d.snapshots);
          setActive(d.activeViewers);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [channel]);

  return (
    <div className={styles.tabContent}>
      <div className={styles.audienceHeader}>
        <span className={styles.activeViewers}>{t('kpi.activeViewers')}: <strong>{active}</strong></span>
        <span className={styles.snapshotCount}>{snapshots.length} {t('kpi.snapshots')}</span>
      </div>
      <div className={styles.chartContainer}>
        <MiniChart data={snapshots} />
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

  if (loading) return <div className={styles.loading}>Cargando...</div>;

  return (
    <div className={styles.tabContent}>
      <table className={styles.gameTable}>
        <thead>
          <tr>
            <th>{t('kpi.game')}</th>
            <th>{t('kpi.streams')}</th>
            <th>{t('kpi.avgViewers')}</th>
            <th>{t('kpi.maxViewers')}</th>
            <th>{t('kpi.followersGained')}</th>
            <th>{t('kpi.avgDuration')}</th>
          </tr>
        </thead>
        <tbody>
          {games.map(g => (
            <tr key={g.gameName}>
              <td>{g.gameName}</td>
              <td>{g.streamCount}</td>
              <td>{formatNumber(g.avgViewers)}</td>
              <td>{formatNumber(g.maxViewers)}</td>
              <td>{formatNumber(g.followersGained)}</td>
              <td>{formatDuration(g.avgDuration)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlotsTab({ channel }: { channel: string }) {
  const [slots, setSlots] = useState<BestSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/kpi/best-slots/${encodeURIComponent(channel)}?period=all`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSlots(d.slots); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channel]);

  if (loading) return <div className={styles.loading}>Cargando...</div>;

  const maxAvg = Math.max(...slots.map(s => s.avgViewers), 1);

  return (
    <div className={styles.tabContent}>
      <div className={styles.slotsGrid}>
        {slots.slice(0, 20).map((s, i) => (
          <div key={i} className={styles.slotBar}>
            <span className={styles.slotLabel}>{DAY_NAMES[s.dayOfWeek]} {s.hourStart}:00</span>
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

export function KpiPanel({ channel }: Props) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('overview');

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'overview', label: t('kpi.subOverview') },
    { id: 'audience', label: t('kpi.subAudience') },
    { id: 'games', label: t('kpi.subGames') },
    { id: 'slots', label: t('kpi.subSlots') },
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
    </div>
  );
}
