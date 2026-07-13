import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { OVERLAY_REGISTRY } from '../config/overlayRegistry';
import styles from './SpeedrunPanel.module.css';

interface Props {
  channel: string;
}

export function SpeedrunPanel({ channel }: Props) {
  const { t } = useTranslation();
  const { socket, connected } = useSocket();
  const [attempts, setAttempts] = useState(1);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const ov = OVERLAY_REGISTRY.find(o => o.id === 'speedrun');
  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;
  const be = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  const overlayUrl = ov?.filename
    ? `${overlayBaseUrl}/overlays/${ov.filename}?channel=${channel}&backend=${encodeURIComponent(be)}`
    : '';

  useEffect(() => {
    let interval: number | undefined;
    if (timerRunning) {
      interval = window.setInterval(() => {
        setElapsed(e => e + 10);
      }, 10);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timerRunning]);

  const emitControl = (action: string) => {
    if (socket?.connected) {
      socket.emit('speedrun:control', { action, channel });
    }
    if (action === 'split') {
      if (!timerRunning) {
        setTimerRunning(true);
        setElapsed(0);
      }
    } else if (action === 'reset') {
      setTimerRunning(false);
      setElapsed(0);
      setAttempts(a => a + 1);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  const scenes = [
    { name: 'Inicio (Starting Soon)', param: 'intro' },
    { name: 'Gameplay (Splits)', param: 'gameplay' },
    { name: 'Pausa (BRB)', param: 'brb' },
    { name: 'Final (Ending)', param: 'ending' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.heading}>
            <h2 className="sf-heading">{t('obs.speedrunSuite')}</h2>
            <span className={styles.betaBadge}>⚠️ BETA</span>
          </div>
          <p className={styles.subtitle}>{t('obs.speedrunSuiteDesc')}</p>
        </div>

        {/* OBS URL */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>📡 URL para OBS</p>
            <code className={styles.urlBox}>{overlayUrl}</code>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => navigator.clipboard.writeText(overlayUrl)}
                className={`sf-btn sf-btn-primary ${styles.copyBtn}`}
              >
                📋 Copiar
              </button>
            </div>
            <p className={styles.sectionDesc} style={{ marginBottom: 0, marginTop: '0.75rem' }}>
              Añade esta URL como fuente <strong>Navegador</strong> en OBS (1920×1080).
              El panel de control del streamer se oculta automáticamente en OBS.
            </p>
          </div>
        </div>

        <div className={styles.twoColGrid}>
          {/* Escenas */}
          <div className="glass-card">
            <div className={styles.card}>
              <p className={styles.sectionTitle}>🎬 Escenas por URL</p>
              <div className={styles.sceneList}>
                {scenes.map(scene => (
                  <div key={scene.param} className={styles.sceneRow}>
                    <span className={styles.sceneName}>{scene.name}</span>
                    <code className={styles.sceneCode}>&scene={scene.param}</code>
                  </div>
                ))}
              </div>
              <p className={styles.sectionDesc} style={{ marginBottom: 0, marginTop: '0.75rem' }}>
                Añade <code className={styles.sceneCode} style={{ padding: '0.1rem 0.35rem' }}>&scene=...</code> al final de la URL para forzar una escena.
              </p>
            </div>
          </div>

          {/* Control Rápido */}
          <div className="glass-card">
            <div className={styles.card}>
              <p className={styles.sectionTitle}>🎮 Control Rápido</p>
              <div className={styles.timerBox}>
                <div className={styles.timerValue}>{formatTime(elapsed)}</div>
                <div className={styles.timerLabel}>CRONÓMETRO</div>
              </div>
              <div className={styles.controlsRow}>
                <button
                  onClick={() => emitControl('split')}
                  className={styles.controlBtnPrimary}
                  style={{ flex: 1 }}
                >
                  {timerRunning ? 'SPLIT' : 'EMPEZAR'}
                </button>
                <button
                  onClick={() => emitControl('reset')}
                  className={styles.controlBtnDanger}
                >
                  REINICIAR
                </button>
              </div>
              <div className={styles.statsRow}>
                <span>Intentos: <strong className={styles.statValue}>#{attempts}</strong></span>
                <span>
                  Estado:{' '}
                  <strong className={styles.statValue}>
                    {timerRunning ? 'Corriendo' : 'Detenido'}
                  </strong>
                </span>
              </div>
              <p className={styles.sectionDesc} style={{ marginBottom: 0, marginTop: '0.75rem' }}>
                Controles locales. Cuando la suite esté conectada al backend, los splits se sincronizarán en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Conexión */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <div className={styles.connectionRow}>
              <div className={connected ? styles.statusDotConnected : styles.statusDotDisconnected} />
              <span className="sf-label" style={{ margin: 0 }}>
                {connected ? 'Backend conectado' : 'Backend no conectado'}
              </span>
              <span className="text-xs text-dim" style={{ marginLeft: 'auto' }}>
                {connected
                  ? 'La suite Speedrun puede conectarse en tiempo real'
                  : 'La suite funcionará en modo autónomo (demo)'}
              </span>
            </div>
          </div>
        </div>

        {/* Beta note */}
        <div className={styles.betaInfo}>
          <div className={styles.betaInfoTitle}>⚠️ Versión Beta</div>
          <p>
            Esta funcionalidad está en desarrollo activo. Los eventos <code>speedrun:*</code> en el backend
            están pendientes de implementación completa. La suite funciona actualmente en modo local/demo.
            Datos como PB, WR, splits y categorías se configuran manualmente en el overlay o se sincronizarán
            cuando los sockets estén operativos.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
