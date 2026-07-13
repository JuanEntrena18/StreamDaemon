import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRunningRef = useRef(timerRunning);
  timerRunningRef.current = timerRunning;

  const ov = OVERLAY_REGISTRY.find(o => o.id === 'speedrun');
  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;
  const be = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  const overlayUrl = ov?.filename
    ? `${overlayBaseUrl}/overlays/${ov.filename}?channel=${channel}&backend=${encodeURIComponent(be)}`
    : '';

  const scenes = [
    { id: 'intro', name: 'Inicio (Starting Soon)' },
    { id: 'gameplay', name: 'Gameplay (Splits)' },
    { id: 'brb', name: 'Pausa (BRB)' },
    { id: 'ending', name: 'Final (Ending)' },
  ];

  const sceneUrl = (sceneId: string) => `${overlayUrl}&scene=${sceneId}`;
  const baseUrlForCopy = `${overlayBaseUrl}/overlays/${ov?.filename}?channel=${channel}&backend=${encodeURIComponent(be)}`;

  useEffect(() => {
    let interval: number | undefined;
    if (timerRunning) {
      interval = window.setInterval(() => {
        setElapsed(e => e + 10);
      }, 10);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timerRunning]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); emitControl('split'); }
      if (e.code === 'KeyR') { emitControl('reset'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const copy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  }, []);

  const handleUrlClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const range = document.createRange();
    range.selectNodeContents(e.currentTarget);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  const emitControl = (action: string) => {
    if (socket?.connected) {
      socket.emit('speedrun:control', { action, channel });
    }
    if (action === 'split') {
      if (!timerRunningRef.current) {
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

        {/* Steps guide */}
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Copia la URL base</div>
              <div className={styles.stepDesc}>
                Esta URL funciona para todas las escenas. Añádela como fuente Navegador en OBS (1920×1080).
                El panel de control del streamer se oculta automáticamente.
              </div>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Elige tu escena</div>
              <div className={styles.stepDesc}>
                Copia la URL de la escena que quieras mostrar o añade <code>&scene=...</code> al final de la URL base.
              </div>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <div className={styles.stepBody}>
              <div className={styles.stepTitle}>Prueba en el navegador</div>
              <div className={styles.stepDesc}>
                Abre la URL en tu navegador para verificar que todo funciona antes de añadirla a OBS.
              </div>
            </div>
          </div>
        </div>

        {/* URL base */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>📡 URL principal</p>
            <code
              className={styles.urlBox}
              onClick={handleUrlClick}
              style={{ cursor: 'pointer' }}
              title="Haz clic para seleccionar todo (Ctrl+C)"
            >
              {baseUrlForCopy}
            </code>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => copy(overlayUrl, 'base')}
                className={`sf-btn sf-btn-primary ${styles.copyBtn}`}
              >
                {copiedId === 'base' ? '✓ Copiado' : '📋 Copiar URL'}
              </button>
              <button
                onClick={() => window.open(overlayUrl, '_blank')}
                className="sf-btn sf-btn-ghost"
              >
                🔍 Abrir en navegador
              </button>
            </div>
          </div>
        </div>

        {/* Scene URLs */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>🎬 Escenas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {scenes.map(scene => {
                const url = sceneUrl(scene.id);
                return (
                  <div key={scene.id} className={styles.sceneUrlRow}>
                    <span className={styles.sceneUrlName}>{scene.name}</span>
                    <code
                      className={styles.sceneUrlCode}
                      onClick={handleUrlClick}
                      title="Haz clic para seleccionar"
                    >
                      {url}
                    </code>
                    <button
                      onClick={() => copy(url, scene.id)}
                      className={`sf-btn sf-btn-ghost ${styles.sceneCopyBtn}`}
                    >
                      {copiedId === scene.id ? '✓' : '📋'}
                    </button>
                    <button
                      onClick={() => window.open(url, '_blank')}
                      className={`sf-btn sf-btn-ghost ${styles.sceneCopyBtn}`}
                      title="Abrir en navegador"
                    >
                      🔍
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Controls + Connection side by side */}
        <div className={styles.twoColGrid}>
          {/* Control Rápido */}
          <div className="glass-card">
            <div className={styles.card}>
              <p className={styles.sectionTitle}>🎮 Control rápido</p>
              <div className={styles.timerBox}>
                <div className={styles.timerValue}>{formatTime(elapsed)}</div>
                <div className={styles.timerLabel}>CRONÓMETRO LOCAL</div>
              </div>
              <div className={styles.controlsRow}>
                <button
                  onClick={() => emitControl('split')}
                  className={styles.controlBtnPrimary}
                  style={{ flex: 1 }}
                >
                  {timerRunning ? '⏱ SPLIT' : '▶ EMPEZAR'}
                </button>
                <button
                  onClick={() => emitControl('reset')}
                  className={styles.controlBtnDanger}
                >
                  ⏹ REINICIAR
                </button>
              </div>
              <div className={styles.statsRow}>
                <span>Intentos: <strong className={styles.statValue}>#{attempts}</strong></span>
                <span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: timerRunning ? '#10b981' : 'var(--sf-border)', marginRight: 4 }} />
                  {timerRunning ? 'Corriendo' : 'Detenido'}
                </span>
              </div>
            </div>
          </div>

          {/* Conexión + info */}
          <div className="glass-card">
            <div className={styles.card}>
              <p className={styles.sectionTitle}>🔌 Estado</p>
              <div className={styles.connectionRow}>
                <div className={connected ? styles.statusDotConnected : styles.statusDotDisconnected} />
                <div>
                  <div className="sf-label" style={{ margin: 0, fontWeight: 600 }}>
                    {connected ? 'Conectado al backend' : 'Sin conexión'}
                  </div>
                  <div className="text-xs text-dim" style={{ marginTop: '0.15rem' }}>
                    {connected
                      ? 'Los splits se sincronizan en tiempo real'
                      : 'Funciona en modo autónomo (demo)'}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--sf-border)', margin: '1rem 0' }} />

              <p className={styles.sectionTitle}>ℹ️ Atajos</p>
              <div className={styles.sceneList}>
                {[
                  { key: 'Espacio', action: 'Split / Empezar' },
                  { key: 'R', action: 'Reiniciar' },
                ].map(s => (
                  <div key={s.key} className={styles.sceneRow}>
                    <span className={styles.sceneName}>{s.action}</span>
                    <code className={styles.sceneCode}>{s.key}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Beta note */}
        <div className={styles.betaInfo}>
          <div className={styles.betaInfoTitle}>⚠️ Versión Beta</div>
          <p>
            Esta funcionalidad está en desarrollo activo. Los datos como PB, WR y splits se configuran
            manualmente dentro del overlay o mediante los endpoints REST del backend.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
