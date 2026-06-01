import { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface Props {
  onReady: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export function SplashScreen({ onReady }: Props) {
  const isDesktop = !!window.streamforger?.isDesktop;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isDesktop) {
      // Desktop: backend already started before window opened.
      // Show splash 1.5s for aesthetics, then transition.
      const t = setTimeout(() => setReady(true), 1500);
      return () => clearTimeout(t);
    }

    // Browser: poll backend until ready
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${BACKEND_URL}/auth/status`, { signal: AbortSignal.timeout(5000) });
        if (cancelled) return;
        if (res.ok) { setReady(true); return; }
      } catch {
        // Backend not ready yet
      }
      attempts++;
      if (cancelled) return;
      setTimeout(check, Math.min(1000 + attempts * 200, 3000));
    };

    setTimeout(check, 300);
    return () => { cancelled = true; };
  }, [isDesktop]);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(onReady, 400);
      return () => clearTimeout(t);
    }
  }, [ready, onReady]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--sf-bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,58,237,0.15) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 50% 80%, rgba(99,102,241,0.1) 0%, transparent 70%)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div className="animate-float">
          <Logo size={80} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--sf-text)', margin: 0,
          }}>
            StreamForger
          </h1>
          <p style={{
            fontSize: '0.85rem', color: 'var(--sf-text-3)',
            marginTop: '0.3rem', fontWeight: 400,
          }}>
            Open-source stream tools, forged for creators.
          </p>
        </div>

        <div style={{
          width: 200, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)',
        }} />

        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--sf-text-2)', lineHeight: 1.8 }}>
          <div>v0.2.0</div>
          <div>by Cyber Haute Couture</div>
        </div>

        <a
          href="https://github.com/JuanEntrena18/StreamForge"
          target="_blank" rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 1rem',
            borderRadius: 99,
            background: 'rgba(124,58,237,0.1)',
            border: '1px solid rgba(124,58,237,0.2)',
            color: '#a78bfa',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 500,
            transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          github.com/JuanEntrena18/StreamForge
        </a>

        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: ready ? 'var(--sf-success)' : '#7c3aed',
            opacity: ready ? 1 : 0.4,
            animation: ready ? 'none' : 'pulse-spinner 1s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)' }}>
            {ready ? '¡Listo!' : 'Cargando…'}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse-spinner {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}