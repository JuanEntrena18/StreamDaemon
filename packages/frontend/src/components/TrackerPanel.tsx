import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { motion } from 'framer-motion';
import { EmptyState } from './EmptyState';
import styles from './TrackerPanel.module.css';

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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={`sf-heading flex-row flex-row--gap-sm ${styles.heading}`}>
          {t('tracker.title')}
        </h2>
        <p className="text-muted text-sm">
          {t('tracker.subtitle')}
        </p>
      </div>

      {/* Period selector */}
      <div className={`glass-card ${styles.periodBar}`}>
        <span className={styles.periodLabel}>
          {t('tracker.periodo')}
        </span>
        <div className="flex-wrap flex-wrap--sm">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={styles.periodBtnBase}
              style={{
                borderColor: period === p.id ? 'var(--sf-primary)' : 'var(--sf-border)',
                background: period === p.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: period === p.id ? '#a78bfa' : 'var(--sf-text-3)',
                fontWeight: period === p.id ? 600 : 400,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.loadingIcon}>⏳</div>
          {t('tracker.cargando')}
        </div>
      )}

      {error && (
        <div className={styles.errorBox}>
          {error === 'Error al obtener estadísticas'
            ? t('tracker.error')
            : error}
        </div>
      )}

      {!channel && !loading ? (
        <div style={{ marginTop: '2rem' }}>
          <EmptyState 
            icon="📊"
            title={t('tracker.emptyStateTitle') || 'Conecta tu cuenta de Twitch'}
            description={t('tracker.emptyStateDesc') || 'Vincula tu canal para ver tus estadísticas en tiempo real y recibir consejos de IA personalizados sobre tu stream.'}
            actionLabel={t('tracker.emptyStateBtn') || 'Ir a Configuración'}
            onAction={() => window.dispatchEvent(new CustomEvent('navigateTab', { detail: 'config' }))}
          />
        </div>
      ) : noData && !loading ? (
        <div style={{ marginTop: '2rem' }}>
          <EmptyState 
            icon="📭"
            title={t('tracker.emptyDataTitle') || 'Sin datos recientes'}
            description={t('tracker.empty') || 'No se han encontrado datos de transmisiones para el período seleccionado. ¡Haz un stream pronto!'}
          />
        </div>
      ) : null}

      {/* Stats cards */}
      {stats && !loading && (
        <div className={styles.statsGrid}>
          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div className={styles.statIcon}>⏱️</div>
            <div className={styles.statNumber}>
              {formatHours(stats.totalHoursStreamed)}
            </div>
            <div className="sf-caption">
              {t('tracker.horasStreameadas')}
            </div>
            <div className={styles.statSubtext}>
              {stats.videoCount} {stats.videoCount === 1 ? t('tracker.directo') : t('tracker.directos')}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statNumber}>
              {stats.peakViewers.toLocaleString()}
            </div>
            <div className="sf-caption">
              {t('tracker.picoEspectadores')}
            </div>
            {stats.peakDate && (
              <div className={styles.statSubtext}>
                {formatDate(stats.peakDate)}
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div className={styles.statIcon}>❤️</div>
            <div className={styles.statNumber}>
              {stats.totalFollowers.toLocaleString()}
            </div>
            <div className="sf-caption">
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
          className={styles.lastStreamSection}
        >
          <div className={styles.lastStreamHeader}>
            <h3 className={styles.lastStreamTitle}>
              {t('tracker.ultimoStream')}
            </h3>
            <p className={styles.lastStreamMeta}>
              {lastStream.title} · {formatDate(lastStream.creationDate)} · {formatDuration(lastStream.durationInSeconds)}
            </p>
          </div>

          <div className={styles.miniStatGrid}>
            <div className={`glass-card ${styles.highlightedCard}`} style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div className={styles.miniStatValue}>
                {formatNumber(lastStream.totalViews)}
              </div>
              <div className="sf-caption mt-2">
                {t('tracker.visualizaciones')}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div className={styles.miniStatValue}>
                +{lastStream.followersGained}
              </div>
              <div className="sf-caption mt-2">
                {t('tracker.seguidores')}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div className={styles.miniStatValue}>
                {lastStream.subsGained > 0 ? '+' : ''}{lastStream.subsGained}
              </div>
              <div className="sf-caption mt-2">
                {t('tracker.suscripciones')}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div className={styles.miniStatValue}>
                {lastStream.bitsDonated > 0 ? '+' : ''}{lastStream.bitsDonated}
              </div>
              <div className="sf-caption mt-2">
                {t('tracker.bits')}
              </div>
            </div>
          </div>

          <div className={styles.revenueBox}>
            <span className={styles.revenueLabel}>
              {t('tracker.ingresosEstimados')}
            </span>
            <span className={styles.revenueValue}>
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
          className={`glass-card ${styles.chartCard}`}
        >
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>
              {t('tracker.evolucion')}
              <span className={styles.chartTitleHint}>
                — {chartLabel}
              </span>
            </h3>
            <div className={styles.chartBtnGroup}>
              {(['totalViews', 'followersGained', 'durationInSeconds'] as const).map((key) => {
                const lbl = key === 'totalViews' ? t('tracker.metricViews') : key === 'followersGained' ? t('tracker.metricFollowers') : t('tracker.metricDuration');
                const c = CHART_COLORS[key === 'totalViews' ? 'views' : key === 'followersGained' ? 'followers' : 'duration'];
                return (
                  <button
                    key={key}
                    onClick={() => setChartMetric(key)}
                    className={styles.chartBtnBase}
                    style={{
                      borderColor: chartMetric === key ? c : 'var(--sf-border)',
                      background: chartMetric === key ? `${c}20` : 'transparent',
                      color: chartMetric === key ? c : 'var(--sf-text-3)',
                      fontWeight: chartMetric === key ? 600 : 400,
                    }}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.chartScroll}>
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
          className={styles.adviceSection}
        >
          <h3 className={styles.adviceTitle}>
            {t('tracker.consejos')}
            {advice.ollamaAvailable && (
              <span className={styles.iaBadge}>
                {t('tracker.ia')}
              </span>
            )}
          </h3>
          <div className={styles.adviceList}>
            {advice.advice.map((item, idx) => {
              const s = ADVICE_TYPE_STYLES[item.type] ?? ADVICE_TYPE_STYLES.info;
              return (
                <div
                  key={idx}
                  className={styles.adviceCard}
                  style={{
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                  }}
                >
                  <div className={styles.adviceIconBox} style={{ background: s.iconBg }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className={styles.adviceTextTitle}>
                      {item.title}
                    </p>
                    <p className={styles.adviceTextDesc}>
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
          <h3 className={styles.streamsTitle}>
            {t('tracker.streamsRecientes')}
            <span className={styles.streamCount}>
              ({streams.length} {streams.length === 1 ? t('tracker.stream') : t('tracker.streams')})
            </span>
          </h3>

          <div className={styles.streamList}>
            {streams.map((s, idx) => {
              const isExpanded = expandedStream === s.videoId;
              return (
                <div key={s.videoId}>
                  <div
                    onClick={() => setExpandedStream(isExpanded ? null : s.videoId)}
                    className={styles.streamItem}
                    style={{
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
                    }}
                  >
                    <div className={styles.streamIconBox}>
                      {idx === 0 ? '⭐' : '🎬'}
                    </div>
                    <div className={styles.streamInfo}>
                      <div className={styles.streamTitle}>
                        {s.title}
                      </div>
                      <div className={styles.streamMeta}>
                        {formatDateTime(s.creationDate)} · {formatDuration(s.durationInSeconds)} · {formatNumber(s.totalViews)} {t('tracker.visualizaciones')}
                      </div>
                    </div>
                    <div className={styles.streamGains}>
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
                    <span className={styles.streamArrow} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      ▼
                    </span>
                  </div>

                  {isExpanded && (
                    <div className={styles.expandedDetails}>
                      <div className={styles.detailGrid}>
                        <div>
                          <div className={styles.detailLabel}>
                            {t('tracker.seguidores')}
                          </div>
                          <div className={styles.detailValue}>
                            {s.followersGained > 0 ? `+${s.followersGained}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className={styles.detailLabel}>
                            {t('tracker.suscripciones')}
                          </div>
                          <div className={styles.detailValue}>
                            {s.subsGained > 0 ? `+${s.subsGained}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className={styles.detailLabel}>
                            {t('tracker.bits')}
                          </div>
                          <div className={styles.detailValue}>
                            {s.bitsDonated > 0 ? `+${s.bitsDonated}` : '—'}
                          </div>
                        </div>
                      </div>
                      <div className={styles.detailRow}>
                        <div>
                          <div className={styles.detailLabel}>
                            {t('tracker.duracion')}
                          </div>
                          <div className={styles.detailSmallValue}>
                            {formatDuration(s.durationInSeconds)}
                          </div>
                        </div>
                        <div>
                          <div className={styles.detailLabel}>
                            {t('tracker.views')}
                          </div>
                          <div className={styles.detailSmallValue}>
                            {s.totalViews.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className={styles.detailLabel}>
                            {t('tracker.ingresosEst')}
                          </div>
                          <div className={styles.detailRevenueValue}>
                            {estimateRevenue(s.subsGained, s.bitsDonated)}
                          </div>
                        </div>
                      </div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.vodLink}
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
