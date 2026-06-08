import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { apiPost, OVERLAY_BASE_URL } from '../utils/api';
import type { HudData } from '@streamforger/shared';

interface Props {
  channel: string;
  backendUrl: string;
}

export function HudPanel({ channel, backendUrl }: Props) {
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
    <div key={label} style={{
      flex: 1, minWidth: 100,
      padding: '0.75rem', borderRadius: 8,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--sf-border)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--sf-text)' }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          📈 Stream HUD
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Estadísticas en vivo del canal. Aparece como overlay automático en OBS.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">📊 Estadísticas actuales</p>

        {!hud && (
          <p style={{ fontSize: '0.85rem', color: 'var(--sf-text-3)' }}>
            {channel ? 'Cargando datos del canal...' : 'Conectá un canal para ver estadísticas.'}
          </p>
        )}

        {hud && (
          <>
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem',
            }}>
              {stat('Viewers', hud.viewers.toString(), '👁️')}
              {stat('Followers', hud.followers.toLocaleString(), '❤️')}
              {stat('Subs', hud.subscribers.toLocaleString(), '⭐')}
              {stat('Tiempo', formatUptime(hud.uptimeSeconds), '⏱️')}
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.6 }}>
              <div><strong style={{ color: 'var(--sf-text)' }}>Título:</strong> {hud.streamTitle}</div>
              {hud.gameName && <div><strong style={{ color: 'var(--sf-text)' }}>Juego:</strong> {hud.gameName}</div>}
              <div><strong style={{ color: 'var(--sf-text)' }}>Estado:</strong>{' '}
                <span style={{ color: hud.isLive ? '#34d399' : '#f87171' }}>
                  {hud.isLive ? 'En vivo' : 'Offline'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p className="sf-section-title">🔄 Actualización automática</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', marginBottom: '1rem' }}>
          El HUD se actualiza cada 10 segundos via Socket.IO cuando está encendido.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={togglePolling} className={`sf-btn ${polling ? 'sf-btn-danger' : 'sf-btn-primary'}`}
            style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
            {polling ? 'Detener actualización' : 'Iniciar actualización'}
          </button>
          <button onClick={refresh} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
            Actualizar ahora
          </button>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: polling ? '#34d399' : 'var(--sf-text-3)' }}>
          {polling ? '⏺ Actualizando cada 10s' : '⏹ Actualización manual'}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <p className="sf-section-title">🔌 Overlay URL</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', marginBottom: '0.5rem' }}>
          Agregá esta URL como Browser Source en OBS:
        </p>
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 6,
          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--sf-border)',
          fontSize: '0.78rem', fontFamily: 'monospace', color: '#a78bfa',
          wordBreak: 'break-all',
        }}>
          {OVERLAY_BASE_URL}/overlay.html?mode=hud&amp;channel={channel}
        </div>
      </div>
    </div>
  );
}
