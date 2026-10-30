import { useEffect, useState, useRef } from 'react';
import { useTranslation } from '../i18n/context';
import { Logo } from './Logo';
import { APP_VERSION_LABEL } from '../version';
import styles from './SplashScreen.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
const POLL_INTERVAL = 500;
const MAX_WAIT = 5000;

interface Props {
  onReady: () => void;
}

export function SplashScreen({ onReady }: Props) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'timeout'>('connecting');
  const calledRef = useRef(false);

  useEffect(() => {
    const startTime = Date.now();

    const poll = async () => {
      if (calledRef.current) return;
      try {
        const r = await fetch(`${BACKEND_URL}/auth/status`, { signal: AbortSignal.timeout(3000) });
        if (r.ok && !calledRef.current) {
          calledRef.current = true;
          setProgress(100);
          setStatus('connected');
          setTimeout(onReady, 400);
        }
      } catch {}
    };

    // Progreso simulado hasta que el backend responda
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / MAX_WAIT) * 100, 95);
      setProgress(pct);
    }, 100);

    const pollInterval = setInterval(poll, POLL_INTERVAL);
    poll();

    const fallback = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        setProgress(100);
        setStatus('timeout');
        setTimeout(onReady, 400);
      }
    }, MAX_WAIT);

    return () => {
      clearInterval(progressInterval);
      clearInterval(pollInterval);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.bgGlow} />

      <div className={styles.content}>
        <Logo size={56} />

        <h1 className={styles.wordmark}>StreamDaemon</h1>

        <div className={styles.statusRow}>
          <span
            className={`${styles.statusDot} ${
              status === 'connected' ? styles.statusDotOk : ''
            }`}
          />
          <span className={styles.statusLabel}>
            {status === 'connecting' && (t('splash.cargando') || 'Conectando con el backend...')}
            {status === 'connected' && (t('splash.conectado') || 'Conectado')}
            {status === 'timeout' && (t('splash.timeout') || 'Continuando...')}
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <footer className={styles.footer}>
        <a
          href="https://github.com/JuanEntrena18/StreamForge"
          target="_blank"
          rel="noreferrer"
          className={styles.footerLink}
        >
          GitHub
        </a>
        <span className={styles.footerSep}>·</span>
        <a
          href="https://buymeacoffee.com/jentrena"
          target="_blank"
          rel="noreferrer"
          className={styles.footerLink}
        >
          {t('splash.apoya')}
        </a>
        <span className={styles.footerSep}>·</span>
        <span className={styles.footerVersion}>{APP_VERSION_LABEL}</span>
      </footer>
    </div>
  );
}
