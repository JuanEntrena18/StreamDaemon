import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { motion } from 'framer-motion';

interface Props {
  channel: string;
  backendUrl?: string;
}

interface TrackerStats {
  period: string;
  channel: string;
  totalHoursStreamed: number;
  peakViewers: number;
  peakDate: string;
  totalFollowers: number;
  videoCount: number;
}

interface StreamDetail {
  videoId: string;
  title: string;
  creationDate: string;
  durationInSeconds: number;
  totalViews: number;
  url: string;
  thumbnailUrl: string;
  followersGained: number;
  subsGained: number;
  bitsDonated: number;
}

interface AdviceItem {
  type: 'tip' | 'warning' | 'achievement' | 'info';
  icon: string;
  title: string;
  description: string;
}

interface AdviceResponse {
  advice: AdviceItem[];
  metrics: Record<string, unknown>;
  ollamaAvailable: boolean;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatHours(h: number): string {
  if (h === 0) return '0';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function estimateRevenue(subs: number, bits: number): string {
  const revenue = subs * 2.49 + bits * 0.01;
  if (revenue === 0) return '—';
  return revenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const CHART_COLORS: Record<string, string> = {
  views: '#a78bfa',
  followers: '#f87171',
  duration: '#22d3ee',
};

function SvgBarChart({ data, dataKey, color }: {
  data: StreamDetail[];
  dataKey: 'totalViews' | 'followersGained' | 'durationInSeconds';
  color: string;
}) {
  if (data.length === 0) return null;
  const values = data.map((d) => d[dataKey]);
  const max = Math.max(...values, 1);
  const barCount = data.length;
  const barWidth = Math.max(12, Math.min(64, Math.max(400, window.innerWidth - 100) / barCount - 10));
  const gap = Math.max(6, Math.min(14, barWidth * 0.3));
  const padL = 4;
  const padR = 60;
  const labelPad = 34;
  const chartW = barCount * (barWidth + gap) + padL + padR;
  const chartH = 200;
  const plotH = chartH - labelPad;

  const formatVal = (v: number) => {
    if (dataKey === 'durationInSeconds') return formatDuration(v);
    return formatNumber(v);
  };

  return (
    <svg width={chartW} height={chartH} style={{ display: 'block', maxWidth: '100%', height: 'auto', minWidth: 300 }}>
      {data.map((d, i) => {
        const x = i * (barWidth + gap) + padL;
        const barHeight = (d[dataKey] / max) * plotH;
        const label = formatVal(d[dataKey]);
        return (
          <g key={d.videoId}>
            <motion.rect
              initial={{ height: 0, y: chartH }}
              animate={{ height: barHeight, y: chartH - barHeight - 8 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: 'easeOut' }}
              x={x}
              width={barWidth}
              rx={3}
              fill={color}
              opacity={0.85}
            />
            <motion.text
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.03 + 0.2 }}
              x={x + barWidth / 2}
              y={chartH - barHeight - 14}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="11"
              fontWeight={700}
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {label}
            </motion.text>
            <text
              x={x + barWidth / 2}
              y={chartH - 2}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {formatShortDate(d.creationDate)}
            </text>
            <title>{`${formatShortDate(d.creationDate)}: ${label}`}</title>
          </g>
        );
      })}
      {/* Max reference */}
      <text
        x={chartW - 6}
        y={14}
        textAnchor="end"
        fill="#64748b"
        fontSize="10"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        máx: {formatVal(max)}
      </text>
      {/* Baseline */}
      <line x1={0} y1={chartH - 8} x2={chartW} y2={chartH - 8} stroke="#334155" strokeWidth={1} />
    </svg>
  );
}

const ADVICE_TYPE_STYLES: Record<string, { border: string; bg: string; iconBg: string }> = {
  tip: {
    border: 'rgba(6,182,212,0.2)',
    bg: 'rgba(6,182,212,0.05)',
    iconBg: 'rgba(6,182,212,0.12)',
  },
  warning: {
    border: 'rgba(245,158,11,0.2)',
    bg: 'rgba(245,158,11,0.05)',
    iconBg: 'rgba(245,158,11,0.12)',
  },
  achievement: {
    border: 'rgba(52,211,153,0.2)',
    bg: 'rgba(52,211,153,0.05)',
    iconBg: 'rgba(52,211,153,0.12)',
  },
  info: {
    border: 'rgba(124,58,237,0.2)',
    bg: 'rgba(124,58,237,0.05)',
    iconBg: 'rgba(124,58,237,0.12)',
  },
};

export function TrackerPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const PERIODS = [
    { id: '7d', label: t('tracker.period7d') },
    { id: '30d', label: t('tracker.period30d') },
    { id: '90d', label: t('tracker.period90d') },
    { id: 'all', label: 'All time' },
  ];
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [streams, setStreams] = useState<StreamDetail[]>([]);
  const [advice, setAdvice] = useState<AdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedStream, setExpandedStream] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'totalViews' | 'followersGained' | 'durationInSeconds'>('totalViews');
  const baseUrl = backendUrl || 'http://localhost:3000';

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ period, channel });
    Promise.all([
      fetch(`${baseUrl}/tracker/stats?${params}`).then((r) => {
        if (!r.ok) throw new Error('Error al obtener estadísticas');
        return r.json();
      }),
      fetch(`${baseUrl}/tracker/streams?${params}`).then((r) => {
        if (!r.ok) throw new Error('Error al obtener streams');
        return r.json();
      }),
      fetch(`${baseUrl}/tracker/advice?${params}`).then((r) => {
        if (!r.ok) throw new Error('Error al obtener consejos');
        return r.json();
      }),
    ])
      .then(([statsData, streamsData, adviceData]) => {
        setStats(statsData);
        setStreams(streamsData.streams ?? []);
        setAdvice(adviceData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [channel, period, baseUrl]);

  const noData = stats && stats.videoCount === 0;
  const lastStream = streams[0];
  const chartColor = CHART_COLORS[chartMetric === 'totalViews' ? 'views' : chartMetric === 'followersGained' ? 'followers' : 'duration'] ?? '#a78bfa';

  const chartLabel = chartMetric === 'totalViews' ? t('tracker.metricViews') :
    chartMetric === 'followersGained' ? t('tracker.metricFollowers') : t('tracker.metricDuration');

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {t('tracker.title')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          {t('tracker.subtitle')}
        </p>
      </div>

      {/* Period selector */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
          {t('tracker.periodo')}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 99,
                border: '1px solid',
                borderColor: period === p.id ? 'var(--sf-primary)' : 'var(--sf-border)',
                background: period === p.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: period === p.id ? '#a78bfa' : 'var(--sf-text-3)',
                fontSize: '0.78rem',
                fontWeight: period === p.id ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--sf-text-3)', fontSize: '0.9rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>⏳</div>
          {t('tracker.cargando')}
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem 1.25rem', marginBottom: '1.25rem',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--sf-radius-sm)', fontSize: '0.82rem', color: '#f87171',
        }}>
          {error === 'Error al obtener estadísticas'
            ? t('tracker.error')
            : error}
        </div>
      )}

      {noData && !loading && (
        <div style={{
          padding: '2rem', textAlign: 'center',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 'var(--sf-radius)', fontSize: '0.85rem', color: 'var(--sf-text-2)',
          marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
          {t('tracker.empty')}
        </div>
      )}

      {/* Stats cards */}
      {stats && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏱️</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.2rem' }}>
              {formatHours(stats.totalHoursStreamed)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('tracker.horasStreameadas')}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-4)', marginTop: '0.3rem' }}>
              {stats.videoCount} {stats.videoCount === 1 ? t('tracker.directo') : t('tracker.directos')}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.2rem' }}>
              {stats.peakViewers.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('tracker.picoEspectadores')}
            </div>
            {stats.peakDate && (
              <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-4)', marginTop: '0.3rem' }}>
                {formatDate(stats.peakDate)}
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>❤️</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.2rem' }}>
              {stats.totalFollowers.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('tracker.seguidoresTotales')}
            </div>
          </div>
        </div>
      )}

      {/* ── Last stream summary ── */}
      {lastStream && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t('tracker.ultimoStream')}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)' }}>
              {lastStream.title} · {formatDate(lastStream.creationDate)} · {formatDuration(lastStream.durationInSeconds)}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="glass-card" style={{ padding: '0.875rem 1rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.08))', border: '1px solid rgba(124,58,237,0.15)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--sf-text)' }}>
                {formatNumber(lastStream.totalViews)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                {t('tracker.visualizaciones')}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--sf-text)' }}>
                +{lastStream.followersGained}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                {t('tracker.seguidores')}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--sf-text)' }}>
                {lastStream.subsGained > 0 ? '+' : ''}{lastStream.subsGained}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                {t('tracker.suscripciones')}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--sf-text)' }}>
                {lastStream.bitsDonated > 0 ? '+' : ''}{lastStream.bitsDonated}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                {t('tracker.bits')}
              </div>
            </div>
          </div>

          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.15)',
            borderRadius: 'var(--sf-radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
          }}>
            <span style={{ color: 'var(--sf-text-2)' }}>
              {t('tracker.ingresosEstimados')}
            </span>
            <span style={{ fontWeight: 700, color: '#34d399' }}>
              {estimateRevenue(lastStream.subsGained, lastStream.bitsDonated)}
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Charts ── */}
      {streams.length > 1 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="glass-card"
          style={{ padding: '1.25rem', marginBottom: '2rem', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t('tracker.evolucion')}
              <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--sf-text-3)' }}>
                — {chartLabel}
              </span>
            </h3>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {(['totalViews', 'followersGained', 'durationInSeconds'] as const).map((key) => {
                const lbl = key === 'totalViews' ? t('tracker.metricViews') : key === 'followersGained' ? t('tracker.metricFollowers') : t('tracker.metricDuration');
                const c = CHART_COLORS[key === 'totalViews' ? 'views' : key === 'followersGained' ? 'followers' : 'duration'];
                return (
                  <button
                    key={key}
                    onClick={() => setChartMetric(key)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: chartMetric === key ? c : 'var(--sf-border)',
                      background: chartMetric === key ? `${c}20` : 'transparent',
                      color: chartMetric === key ? c : 'var(--sf-text-3)',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: chartMetric === key ? 600 : 400,
                    }}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <SvgBarChart data={streams} dataKey={chartMetric} color={chartColor} />
          </div>
        </motion.div>
      )}

      {/* ── Advice ── */}
      {advice && advice.advice.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          style={{ marginBottom: '2rem' }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t('tracker.consejos')}
            {advice.ollamaAvailable && (
              <span style={{
                fontSize: '0.6rem', padding: '0.15rem 0.4rem',
                background: 'rgba(52,211,153,0.12)', color: '#34d399',
                borderRadius: 4, fontWeight: 600, letterSpacing: '0.03em',
              }}>
                {t('tracker.ia')}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {advice.advice.map((item, idx) => {
              const style = ADVICE_TYPE_STYLES[item.type] ?? ADVICE_TYPE_STYLES.info;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '0.875rem 1rem',
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    borderRadius: 'var(--sf-radius-sm)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: style.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.15rem' }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', lineHeight: 1.5 }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Recent streams ── */}
      {streams.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--sf-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t('tracker.streamsRecientes')}
            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--sf-text-3)' }}>
              ({streams.length} {streams.length === 1 ? t('tracker.stream') : t('tracker.streams')})
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {streams.map((s, idx) => {
              const isExpanded = expandedStream === s.videoId;
              return (
                <div key={s.videoId}>
                  <div
                    onClick={() => setExpandedStream(isExpanded ? null : s.videoId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: isExpanded
                        ? 'rgba(124,58,237,0.08)'
                        : idx === 0
                          ? 'rgba(124,58,237,0.04)'
                          : 'rgba(255,255,255,0.02)',
                      borderRadius: isExpanded
                        ? 'var(--sf-radius-sm) var(--sf-radius-sm) 0 0'
                        : 'var(--sf-radius-sm)',
                      border: '1px solid',
                      borderColor: isExpanded
                        ? 'var(--sf-primary)'
                        : 'var(--sf-border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: 'rgba(124,58,237,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', flexShrink: 0,
                    }}>
                      {idx === 0 ? '⭐' : '🎬'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--sf-text-3)', marginTop: '0.15rem' }}>
                        {formatDateTime(s.creationDate)} · {formatDuration(s.durationInSeconds)} · {formatNumber(s.totalViews)} {t('tracker.visualizaciones')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                      {s.followersGained > 0 && (
                        <span style={{ fontSize: '0.72rem', color: '#f87171' }}>+{s.followersGained} ❤️</span>
                      )}
                      {s.subsGained > 0 && (
                        <span style={{ fontSize: '0.72rem', color: '#a78bfa' }}>+{s.subsGained} ⭐</span>
                      )}
                      {s.bitsDonated > 0 && (
                        <span style={{ fontSize: '0.72rem', color: '#fbbf24' }}>+{s.bitsDonated} 💎</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      ▼
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{
                      padding: '1rem 1.25rem',
                      background: 'rgba(124,58,237,0.02)',
                      border: '1px solid var(--sf-primary)',
                      borderTop: 'none',
                      borderRadius: '0 0 var(--sf-radius-sm) var(--sf-radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                            {t('tracker.seguidores')}
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--sf-text)' }}>
                            {s.followersGained > 0 ? `+${s.followersGained}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                            {t('tracker.suscripciones')}
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--sf-text)' }}>
                            {s.subsGained > 0 ? `+${s.subsGained}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                            {t('tracker.bits')}
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--sf-text)' }}>
                            {s.bitsDonated > 0 ? `+${s.bitsDonated}` : '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                            {t('tracker.duracion')}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sf-text)' }}>
                            {formatDuration(s.durationInSeconds)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                            {t('tracker.views')}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sf-text)' }}>
                            {s.totalViews.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                            {t('tracker.ingresosEst')}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#34d399' }}>
                            {estimateRevenue(s.subsGained, s.bitsDonated)}
                          </div>
                        </div>
                      </div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.75rem', color: 'var(--sf-primary-light)',
                          textDecoration: 'none', marginTop: '0.25rem',
                        }}
                      >
                        {t('tracker.verVod')}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}