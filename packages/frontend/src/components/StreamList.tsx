import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import { formatDateTime, formatDuration, formatNumber, estimateRevenue, type StreamDetail } from '../utils/trackerUtils';
import styles from './StreamList.module.css';

interface Props {
  streams: StreamDetail[];
  expandedStream: string | null;
  onToggleExpand: (id: string) => void;
}

export function StreamList({ streams, expandedStream, onToggleExpand }: Props) {
  const { t } = useTranslation();
  if (streams.length === 0) return null;

  return (
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
                onClick={() => onToggleExpand(s.videoId)}
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
  );
}
