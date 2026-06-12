import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  channel: string;
}

export function PreviewPanel({ channel }: Props) {
  const [loading, setLoading] = useState(true);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📺 Vista previa
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Previsualiza tu canal de Twitch directamente desde la aplicación
        </p>
      </div>

      {!channel ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📺</div>
          <p style={{ color: 'var(--sf-text-3)', fontSize: '0.9rem' }}>
            Ingresa un canal de Twitch en la barra superior para ver la vista previa
          </p>
        </div>
      ) : (
        <>
          <div style={{
            marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <a
              href={`https://twitch.tv/${channel}`}
              target="_blank"
              rel="noreferrer"
              className="sf-btn sf-btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem', textDecoration: 'none' }}
            >
              ↗ Abrir en Twitch
            </a>
            {loading && (
              <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)' }}>
                Cargando...
              </span>
            )}
          </div>

          <motion.div
            initial={{ y: 10 }}
            animate={{ y: 0 }}
            className="glass-card"
            style={{ padding: '0.25rem', overflow: 'hidden' }}
          >
            <div style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%',
              borderRadius: 'var(--sf-radius-sm)',
              overflow: 'hidden',
              background: '#0a0a1a',
            }}>
              <iframe
                key={channel}
                src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&parent=localhost&parent=127.0.0.1&muted=true`}
                onLoad={() => setLoading(false)}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  border: 'none',
                }}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </motion.div>

          <div style={{
            marginTop: '0.75rem', padding: '0.75rem 1rem',
            background: 'rgba(6,182,212,0.06)',
            border: '1px solid rgba(6,182,212,0.15)',
            borderRadius: 'var(--sf-radius-sm)',
            fontSize: '0.75rem',
            color: 'var(--sf-text-3)',
            lineHeight: 1.5,
          }}>
            💡 Usa el reproductor embebido de Twitch para verificar que tu emisión llega correctamente a OBS.
            Asegúrate de que <strong style={{ color: 'var(--sf-text-2)' }}>localhost, 127.0.0.1 y {window.location.hostname}</strong> estén agregados como dominios permitidos en el
            {' '}<a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer" style={{ color: '#22d3ee' }}>Twitch Developer Console</a>.
          </div>
        </>
      )}
    </div>
  );
}