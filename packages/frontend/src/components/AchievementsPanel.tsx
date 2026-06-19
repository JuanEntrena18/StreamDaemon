import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';

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
    return <div style={{ maxWidth: 700 }}><h2>{t('achievements.title')}</h2><p>{t('common.loading')}</p></div>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 700 }}>
        <h2>{t('achievements.title')}</h2>
        <p style={{ color: 'var(--sf-danger)' }}>{error}</p>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.85rem' }}>{t('achievements.authHint')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ maxWidth: 700 }}>
        <h2>{t('achievements.title')}</h2>
        <p>{t('achievements.noData')}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <h2 style={{ margin: 0 }}>{t('achievements.title')}</h2>
        {data.avatarUrl && (
          <img src={data.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
        )}
        <span style={{ fontSize: '0.9rem', color: 'var(--sf-text-2)' }}>{data.displayName}</span>
      </div>
      <p style={{ marginBottom: '1.5rem', color: 'var(--sf-text-2)' }}>{t('achievements.subtitle')}</p>

      <div className="sf-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>{t('achievements.pathToAffiliate')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <MetricRow label={t('achievements.followers')} current={data.followers ?? 0} goal={50} />
          <MetricRow label={t('achievements.viewCount')} current={data.viewCount ?? 0} goal={50000} />
        </div>
      </div>

      <div className="sf-card" style={{ padding: '1.5rem', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-2)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          {t('achievements.apiNote')}
        </p>
        <a
          href={data.twitchAchievementsUrl}
          target="_blank"
          rel="noreferrer"
          className="sf-btn"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'linear-gradient(135deg, #9147ff 0%, #6441a5 100%)',
            color: '#fff', padding: '0.6rem 1.25rem', textDecoration: 'none',
            fontSize: '0.85rem', fontWeight: 600,
            boxShadow: '0 2px 12px rgba(145,71,255,0.35)',
          }}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--sf-text-2)' }}>{label}</span>
        <span style={{ color: 'var(--sf-text)', fontWeight: 600 }}>{current.toLocaleString()} / {goal.toLocaleString()}</span>
      </div>
      <div style={{ height: 8, background: 'var(--sf-border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: done
            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
            : 'linear-gradient(90deg, var(--sf-primary), #6366f1)',
          borderRadius: 99, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}
