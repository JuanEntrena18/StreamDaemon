import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { OVERLAY_REGISTRY } from '../config/overlayRegistry';
import styles from './ObsPanel.module.css';

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

  return (
    <motion.div className={styles.panel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>🏃 {t('obs.speedrunSuite')}</h2>
        <span className={styles.badge}>
          <span style={{ color: '#ff6b00' }}>⚠️</span> BETA
        </span>
      </div>

      <div className={styles.panelContent}>
        <p className="text-slate-400 mb-6 text-sm">{t('obs.speedrunSuiteDesc')}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* OBS URL */}
          <div className={`${styles.card} col-span-2`}>
            <h3 className="font-bold text-cyan-400 text-lg mb-3">📡 URL para OBS</h3>
            <div className="flex gap-3 items-start">
              <input
                readOnly
                value={overlayUrl}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-300 focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => navigator.clipboard.writeText(overlayUrl)}
                className="bg-cyan-700 hover:bg-cyan-600 px-4 py-2 rounded font-bold text-sm transition"
              >
                📋 Copiar
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Añade esta URL como fuente <strong>Navegador</strong> en OBS (1920×1080).
              El panel de control del streamer se oculta automáticamente en OBS.
            </p>
          </div>

          {/* Escenas URL params */}
          <div className={styles.card}>
            <h3 className="font-bold text-emerald-400 text-lg mb-3">🎬 Escenas por URL</h3>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { name: 'Inicio (Starting Soon)', param: 'intro' },
                { name: 'Gameplay (Splits)', param: 'gameplay' },
                { name: 'Pausa (BRB)', param: 'brb' },
                { name: 'Final (Ending)', param: 'ending' },
              ].map(scene => (
                <div key={scene.param} className="flex justify-between items-center bg-slate-900/50 rounded px-3 py-2 border border-slate-800">
                  <span className="text-slate-300">{scene.name}</span>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded text-cyan-400">
                    &scene={scene.param}
                  </code>
                </div>
              ))}
              <p className="text-xs text-slate-500 mt-2">
                Añade <code className="text-cyan-400">&scene=...</code> al final de la URL para forzar una escena.
              </p>
            </div>
          </div>

          {/* Control Rápido */}
          <div className={styles.card}>
            <h3 className="font-bold text-yellow-400 text-lg mb-3">🎮 Control Rápido</h3>
            <div className="flex flex-col gap-3">
              <div className="bg-slate-900 rounded-xl p-4 text-center border border-slate-800">
                <div className="font-tech text-5xl font-black font-mono tracking-widest text-white">
                  {formatTime(elapsed)}
                </div>
                <div className="text-xs text-slate-500 mt-1">CRONÓMETRO LOCAL</div>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => emitControl('split')}
                  className="bg-emerald-700 hover:bg-emerald-600 px-6 py-3 rounded-xl font-bold text-lg transition flex-1"
                >
                  {timerRunning ? 'SPLIT' : 'EMPEZAR'}
                </button>
                <button
                  onClick={() => emitControl('reset')}
                  className="bg-rose-700 hover:bg-rose-600 px-4 py-3 rounded-xl font-bold text-lg transition"
                >
                  REINICIAR
                </button>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Intentos: <strong className="text-white">#{attempts}</strong></span>
                <span>Estado: {timerRunning
                  ? <span className="text-emerald-400 font-bold">Corriendo</span>
                  : <span className="text-slate-400">Detenido</span>}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 border-t border-slate-800 pt-2">
                Estos controles son locales. Cuando la suite Speedrun esté conectada al backend, los splits se sincronizarán en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Estado de conexión */}
        <div className={`${styles.card} border ${connected ? 'border-emerald-700' : 'border-slate-700'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-600'}`} />
            <span className="font-bold">{connected ? 'Backend conectado' : 'Backend no conectado'}</span>
            <span className="text-xs text-slate-500 ml-auto">
              {connected
                ? 'La suite Speedrun puede conectarse en tiempo real'
                : 'La suite funcionará en modo autónomo (demo)'}
            </span>
          </div>
        </div>

        {/* Nota beta */}
        <div className="mt-6 bg-amber-950/40 border border-amber-700/50 rounded-xl p-4 text-sm">
          <h4 className="font-bold text-amber-400 mb-1">⚠️ Versión Beta</h4>
          <p className="text-amber-300/80">
            Esta funcionalidad está en desarrollo activo. Los eventos <code className="text-cyan-400">speedrun:*</code> en el backend
            están pendientes de implementación completa. La suite funciona actualmente en modo local/demo.
            Datos como PB, WR, splits y categorías se configuran manualmente en el overlay o se sincronizarán
            cuando los sockets estén operativos.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
