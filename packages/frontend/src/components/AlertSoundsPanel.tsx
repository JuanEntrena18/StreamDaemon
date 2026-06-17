import { useState, useEffect } from 'react';
import { apiGet, apiPut, apiPost } from '../utils/api';
import { useTranslation } from '../i18n/context';

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

export function AlertSoundsPanel({ channel, backendUrl: _backendUrl }: Props) {
  const { t } = useTranslation();
  const [sounds, setSounds] = useState<SoundConfig>({ ...DEFAULT_SOUNDS });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/alert-sounds').then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setSounds({ ...DEFAULT_SOUNDS, ...data });
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    await apiPut('/alert-sounds', sounds);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const update = (key: keyof SoundConfig, value: string) => {
    setSounds((prev) => ({ ...prev, [key]: value }));
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

  const fields: { key: keyof SoundConfig; label: string; placeholder: string }[] = [
    { key: 'follow', label: '🔔 Seguidor (follow)', placeholder: 'URL del MP3 para follow...' },
    { key: 'subscribe', label: '⭐ Suscripción (sub)', placeholder: 'URL del MP3 para sub...' },
    { key: 'bits', label: '🎲 Bits / Cheers', placeholder: 'URL del MP3 para bits...' },
    { key: 'raid', label: '⚔️ Raid', placeholder: 'URL del MP3 para raid...' },
    { key: 'redemption', label: '🎯 Canje (redemption)', placeholder: 'URL del MP3 para canje...' },
  ];

  const buttonStyle = (color: string, isTesting: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: `1px solid ${color}66`,
    background: isTesting ? `${color}44` : `${color}18`,
    color: isTesting ? '#fff' : color,
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    flex: 1,
    minWidth: 120,
    textAlign: 'center',
  });

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
          Configura qué archivo MP3 se reproduce para cada tipo de alerta en los overlays temáticos.
          Los archivos deben estar accesibles desde el navegador (ruta relativa a <code style={{ background: 'rgba(124,58,237,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#a78bfa' }}>/overlays/</code> o URL absoluta).
        </p>
        <p style={{ color: 'var(--sf-text-3)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          Dejá el campo vacío para no reproducir sonido para ese tipo de alerta.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.3rem', display: 'block' }}>
                {label}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={sounds[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={placeholder}
                  className="sf-input"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.75rem', fontFamily: 'monospace' }}
                />
                {sounds[key] && (
                  <button
                    onClick={() => update(key, '')}
                    style={{
                      padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--sf-border)',
                      background: 'transparent', color: 'var(--sf-text-3)', cursor: 'pointer',
                      fontSize: '0.75rem', fontFamily: 'inherit',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={save}
            className="sf-btn sf-btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 1.25rem' }}
          >
            Guardar configuración
          </button>
          {saved && (
            <span style={{ fontSize: '0.78rem', color: '#34d399' }}>
              ✅ Configuración guardada
            </span>
          )}
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
              style={buttonStyle(color, testing === type)}
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

      <div style={{
        marginTop: '1.5rem', padding: '1rem 1.25rem',
        background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
        borderRadius: 'var(--sf-radius)', fontSize: '0.8rem', color: 'var(--sf-text-2)', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#22d3ee' }}>💡 Tip:</strong> Colocá tus archivos MP3 en la carpeta{' '}
        <code style={{ background: 'rgba(124,58,237,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#a78bfa' }}>
          packages/frontend/public/overlays/
        </code>{' '}
        y referencialos como <code style={{ background: 'rgba(124,58,237,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#a78bfa' }}>mi-sonido.mp3</code>.
        También podés usar URLs externas como <code style={{ background: 'rgba(124,58,237,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#a78bfa' }}>https://ejemplo.com/sonido.mp3</code>.
      </div>
    </div>
  );
}
