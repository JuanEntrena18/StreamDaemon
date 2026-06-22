import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { SkeletonText, SkeletonCard } from './Skeletons';
import styles from './AchievementsPanel.module.css';

interface AchievementsData {
  userId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
  viewCount: number | null;
  followers: number | null;
  twitchAchievementsUrl: string;
}

interface Props {
  channel: string;
  backendUrl: string;
}

export function AchievementsPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    setError('');
    fetch(`${backendUrl}/achievements`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          const msg = d.details ? `${d.error}: ${JSON.stringify(d.details)}` : d.error;
          setError(msg);
          setData(null);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => { setError('Connection error'); setLoading(false); });
  }, [channel, backendUrl]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.titleRow}>
          <SkeletonText width={200} height={32} />
        </div>
        <SkeletonText width={150} height={16} className={styles.subtitle} />
        <SkeletonCard style={{ minHeight: 180, marginBottom: '1rem' }} />
        <SkeletonCard style={{ minHeight: 100 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>{t('achievements.title')}</h2>
        <p className={styles.errorMsg}>{error}</p>
        <p className={styles.errorHint}>{t('achievements.authHint')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyContainer}>
        <h2>{t('achievements.title')}</h2>
        <p>{t('achievements.noData')}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h2 style={{ margin: 0 }}>{t('achievements.title')}</h2>
        {data.avatarUrl && (
          <img src={data.avatarUrl} alt="" className={styles.avatar} />
        )}
        <span className={styles.displayName}>{data.displayName}</span>
      </div>
      <p className={styles.subtitle}>{t('achievements.subtitle')}</p>

      <div className={`sf-card ${styles.sectionCard}`}>
        <h3 className={styles.sectionTitle}>{t('achievements.pathToAffiliate')}</h3>
        <div className={styles.metricsList}>
          <MetricRow label={t('achievements.followers')} current={data.followers ?? 0} goal={50} />
          <MetricRow label={t('achievements.viewCount')} current={data.viewCount ?? 0} goal={50000} />
        </div>
      </div>

      <div className={styles.twitchCard}>
        <p className={styles.twitchCardText}>
          {t('achievements.apiNote')}
        </p>
        <a
          href={data.twitchAchievementsUrl}
          target="_blank"
          rel="noreferrer"
          className={`sf-btn ${styles.twitchBtn}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
          </svg>
          {t('achievements.viewOnTwitch')}
        </a>
      </div>
    </div>
  );
}

function MetricRow({ label, current, goal }: { label: string; current: number; goal: number }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const done = current >= goal && goal > 0;
  return (
    <div>
      <div className={styles.metricRow}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricValue}>{current.toLocaleString()} / {goal.toLocaleString()}</span>
      </div>
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${done ? styles['progressFill--done'] : styles['progressFill--progress']}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
