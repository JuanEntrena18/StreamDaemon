import { useState, useEffect } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { apiGet } from '../utils/api';
import styles from './StreamActivityFeed.module.css';

interface Props {
  channel: string;
}

interface ActivityEvent {
  id: string;
  type: 'follow' | 'sub' | 'resub' | 'gift' | 'raid' | 'cheer' | 'redemption';
  user: string;
  message: string;
  timestamp: Date;
  amount?: number;
}

export function StreamActivityFeed({ channel }: Props) {
  const { t, dateLocale } = useTranslation();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useSocketEvent('activity:event', (data: ActivityEvent) => {
    setEvents((prev) => [data, ...prev].slice(0, 50));
  });

  useEffect(() => {
    if (!channel) return;
    apiGet(`/activity/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});
  }, [channel]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  const TYPE_CONFIG = (t: (k: string) => string): Record<string, { icon: string; label: string }> => ({
    follow: { icon: '❤️', label: t('dashboard.typeFollow') },
    sub: { icon: '⭐', label: t('dashboard.typeSub') },
    resub: { icon: '🔄', label: t('dashboard.typeResub') },
    gift: { icon: '🎁', label: t('dashboard.typeGift') },
    raid: { icon: '⚔️', label: t('dashboard.typeRaid') },
    cheer: { icon: '💎', label: t('dashboard.typeCheer') },
    redemption: { icon: '🪄', label: t('dashboard.typeRedeem') },
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          {t('activity.title')}
        </h2>
        <p className={styles.subtitle}>
          {t('activity.subtitle')}
        </p>
      </div>

      {/* Filtros */}
      <div className={`glass-card ${styles.filterBar}`}>
        {['all', ...Object.keys(TYPE_CONFIG(t))].map((key) => {
          const cfg = key === 'all' ? null : TYPE_CONFIG(t)[key];
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`sf-btn ${styles.filterBtn} ${active ? styles['filterBtn--active'] : styles['filterBtn--inactive']}`}
            >
              {key === 'all' ? t('activity.todos') : `${cfg!.icon} ${cfg!.label}`}
            </button>
          );
        })}
      </div>

      {/* Lista de eventos */}
      <div className={`glass-card ${styles.eventsCard}`} aria-live="polite">
        {filtered.length === 0 ? (
          <p className={styles.emptyState}>
            {channel ? t('activity.esperando') : t('activity.conectar')}
          </p>
        ) : (
          <div className={styles.eventsList}>
            {filtered.map((event) => (
              <div key={event.id} className={styles.eventItem}>
                <span className={styles.eventIcon}>{TYPE_CONFIG(t)[event.type]?.icon ?? '📌'}</span>
                <strong className={styles.eventUser}>{event.user}</strong>
                <span className={styles.eventMsg}>{event.message}</span>
                <span className={styles.timeText}>
                  {new Date(event.timestamp).toLocaleTimeString(dateLocale || 'es-ES')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
