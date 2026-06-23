import { useState, useCallback, useEffect } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { apiGet, apiPost } from '../utils/api';
import type { HudData, HudConfig } from '@streamforger/shared';

interface Props {
  channel: string;
}

export function HudOverlay({ channel }: Props) {
  const { t } = useTranslation();
  const [hud, setHud] = useState<HudData | null>(null);
  const [config, setConfig] = useState<HudConfig>({
    showViewers: true, showFollowers: true, showSubs: true,
    showUptime: true, showGame: true, showTitle: false,
    showLastFollower: false, showLastSubscriber: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setConfig(prev => ({
      showViewers: params.has('viewers') ? params.get('viewers') === '1' : prev.showViewers,
      showFollowers: params.has('followers') ? params.get('followers') === '1' : prev.showFollowers,
      showSubs: params.has('subs') ? params.get('subs') === '1' : prev.showSubs,
      showUptime: params.has('uptime') ? params.get('uptime') === '1' : prev.showUptime,
      showGame: params.has('game') ? params.get('game') === '1' : prev.showGame,
      showTitle: params.has('title') ? params.get('title') === '1' : prev.showTitle,
      showLastFollower: params.has('lastFollower') ? params.get('lastFollower') === '1' : prev.showLastFollower,
      showLastSubscriber: params.has('lastSub') ? params.get('lastSub') === '1' : prev.showLastSubscriber,
    }));
  }, []);
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useSocketEvent('hud:update', useCallback((data: HudData) => {
    setHud(data);
  }, []));

  useEffect(() => {
    if (!channel || !connected) return;
    apiGet(`/hud/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (data && data.viewers !== undefined) setHud(data); })
      .catch(() => {});
    apiPost('/hud/start-poll', { channel, interval: 15 }).catch(() => {});
    return () => {
      apiPost('/hud/stop-poll', {}).catch(() => {});
    };
  }, [channel, connected]);

  if (!hud) {
    return (
      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        fontFamily: "'Inter', sans-serif", fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.4)',
      }}>
        {t('hudOverlay.esperandoDatos')}
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const items = [
    { key: 'viewers', show: config.showViewers, icon: '👁️', label: 'Viewers', value: hud.viewers.toString() },
    { key: 'followers', show: config.showFollowers, icon: '❤️', label: 'Followers', value: hud.followers.toLocaleString() },
    { key: 'subs', show: config.showSubs, icon: '⭐', label: 'Subs', value: hud.subscribers.toLocaleString() },
    { key: 'uptime', show: config.showUptime, icon: '⏱️', label: 'Uptime', value: formatUptime(hud.uptimeSeconds) },
    { key: 'lastFollower', show: config.showLastFollower && !!hud.lastFollower, icon: '👤', label: 'Last Follower', value: hud.lastFollower || '' },
    { key: 'lastSub', show: config.showLastSubscriber && !!hud.lastSubscriber, icon: '💎', label: 'Last Sub', value: hud.lastSubscriber || '' },
  ];

  const visibleItems = items.filter((i) => i.show);
  if (visibleItems.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20,
      display: 'flex', gap: 12, alignItems: 'center',
      fontFamily: "'Inter', sans-serif",
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: 10,
      padding: '8px 16px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {!hud.isLive && (
        <span style={{
          fontSize: '0.7rem', color: '#f87171', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Offline
        </span>
      )}
      {visibleItems.map((item) => (
        <div key={item.key} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)',
        }}>
          <span style={{ fontSize: '0.7rem' }}>{item.icon}</span>
          <span style={{ fontWeight: 600 }}>{item.value}</span>
        </div>
      ))}
      {config.showGame && hud.gameName && (
        <span style={{
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
          borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 10,
        }}>
          {hud.gameName}
        </span>
      )}
      {config.showTitle && hud.streamTitle && (
        <span style={{
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
          borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 10,
          maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {hud.streamTitle}
        </span>
      )}
    </div>
  );
}
