import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import styles from './ChannelNotifications.module.css';
import type {
  ChannelFollowEvent,
  ChannelSubscribeEvent,
  ChannelSubscriptionMessageEvent,
  ChannelSubGiftEvent,
  ChannelRedemptionEvent,
  ChannelCheerEvent,
} from '@streamdaemon/shared';

type Notification =
  | { type: 'follow'; data: ChannelFollowEvent }
  | { type: 'subscribe'; data: ChannelSubscribeEvent }
  | { type: 'subscription-message'; data: ChannelSubscriptionMessageEvent }
  | { type: 'subgift'; data: ChannelSubGiftEvent }
  | { type: 'redemption'; data: ChannelRedemptionEvent }
  | { type: 'cheer'; data: ChannelCheerEvent };

const DURATION = 7000;

const TIER_NAMES: Record<string, string> = {
  '1000': 'Tier 1',
  '2000': 'Tier 2',
  '3000': 'Tier 3',
};

function NotificationCard({ notif, onDone }: { notif: Notification; onDone: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    const t = setTimeout(onDone, DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  const icon = {
    follow: '❤️',
    subscribe: '⭐',
    'subscription-message': '⭐',
    subgift: '🎁',
    redemption: '🎯',
    cheer: '💎',
  }[notif.type];

  const title = {
    follow: t('overlay.nuevoSeguidor'),
    subscribe: t('overlay.nuevaSuscripcion'),
    'subscription-message': t('overlay.resuscripcion'),
    subgift: t('overlay.regaloSuscripcion'),
    redemption: t('overlay.recompensaCanjeada'),
    cheer: t('overlay.bits'),
  }[notif.type];

  let desc = '';
  switch (notif.type) {
    case 'follow':
      desc = notif.data.userDisplayName;
      break;
    case 'subscribe':
      desc = `${notif.data.userDisplayName} · ${TIER_NAMES[notif.data.tier] ?? notif.data.tier}`;
      break;
    case 'subscription-message':
      desc = `${notif.data.userDisplayName} · ${TIER_NAMES[notif.data.tier] ?? notif.data.tier} · ${notif.data.cumulativeMonths} meses`;
      break;
    case 'subgift':
      desc = `${notif.data.gifterDisplayName} regaló ${notif.data.amount}x ${TIER_NAMES[notif.data.tier] ?? notif.data.tier}`;
      break;
    case 'redemption':
      desc = `${notif.data.userDisplayName} · ${notif.data.rewardTitle} (${notif.data.rewardCost} pts)`;
      break;
    case 'cheer':
      desc = `${notif.data.userDisplayName} · ${notif.data.bits} bits`;
      break;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={styles.notificationCard}
    >
      <div className={styles.inner}>
        <span className={styles.icon}>{icon}</span>
        <div className={styles.textArea}>
          <div className={styles.typeLabel}>
            {title}
          </div>
          <div className={styles.descText}>
            {desc}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ChannelNotifications() {
  const [queue, setQueue] = useState<Notification[]>([]);
  const counterRef = useRef(0);

  const addNotif = useCallback((notif: Notification) => {
    counterRef.current += 1;
    setQueue((prev) => [...prev, notif]);
  }, []);

  useSocketEvent('channel:follow', useCallback((data: ChannelFollowEvent) => {
    addNotif({ type: 'follow', data });
  }, [addNotif]));

  useSocketEvent('channel:subscribe', useCallback((data: ChannelSubscribeEvent) => {
    addNotif({ type: 'subscribe', data });
  }, [addNotif]));

  useSocketEvent('channel:subscription-message', useCallback((data: ChannelSubscriptionMessageEvent) => {
    addNotif({ type: 'subscription-message', data });
  }, [addNotif]));

  useSocketEvent('channel:subgift', useCallback((data: ChannelSubGiftEvent) => {
    addNotif({ type: 'subgift', data });
  }, [addNotif]));

  useSocketEvent('channel:redemption', useCallback((data: ChannelRedemptionEvent) => {
    addNotif({ type: 'redemption', data });
  }, [addNotif]));

  useSocketEvent('channel:cheer', useCallback((data: ChannelCheerEvent) => {
    addNotif({ type: 'cheer', data });
  }, [addNotif]));

  const removeNotif = useCallback((idx: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {queue.map((n, i) => (
          <NotificationCard key={`${n.type}-${i}`} notif={n} onDone={() => removeNotif(i)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
