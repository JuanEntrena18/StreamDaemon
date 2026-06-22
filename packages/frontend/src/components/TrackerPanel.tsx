import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { motion } from 'framer-motion';
import { EmptyState } from './EmptyState';
import { TrackerChart } from './TrackerChart';
import { SkeletonCard, SkeletonChart } from './Skeletons';
import { TrackerAdvice } from './TrackerAdvice';
import { apiGet } from '../utils/api';
import { StreamList } from './StreamList';
import { formatDate, formatHours, formatDuration, formatNumber, estimateRevenue, type StreamDetail } from '../utils/trackerUtils';
import styles from './TrackerPanel.module.css';

interface Props {
  channel: string;
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

const CHART_COLORS: Record<string, string> = {
  views: '#a78bfa',
  followers: '#f87171',
  duration: '#22d3ee',
};

export function TrackerPanel({ channel }: Props) {
  const { t, dateLocale } = useTranslation();
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
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ period, channel });
    Promise.all([
      apiGet(`/tracker/stats?${params}`).then((r) => {
        if (!r.ok) throw new Error('Error al obtener estadísticas');
        return r.json();
      }),
      apiGet(`/tracker/streams?${params}`).then((r) => {
        if (!r.ok) throw new Error('Error al obtener streams');
        return r.json();
      }),
      apiGet(`/tracker/advice?${params}`).then((r) => {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div className={styles.statsGrid}>
            <SkeletonCard style={{ minHeight: '130px' }} />
            <SkeletonCard style={{ minHeight: '130px' }} />
            <SkeletonCard style={{ minHeight: '130px' }} />
          </div>
          <SkeletonCard style={{ minHeight: '200px' }} />
          <SkeletonChart height={280} />
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
                {formatDate(stats.peakDate, dateLocale)}
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
              {lastStream.title} · {formatDate(lastStream.creationDate, dateLocale)} · {formatDuration(lastStream.durationInSeconds)}
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
              {estimateRevenue(lastStream.subsGained, lastStream.bitsDonated, dateLocale)}
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
            <TrackerChart data={streams} dataKey={chartMetric} color={chartColor} />
          </div>
        </motion.div>
      )}

      {advice && (
        <TrackerAdvice advice={advice.advice} ollamaAvailable={advice.ollamaAvailable} />
      )}

      <StreamList
        streams={streams}
        expandedStream={expandedStream}
        onToggleExpand={(id) => setExpandedStream(expandedStream === id ? null : id)}
      />
    </div>
  );
}
