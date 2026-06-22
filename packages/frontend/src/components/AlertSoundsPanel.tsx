import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPost } from '../utils/api';
import styles from './AlertSoundsPanel.module.css';

interface Props {
  channel: string;
}

interface SoundConfig {
  follow: string;
  subscribe: string;
  bits: string;
  raid: string;
  redemption: string;
}

const DEFAULT_SOUNDS: SoundConfig = {
  follow: '',
  subscribe: '',
  bits: '',
  raid: '',
  redemption: '',
};

const TEST_TYPES = [
  { type: 'follow', label: '🔔 Follower', color: '#06b6d4' },
  { type: 'subscribe', label: '⭐ Subscriber', color: '#a855f7' },
  { type: 'donation', label: '💰 Donation', color: '#10b981' },
  { type: 'raid', label: '⚔️ Raid', color: '#ef4444' },
  { type: 'bits', label: '🎲 Bits/Cheer', color: '#f59e0b' },
  { type: 'host', label: '📡 Host', color: '#6366f1' },
] as const;

const ALERT_TYPES: { key: keyof SoundConfig; label: string; icon: string; color: string }[] = [
  { key: 'follow', label: 'Seguidor (follow)', icon: '🔔', color: '#06b6d4' },
  { key: 'subscribe', label: 'Suscripción (sub)', icon: '⭐', color: '#a855f7' },
  { key: 'bits', label: 'Bits / Cheers', icon: '🎲', color: '#f59e0b' },
  { key: 'raid', label: 'Raid', icon: '⚔️', color: '#ef4444' },
  { key: 'redemption', label: 'Canje (redemption)', icon: '🎯', color: '#10b981' },
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export function AlertSoundsPanel({ channel }: Props) {
  const [sounds, setSounds] = useState<SoundConfig>({ ...DEFAULT_SOUNDS });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testingSound, setTestingSound] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    apiGet('/alert-sounds').then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setSounds({ ...DEFAULT_SOUNDS, ...data });
      }
      setLoading(false);
    });
  }, []);

  const handleFileSelect = async (key: keyof SoundConfig) => {
    const input = fileInputs.current[key];
    const file = input?.files?.[0];
    if (!file) return;

    setUploading(key);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const r = await apiPut('/alert-sounds/upload/' + key, { data: base64 });
      if (r.ok) {
        const result = await r.json();
        setSounds((prev) => ({ ...prev, [key]: result.filename }));
      }
    } catch (e) {
      console.warn('Upload failed:', e);
    }
    setUploading(null);
    if (input) input.value = '';
  };

  const removeSound = async (key: keyof SoundConfig) => {
    const next = { ...sounds, [key]: '' };
    setSounds(next);
    await apiPut('/alert-sounds', next);
  };

  const playSound = (key: keyof SoundConfig) => {
    setTestingSound(key);
    const audio = new Audio(`${BACKEND_URL}/alert-sounds/file/${sounds[key]}`);
    audio.onended = () => setTestingSound(null);
    audio.play().catch(() => setTestingSound(null));
  };

  const testAlert = async (type: string) => {
    setTesting(type);
    try {
      const r = await apiPost('/alert-sounds/test', { type, channel });
      if (!r.ok) console.warn('Test alert failed:', await r.text());
    } catch (e) {
      console.warn('Test alert error:', e);
    }
    setTimeout(() => setTesting(null), 2000);
  };

  const btnStyle = (color: string, active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: `1px solid ${color}66`,
    background: active ? `${color}44` : `${color}18`,
    color: active ? '#fff' : color,
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    textAlign: 'center',
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>Cargando configuración de sonidos...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          🔊 Sonidos de Alertas
        </h2>
        <p className={styles.subtitle}>
          Seleccioná un archivo MP3 desde tu computadora para cada tipo de alerta.
          Se guardarán automáticamente y se reproducirán en los overlays temáticos.
        </p>
      </div>

      <div className={`glass-card ${styles.configCard}`}>
        <div className={styles.soundsList}>
          {ALERT_TYPES.map(({ key, label, icon }) => (
            <div key={key} className={styles.soundRow}>
              <label className={styles.soundLabel}>
                {icon} {label}
              </label>
              <div className={styles.soundActions}>
                <input
                  ref={(el) => { fileInputs.current[key] = el; }}
                  type="file"
                  accept=".mp3,.wav,.ogg"
                  onChange={() => handleFileSelect(key)}
                  className={styles.fileInput}
                />
                <button
                  onClick={() => fileInputs.current[key]?.click()}
                  disabled={uploading === key}
                  className={`sf-btn ${styles.uploadBtn}`}
                  style={{
                    border: `1px solid #7c3aed66`,
                    background: `${'#7c3aed'}18`,
                    color: '#7c3aed',
                  }}
                >
                  {uploading === key ? 'Subiendo...' : sounds[key] ? '🔄 Cambiar' : '📂 Seleccionar MP3'}
                </button>

                {sounds[key] ? (
                  <>
                    <span className={styles.fileName}>
                      {sounds[key]}
                    </span>
                    <button
                      onClick={() => playSound(key)}
                      disabled={testingSound === key}
                      className={`${styles.smallBtn} ${styles.playBtn} ${testingSound === key ? styles['playBtn--playing'] : ''}`}
                      title="Reproducir sonido"
                    >
                      ▶️
                    </button>
                    <button
                      onClick={() => removeSound(key)}
                      className={`${styles.smallBtn} ${styles.removeBtn}`}
                      title="Eliminar sonido"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className={styles.noSound}>
                    Sin sonido — no se reproducirá nada para este tipo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Test Alerts ── */}
      <div className={`glass-card ${styles.testCard}`}>
        <p className={`sf-section-title ${styles.testTitle}`}>
          🧪 Probar Alertas
        </p>
        <p className={styles.testDesc}>
          Enviá una alerta de prueba al canal <strong>#{channel}</strong>.
          Si tenés un overlay de alertas abierto en OBS, deberías verlo aparecer al instante.
        </p>
        <div className={styles.testButtons}>
          {TEST_TYPES.map(({ type, label, color }) => (
            <button
              key={type}
              onClick={() => testAlert(type)}
              disabled={testing !== null || !channel}
              className={styles.testBtn}
              style={btnStyle(color, testing === type)}
            >
              {testing === type ? '✅ Enviado' : label}
            </button>
          ))}
        </div>
        {!channel && (
          <p className={styles.testNote}>
            Ingresá un canal en la barra superior para poder probar las alertas.
          </p>
        )}
      </div>
    </div>
  );
}
