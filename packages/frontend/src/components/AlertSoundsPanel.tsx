import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPut, apiPost } from '../utils/api';

interface Props {
  channel: string;
  backendUrl?: string;
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

  const inputBtnStyle: React.CSSProperties = {
    ...btnStyle('#7c3aed', false),
    minWidth: 140,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: '0.35rem 0.65rem',
    borderRadius: 6,
    border: '1px solid var(--sf-border)',
    background: 'transparent',
    color: 'var(--sf-text-3)',
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 600 }}>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.85rem' }}>Cargando configuración de sonidos...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          🔊 Sonidos de Alertas
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Seleccioná un archivo MP3 desde tu computadora para cada tipo de alerta.
          Se guardarán automáticamente y se reproducirán en los overlays temáticos.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {ALERT_TYPES.map(({ key, label, icon }) => (
            <div key={key}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.4rem', display: 'block' }}>
                {icon} {label}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  ref={(el) => { fileInputs.current[key] = el; }}
                  type="file"
                  accept=".mp3,.wav,.ogg"
                  onChange={() => handleFileSelect(key)}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputs.current[key]?.click()}
                  disabled={uploading === key}
                  style={inputBtnStyle}
                >
                  {uploading === key ? 'Subiendo...' : sounds[key] ? '🔄 Cambiar' : '📂 Seleccionar MP3'}
                </button>

                {sounds[key] ? (
                  <>
                    <span style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sounds[key]}
                    </span>
                    <button
                      onClick={() => playSound(key)}
                      disabled={testingSound === key}
                      style={{ ...smallBtnStyle, color: testingSound === key ? '#34d399' : '#22d3ee', borderColor: testingSound === key ? 'rgba(52,211,153,0.3)' : 'var(--sf-border)' }}
                      title="Reproducir sonido"
                    >
                      {testingSound === key ? '▶️' : '▶️'}
                    </button>
                    <button
                      onClick={() => removeSound(key)}
                      style={{ ...smallBtnStyle, color: '#f87171' }}
                      title="Eliminar sonido"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', fontStyle: 'italic' }}>
                    Sin sonido — no se reproducirá nada para este tipo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Test Alerts ── */}
      <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <p className="sf-section-title" style={{ marginBottom: '0.75rem' }}>
          🧪 Probar Alertas
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Enviá una alerta de prueba al canal <strong style={{ color: 'var(--sf-text)' }}>#{channel}</strong>.
          Si tenés un overlay de alertas abierto en OBS, deberías verlo aparecer al instante.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {TEST_TYPES.map(({ type, label, color }) => (
            <button
              key={type}
              onClick={() => testAlert(type)}
              disabled={testing !== null || !channel}
              style={btnStyle(color, testing === type)}
            >
              {testing === type ? '✅ Enviado' : label}
            </button>
          ))}
        </div>
        {!channel && (
          <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.75rem' }}>
            Ingresá un canal en la barra superior para poder probar las alertas.
          </p>
        )}
      </div>
    </div>
  );
}
