import { useState } from 'react';

interface Props {
  channel: string;
}

interface OBSUrl {
  id: string;
  icon: string;
  label: string;
  description: string;
  mode: string;
  supportsTheme: boolean;
  color: string;
}

const OBS_URLS: OBSUrl[] = [
  {
    id: 'chat',
    icon: '💬',
    label: 'Chat Overlay',
    description: 'Mensajes del chat en tiempo real con animaciones temáticas',
    mode: 'chat',
    supportsTheme: true,
    color: '#7c3aed',
  },
  {
    id: 'giveaway',
    icon: '🎁',
    label: 'Sorteos',
    description: 'Notificaciones de sorteos activos y anuncio del ganador',
    mode: 'giveaway',
    supportsTheme: true,
    color: '#10b981',
  },
  {
    id: 'prediction',
    icon: '📊',
    label: 'Predicciones',
    description: 'Estado y resultados de predicciones de Twitch en vivo',
    mode: 'prediction',
    supportsTheme: true,
    color: '#f59e0b',
  },
  {
    id: 'social',
    icon: '🌐',
    label: 'Redes Sociales',
    description: 'Overlay animado con enlaces a redes sociales del canal',
    mode: 'social',
    supportsTheme: false,
    color: '#06b6d4',
  },
];

const THEMES = [
  { id: '', label: 'Sin tema' },
  { id: 'subnautica2', label: '🌊 Subnautica 2' },
  { id: 'poe2', label: '⚔️ Path of Exile 2' },
  { id: 'wow', label: '🛡️ World of Warcraft' },
];

export function ObsPanel({ channel }: Props) {
  const [selectedTheme, setSelectedTheme] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = 'http://localhost:5173';

  function buildUrl(mode: string, supportsTheme: boolean): string {
    let url = `${baseUrl}/overlay.html?mode=${mode}`;
    if (channel) url += `&channel=${channel}`;
    if (supportsTheme && selectedTheme) url += `&theme=${selectedTheme}`;
    return url;
  }

  async function copyToClipboard(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          URLs para OBS Browser Source
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Copia la URL y agrégala en OBS como <strong style={{ color: 'var(--sf-text)' }}>Browser Source</strong>.
          Resolución recomendada: <code style={{ background: 'rgba(124,58,237,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, color: '#a78bfa' }}>1920×1080</code>
        </p>
      </div>

      {/* Theme selector */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sf-text-2)', whiteSpace: 'nowrap' }}>
          🎨 Tema visual
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTheme(t.id)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 99,
                border: '1px solid',
                borderColor: selectedTheme === t.id ? 'var(--sf-primary)' : 'var(--sf-border)',
                background: selectedTheme === t.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: selectedTheme === t.id ? '#a78bfa' : 'var(--sf-text-3)',
                fontSize: '0.78rem',
                fontWeight: selectedTheme === t.id ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* URL Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {OBS_URLS.map((item) => {
          const url = buildUrl(item.mode, item.supportsTheme);
          const isCopied = copied === item.id;
          return (
            <div
              key={item.id}
              className="glass-card"
              style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
            >
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${item.color}22`,
                border: `1px solid ${item.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem',
              }}>
                {item.icon}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--sf-text)' }}>{item.label}</span>
                  {item.supportsTheme && selectedTheme && (
                    <span className="sf-badge sf-badge-violet" style={{ fontSize: '0.6rem' }}>
                      {THEMES.find(t => t.id === selectedTheme)?.label}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', marginBottom: '0.625rem' }}>
                  {item.description}
                </p>
                <code style={{
                  fontSize: '0.72rem',
                  color: 'var(--sf-text-2)',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 6,
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--sf-border)',
                }}>
                  {url}
                </code>
              </div>

              {/* Copy button */}
              <button
                id={`copy-${item.id}`}
                onClick={() => copyToClipboard(item.id, url)}
                className={`sf-btn ${isCopied ? 'sf-btn-ghost' : 'sf-btn-primary'}`}
                style={{ flexShrink: 0, minWidth: 90, fontSize: '0.78rem', padding: '0.45rem 0.875rem' }}
              >
                {isCopied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Help note */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        background: 'rgba(6,182,212,0.06)',
        border: '1px solid rgba(6,182,212,0.15)',
        borderRadius: 'var(--sf-radius)',
        fontSize: '0.8rem',
        color: 'var(--sf-text-2)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: '#22d3ee' }}>💡 Tip:</strong> En OBS, ve a <em>Fuentes → + → Browser</em> y pega la URL.
        Asegúrate de que StreamForger esté corriendo para que el overlay reciba datos en tiempo real.
      </div>
    </div>
  );
}
