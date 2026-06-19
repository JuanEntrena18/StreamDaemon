import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import type { AchievementsResponse } from '@streamforger/shared';

interface Props {
  channel: string;
  backendUrl: string;
}

export function AchievementsPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    setError('');
    fetch(`${backendUrl}/achievements`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setData(null); }
        else { setData(d); }
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

  if (!data?.quests) {
    return (
      <div style={{ maxWidth: 700 }}>
        <h2>{t('achievements.title')}</h2>
        <p>{t('achievements.noData')}</p>
      </div>
    );
  }

  const { quests } = data;

  function QuestBar({ label, current, goal }: { label: string; current: number; goal: number }) {
    const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    const done = current >= goal && goal > 0;
    return (
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--sf-text-2)' }}>{label}</span>
          <span style={{ color: 'var(--sf-text)', fontWeight: 600 }}>{current} / {goal}</span>
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

  const badge = (completed: string | null | undefined) => {
    if (completed) {
      return <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>✓ {t('achievements.completed')}</span>;
    }
    return <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--sf-text-3)', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem' }}>{t('achievements.inProgress')}</span>;
  };

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

      {/* ── Affiliate Status ── */}
      {quests.pathToAffiliate && (
        <div className="sf-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{t('achievements.pathToAffiliate')}</h3>
            {badge(quests.pathToAffiliate.completedAt)}
          </div>
          {quests.pathToAffiliate.affiliateInvitationStatus && (
            <p style={{ fontSize: '0.8rem', color: 'var(--sf-text-3)', marginBottom: '0.75rem' }}>
              {t('achievements.invitationStatus')}: {quests.pathToAffiliate.affiliateInvitationStatus}
            </p>
          )}
          <QuestBar label={t('achievements.avgViewers')} current={quests.pathToAffiliate.averageViewers.current} goal={quests.pathToAffiliate.averageViewers.goal} />
          <QuestBar label={t('achievements.followers')} current={quests.pathToAffiliate.followers.current} goal={quests.pathToAffiliate.followers.goal} />
          <QuestBar label={t('achievements.hoursStreamed')} current={quests.pathToAffiliate.hoursStreamed.current} goal={quests.pathToAffiliate.hoursStreamed.goal} />
          <QuestBar label={t('achievements.uniqueDays')} current={quests.pathToAffiliate.uniqueDaysStreamed.current} goal={quests.pathToAffiliate.uniqueDaysStreamed.goal} />
        </div>
      )}

      {/* ── Partner Status ── */}
      {quests.pathToPartner && (
        <div className="sf-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{t('achievements.pathToPartner')}</h3>
            {badge(quests.pathToPartner.completedAt)}
          </div>
          {quests.pathToPartner.affiliateInvitationStatus && (
            <p style={{ fontSize: '0.8rem', color: 'var(--sf-text-3)', marginBottom: '0.75rem' }}>
              {t('achievements.invitationStatus')}: {quests.pathToPartner.affiliateInvitationStatus}
            </p>
          )}
          <QuestBar label={t('achievements.avgViewers30')} current={quests.pathToPartner.averageViewers30.current} goal={quests.pathToPartner.averageViewers30.goal} />
          <QuestBar label={t('achievements.avgViewers60')} current={quests.pathToPartner.averageViewers60.current} goal={quests.pathToPartner.averageViewers60.goal} />
          <QuestBar label={t('achievements.uniqueDays')} current={quests.pathToPartner.uniqueDaysStreamed.current} goal={quests.pathToPartner.uniqueDaysStreamed.goal} />
        </div>
      )}

      {/* ── Build a Community ── */}
      {quests.buildACommunity && (
        <div className="sf-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{t('achievements.buildCommunity')}</h3>
            {badge(quests.buildACommunity.completedAt)}
          </div>
          <QuestBar label={t('achievements.enabled')} current={quests.buildACommunity.enabled.current} goal={quests.buildACommunity.enabled.goal} />
          <QuestBar label={t('achievements.communityServer')} current={quests.buildACommunity.communityServer.current} goal={quests.buildACommunity.communityServer.goal} />
          <QuestBar label={t('achievements.hostedEvents')} current={quests.buildACommunity.hostedCommunityEvents.current} goal={quests.buildACommunity.hostedCommunityEvents.goal} />
        </div>
      )}
    </div>
  );
}
