import { useState, useEffect } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import styles from './StreamActivityFeed.module.css';

interface Props {
  channel: string;
  backendUrl: string;
}

interface ActivityEvent {
  id: string;
  type: 'follow' | 'sub' | 'resub' | 'gift' | 'raid' | 'cheer' | 'redemption';
  user: string;
  message: string;
  timestamp: Date;
  amount?: number;
}

export function StreamActivityFeed({ channel, backendUrl }: Props) {
  const { t, dateLocale } = useTranslation();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useSocketEvent('activity:event', (data: ActivityEvent) => {
    setEvents((prev) => [data, ...prev].slice(0, 50));
  });

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/activity/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});
  }, [channel, backendUrl]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
    follow: { icon: '❤️', label: 'Follows' },
    sub: { icon: '⭐', label: 'Subs' },
    resub: { icon: '🔄', label: 'Re-subs' },
    gift: { icon: '🎁', label: 'Gifts' },
    raid: { icon: '⚔️', label: 'Raids' },
    cheer: { icon: '💎', label: 'Bits' },
    redemption: { icon: '🪄', label: 'Canjes' },
  };

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
        {['all', ...Object.keys(TYPE_CONFIG)].map((key) => {
          const cfg = key === 'all' ? null : TYPE_CONFIG[key];
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
      <div className={`glass-card ${styles.eventsCard}`}>
        {filtered.length === 0 ? (
          <p className={styles.emptyState}>
            {channel ? t('activity.esperando') : t('activity.conectar')}
          </p>
        ) : (
          <div className={styles.eventsList}>
            {filtered.map((event) => (
              <div key={event.id} className={styles.eventItem}>
                <span className={styles.eventIcon}>{TYPE_CONFIG[event.type]?.icon ?? '📌'}</span>
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
