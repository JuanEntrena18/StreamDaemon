import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiPost, OVERLAY_BASE_URL } from '../utils/api';
import { useTranslation } from '../i18n/context';
import type { HudData } from '@streamforger/shared';
import styles from './HudPanel.module.css';

interface Props {
  channel: string;
  backendUrl: string;
}

export function HudPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const [hud, setHud] = useState<HudData | null>(null);
  const [polling, setPolling] = useState(false);
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
    if (!channel) return;
    fetch(`${backendUrl}/hud/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (data && data.viewers !== undefined) setHud(data); })
      .catch(() => {});
  }, [channel, backendUrl]);

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
      const r = await fetch(`${backendUrl}/hud/${channel}`);
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
          {OVERLAY_BASE_URL}/overlay.html?mode=hud&amp;channel={channel}
        </div>
      </div>
    </div>
  );
}
