import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import styles from './PreviewPanel.module.css';

interface Props {
  channel: string;
}

export function PreviewPanel({ channel }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          {t('preview.title')}
        </h2>
        <p className={styles.subtitle}>
          {t('preview.subtitle')}
        </p>
      </div>

      {!channel ? (
        <div className={`glass-card ${styles.emptyCard}`}>
          <div className={styles.emptyIcon}>📺</div>
          <p className={styles.emptyText}>
            {t('preview.emptyState')}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.topBar}>
            <a
              href={`https://twitch.tv/${channel}`}
              target="_blank"
              rel="noreferrer"
              className={`sf-btn sf-btn-primary ${styles.twitchBtn}`}
            >
              {t('preview.abrirEnTwitch')}
            </a>
            {loading && (
              <span className={styles.loadingHint}>
                {t('preview.cargando')}
              </span>
            )}
          </div>

          <motion.div
            initial={{ y: 10 }}
            animate={{ y: 0 }}
            className={`glass-card ${styles.playerCard}`}
          >
            <div className={styles.playerWrapper}>
              <iframe
                key={channel}
                src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&parent=localhost&parent=127.0.0.1&muted=true`}
                onLoad={() => setLoading(false)}
                className={styles.iframe}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                }}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </motion.div>

          <div className={styles.tipBox}>
            {t('preview.tip', { hostname: window.location.hostname })}
          </div>
        </>
      )}
    </div>
  );
}