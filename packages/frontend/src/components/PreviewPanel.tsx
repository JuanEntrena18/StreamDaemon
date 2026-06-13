import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';

interface Props {
  channel: string;
}

export function PreviewPanel({ channel }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {t('preview.title')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          {t('preview.subtitle')}
        </p>
      </div>

      {!channel ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📺</div>
          <p style={{ color: 'var(--sf-text-3)', fontSize: '0.9rem' }}>
            {t('preview.emptyState')}
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
              {t('preview.abrirEnTwitch')}
            </a>
            {loading && (
              <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)' }}>
                {t('preview.cargando')}
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
            {t('preview.tip', { hostname: window.location.hostname })}
          </div>
        </>
      )}
    </div>
  );
}