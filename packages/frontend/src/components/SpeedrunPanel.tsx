import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { OVERLAY_REGISTRY } from '../config/overlayRegistry';
import styles from './SpeedrunPanel.module.css';

interface SpeedrunSplit {
  name: string;
  pb: number;
  current: number | null;
  gold: number;
}

interface Props {
  channel: string;
}

const DEFAULT_SHORTCUTS = {
  split: 'Control+Space',
  reset: 'Control+r',
  undo: 'Control+z',
};

function loadShortcuts() {
  try {
    const saved = JSON.parse(localStorage.getItem('speedrun:shortcuts') || '{}');
    return { ...DEFAULT_SHORTCUTS, ...saved };
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

function saveShortcuts(shortcuts: typeof DEFAULT_SHORTCUTS) {
  localStorage.setItem('speedrun:shortcuts', JSON.stringify(shortcuts));
}

function matchShortcut(e: KeyboardEvent, shortcut: string) {
  const parts = shortcut.split('+');
  const ctrl = parts.includes('Control');
  const shift = parts.includes('Shift');
  const alt = parts.includes('Alt');
  const key = parts[parts.length - 1].toLowerCase();
  if (e.ctrlKey !== ctrl) return false;
  if (e.shiftKey !== shift) return false;
  if (e.altKey !== alt) return false;
  if (e.key.toLowerCase() !== key) return false;
  return true;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function parseTime(str: string): number | null {
  const m = str.match(/^(\d+):(\d{2})\.(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60000 + parseInt(m[2]) * 1000 + parseInt(m[3]) * 10;
}

export function SpeedrunPanel({ channel }: Props) {
  const { t } = useTranslation();
  const { socket } = useSocket();
  const [attempts, setAttempts] = useState(1);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [splits, setSplits] = useState<SpeedrunSplit[]>([]);
  const [shortcuts, setShortcuts] = useState(loadShortcuts);
  const [capturingShortcut, setCapturingShortcut] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const timerRunningRef = useRef(timerRunning);
  timerRunningRef.current = timerRunning;
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

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

  // Timer with requestAnimationFrame
  useEffect(() => {
    if (timerRunning) {
      startTimeRef.current = Date.now() - elapsed;
      const tick = () => {
        if (timerRunningRef.current) {
          setElapsed(Date.now() - startTimeRef.current);
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [timerRunning]);

  // Load state from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${be}/speedrun/${channel}`);
        if (res.ok) {
          const data = await res.json();
          if (data.splits) setSplits(data.splits);
        }
      } catch {}
    };
    load();
  }, [channel, be]);

  // Listen for speedrun:update from socket
  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      if (!data) return;
      if (data.splits) setSplits(data.splits);
      if (data.attempts) setAttempts(data.attempts);
    };
    socket.on('speedrun:update', handler);
    return () => { socket.off('speedrun:update', handler); };
  }, [socket]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (matchShortcut(e, shortcuts.split)) { e.preventDefault(); emitControl('split'); }
      else if (matchShortcut(e, shortcuts.reset)) { e.preventDefault(); emitControl('reset'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts]);

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

  const applySplits = () => {
    if (socket?.connected) {
      socket.emit('speedrun:config', { channel, config: { splits } });
    } else {
      fetch(`${be}/speedrun/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, splits }),
      }).catch(() => {});
    }
    setSavedStatus('Guardado');
    setTimeout(() => setSavedStatus(null), 2000);
  };

  const addSplit = () => {
    const lastPb = splits.length > 0 ? splits[splits.length - 1].pb + 60000 : 60000;
    setSplits([...splits, { name: `Split ${splits.length + 1}`, pb: lastPb, current: null, gold: lastPb - 15000 }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: keyof SpeedrunSplit, value: string | number | null) => {
    const updated = [...splits];
    (updated[index] as any)[field] = value;
    setSplits(updated);
  };

  const handleShortcutCapture = (action: string) => {
    setCapturingShortcut(action);
  };

  const handleCaptureKey = useCallback((e: KeyboardEvent) => {
    if (!capturingShortcut) return;
    e.preventDefault();
    e.stopPropagation();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Control');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    const key = e.key === ' ' ? 'Space' : e.key;
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      parts.push(key.length === 1 ? key.toLowerCase() : key);
      const shortcut = parts.join('+');
      const newShortcuts = { ...shortcuts, [capturingShortcut]: shortcut };
      setShortcuts(newShortcuts);
      saveShortcuts(newShortcuts);
      setCapturingShortcut(null);
    }
  }, [capturingShortcut, shortcuts]);

  useEffect(() => {
    if (capturingShortcut) {
      window.addEventListener('keydown', handleCaptureKey, true);
      return () => window.removeEventListener('keydown', handleCaptureKey, true);
    }
  }, [capturingShortcut, handleCaptureKey]);

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

          {/* Atajos configurables */}
          <div className="glass-card">
            <div className={styles.card}>
              <p className={styles.sectionTitle}>⌨️ Atajos de teclado</p>
              <div className={styles.sceneList}>
                {(['split', 'reset'] as const).map(action => (
                  <div key={action} className={styles.sceneRow}>
                    <span className={styles.sceneName}>
                      {action === 'split' ? 'Split / Empezar' : 'Reiniciar'}
                    </span>
                    {capturingShortcut === action ? (
                      <code className={styles.sceneCode} style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                        Presiona tecla...
                      </code>
                    ) : (
                      <code
                        className={styles.sceneCode}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleShortcutCapture(action)}
                        title="Haz clic para cambiar"
                      >
                        {shortcuts[action]}
                      </code>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-dim" style={{ marginTop: '0.5rem' }}>
                Haz clic en un atajo para cambiarlo. Los cambios se guardan automáticamente.
              </div>
            </div>
          </div>
        </div>

        {/* Editor de Splits */}
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>📊 Configurar Splits</div>
            <div className="text-xs text-dim" style={{ marginBottom: '0.75rem' }}>
              Edita los nombres y tiempos de cada split. Los cambios se sincronizan con el overlay en tiempo real.
            </div>

            {splits.map((split, i) => (
              <div key={i} className={styles.sceneUrlRow} style={{ marginBottom: '0.4rem' }}>
                <input
                  className="sf-input"
                  style={{ flex: 2, padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                  value={split.name}
                  onChange={e => updateSplit(i, 'name', e.target.value)}
                  placeholder="Nombre del split"
                />
                <input
                  className="sf-input"
                  style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'center' }}
                  value={formatTime(split.pb)}
                  onChange={e => {
                    const parsed = parseTime(e.target.value);
                    if (parsed !== null) updateSplit(i, 'pb', parsed);
                  }}
                  placeholder="MM:SS.cs"
                  title="PB (Personal Best)"
                />
                <input
                  className="sf-input"
                  style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'center' }}
                  value={formatTime(split.gold)}
                  onChange={e => {
                    const parsed = parseTime(e.target.value);
                    if (parsed !== null) updateSplit(i, 'gold', parsed);
                  }}
                  placeholder="MM:SS.cs"
                  title="Gold (mejor split)"
                />
                <button
                  onClick={() => removeSplit(i)}
                  className="sf-btn sf-btn-ghost sf-btn-sm"
                  style={{ color: 'var(--sf-danger)', padding: '0.3rem 0.5rem', minWidth: 'auto' }}
                  title="Eliminar split"
                >
                  ✕
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={addSplit} className="sf-btn sf-btn-ghost sf-btn-sm">
                + Añadir split
              </button>
              <button onClick={applySplits} className="sf-btn sf-btn-primary sf-btn-sm">
                {savedStatus || 'Aplicar cambios'}
              </button>
            </div>
          </div>
        </div>

        {/* Beta note */}
        <div className={styles.betaInfo}>
          <div className={styles.betaInfoTitle}>⚠️ Versión Beta</div>
          <p>
            Esta funcionalidad está en desarrollo activo. Los datos como PB, WR y splits se configuran
            desde este panel y se sincronizan en tiempo real con el overlay.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
