import { useEffect, useState, useRef } from 'react';
import { useTranslation } from '../i18n/context';
import { Logo } from './Logo';
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

    // Progress animation (simulated until backend responds)
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / MAX_WAIT) * 100, 95);
      setProgress(pct);
    }, 100);

    // Poll backend
    const pollInterval = setInterval(poll, POLL_INTERVAL);
    poll();

    // Max fallback
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
      <div className={styles.bgGlow} style={{
        background: `
          radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,58,237,0.15) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 50% 80%, rgba(99,102,241,0.1) 0%, transparent 70%)
        `,
      }} />

      <div className={styles.content}>
        <div className="animate-float">
          <Logo size={80} />
        </div>

        <div className={styles.titleWrap}>
          <h1 className={styles.title}>StreamForger</h1>
          <p className={styles.tagline}>Open-source stream tools, forged for creators.</p>
        </div>

        <div className={styles.divider} />

        <div className={styles.version}>
          <div>v0.4.2</div>
          <div>by Cyber Haute Couture</div>
        </div>

        <a
          href="https://github.com/JuanEntrena18/StreamForge"
          target="_blank" rel="noreferrer"
          className={styles.ghLink}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          github.com/JuanEntrena18/StreamForge
        </a>

        <a
          href="https://buymeacoffee.com/jentrena"
          target="_blank" rel="noreferrer"
          className={styles.bmcLink}
        >
          {t('splash.apoya')}
        </a>

        <div className={styles.loadingRow}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={`${styles.loadingLabel} ${status === 'connected' ? styles.loadingLabelSuccess : ''}`}>
            <span className={`${styles.loadingDot} ${status === 'connected' ? styles.loadingDotSuccess : ''}`} />
            {status === 'connecting' && (t('splash.cargando') || 'Conectando con el backend...')}
            {status === 'connected' && (t('splash.conectado') || '¡Conectado!')}
            {status === 'timeout' && (t('splash.timeout') || 'Continuando...')}
          </span>
        </div>
      </div>
    </div>
  );
}

