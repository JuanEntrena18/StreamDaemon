import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiGet, apiPost, OVERLAY_BASE_URL } from '../utils/api';
import { useTranslation } from '../i18n/context';
import type { HudData, HudConfig } from '@streamdaemon/shared';
import { Toggle } from './Toggle';
import styles from './HudPanel.module.css';

interface Props {
  channel: string;
}

export function HudPanel({ channel }: Props) {
  const { t } = useTranslation();
  const [hud, setHud] = useState<HudData | null>(null);
  const [polling, setPolling] = useState(false);
  const { socket, connected } = useSocket();
  const [config, setConfig] = useState<HudConfig>(() => {
    try {
      const saved = localStorage.getItem('sf-hud-config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      showViewers: true, showFollowers: true, showSubs: true,
      showUptime: true, showGame: true, showTitle: false,
      showLastFollower: false, showLastSubscriber: false,
    };
  });

  useEffect(() => {
    localStorage.setItem('sf-hud-config', JSON.stringify(config));
  }, [config]);

  const updateConfig = (key: keyof HudConfig, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const overlayParams = new URLSearchParams();
  overlayParams.set('mode', 'hud');
  overlayParams.set('channel', channel);
  overlayParams.set('viewers', config.showViewers ? '1' : '0');
  overlayParams.set('followers', config.showFollowers ? '1' : '0');
  overlayParams.set('subs', config.showSubs ? '1' : '0');
  overlayParams.set('uptime', config.showUptime ? '1' : '0');
  overlayParams.set('game', config.showGame ? '1' : '0');
  overlayParams.set('title', config.showTitle ? '1' : '0');
  overlayParams.set('lastFollower', config.showLastFollower ? '1' : '0');
  overlayParams.set('lastSub', config.showLastSubscriber ? '1' : '0');
  const overlayUrl = `${OVERLAY_BASE_URL}/overlay.html?${overlayParams.toString()}`;

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useSocketEvent('hud:update', useCallback((data: HudData) => {
    setHud(data);
  }, []));

  useEffect(() => {
    if (!channel) return;
    apiGet(`/hud/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (data && data.viewers !== undefined) setHud(data); })
      .catch(() => {});
  }, [channel]);

  const togglePolling = async () => {
    try {
      if (polling) {
        await apiPost('/hud/stop-poll', {});
        setPolling(false);
      } else {
        await apiPost('/hud/start-poll', { channel, interval: 10 });
        setPolling(true);
      }
    } catch {}
  };

  const refresh = async () => {
    try {
      const r = await apiGet(`/hud/${channel}`);
      const data = await r.json();
      if (data && data.viewers !== undefined) setHud(data);
    } catch {}
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const stat = (label: string, value: string, icon: string) => (
    <div key={label} className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          {t('hud.title')}
        </h2>
        <p className={styles.subtitle}>
          {t('hud.subtitle')}
        </p>
      </div>

      <div className={`glass-card ${styles.card}`}>
        <p className="sf-section-title">{t('hud.statsTitle')}</p>

        {!hud && (
          <p className="text-sm text-dim">
            {channel ? t('hud.cargando') : t('hud.empty')}
          </p>
        )}

        {hud && (
          <>
            <div className={styles.statsGrid}>
              {stat(t('hud.viewers'), hud.viewers.toString(), '👁️')}
              {stat(t('hud.followers'), hud.followers.toLocaleString(), '❤️')}
              {stat(t('hud.subs'), hud.subscribers.toLocaleString(), '⭐')}
              {stat(t('hud.tiempo'), formatUptime(hud.uptimeSeconds), '⏱️')}
            </div>

            <div className={styles.infoLines}>
              <div><strong className={styles.infoLineLabel}>{t('hud.titulo')}</strong> {hud.streamTitle}</div>
              {hud.gameName && <div><strong className={styles.infoLineLabel}>{t('hud.juego')}</strong> {hud.gameName}</div>}
              <div><strong className={styles.infoLineLabel}>{t('hud.estado')}</strong>{' '}
                <span className={hud.isLive ? styles.liveStatus : styles.offlineStatus}>
                  {hud.isLive ? t('hud.enVivo') : t('hud.offline')}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Config Panel */}
      <div className={`glass-card ${styles.card}`}>
        <p className="sf-section-title">{t('hud.configTitle') || 'Configuración del HUD'}</p>
        <p className="text-sm text-muted mb-4">
          {t('hud.configDesc') || 'Selecciona qué elementos mostrar en el overlay del Stream HUD.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>{t('hud.showViewers') || 'Viewers'}</span>
            <Toggle checked={config.showViewers} onChange={() => updateConfig('showViewers', !config.showViewers)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>{t('hud.showFollowers') || 'Followers'}</span>
            <Toggle checked={config.showFollowers} onChange={() => updateConfig('showFollowers', !config.showFollowers)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>{t('hud.showSubs') || 'Subs'}</span>
            <Toggle checked={config.showSubs} onChange={() => updateConfig('showSubs', !config.showSubs)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>{t('hud.showUptime') || 'Uptime'}</span>
            <Toggle checked={config.showUptime} onChange={() => updateConfig('showUptime', !config.showUptime)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>{t('hud.showGame') || 'Juego actual'}</span>
            <Toggle checked={config.showGame} onChange={() => updateConfig('showGame', !config.showGame)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>{t('hud.showTitle') || 'Título del stream'}</span>
            <Toggle checked={config.showTitle} onChange={() => updateConfig('showTitle', !config.showTitle)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>{t('hud.showLastFollower') || 'Último Follower'}</span>
            <Toggle checked={config.showLastFollower} onChange={() => updateConfig('showLastFollower', !config.showLastFollower)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem' }}>{t('hud.showLastSubscriber') || 'Último Subscriptor'}</span>
            <Toggle checked={config.showLastSubscriber} onChange={() => updateConfig('showLastSubscriber', !config.showLastSubscriber)} />
          </div>
        </div>
      </div>

      <div className={`glass-card ${styles.card}`}>
        <p className="sf-section-title">{t('hud.autoTitle')}</p>
        <p className="text-sm text-muted mb-4">
          {t('hud.autoDesc')}
        </p>
        <div className={styles.actions}>
          <button onClick={togglePolling} className={`sf-btn ${polling ? 'sf-btn-danger' : 'sf-btn-primary'} ${styles.pollBtn}`}>
            {polling ? t('hud.detenerActualizacion') : t('hud.iniciarActualizacion')}
          </button>
          <button onClick={refresh} className={`sf-btn sf-btn-ghost ${styles.ghostBtn}`}>
            {t('hud.actualizarAhora')}
          </button>
        </div>
        <div className={`${styles.pollStatus} ${polling ? styles['pollStatus--active'] : styles['pollStatus--inactive']}`}>
          {polling ? t('hud.actualizando') : t('hud.manual')}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <p className="sf-section-title">{t('hud.overlayUrl')}</p>
        <p className="text-sm text-muted mb-2">
          Agregá esta URL como Browser Source en OBS:
        </p>
        <div className={styles.urlBox}>
          {overlayUrl}
        </div>
      </div>
    </div>
  );
}
