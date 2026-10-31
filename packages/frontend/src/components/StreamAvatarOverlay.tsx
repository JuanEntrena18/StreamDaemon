import { useEffect, useRef, useState } from 'react';
import { LipSyncEngine } from '../stream-avatar/engine/LipSyncEngine.js';
import { createAvatarRenderer, type AvatarRenderer } from '../stream-avatar/renderer/index.js';
import { useStreamAvatarConfig } from '../stream-avatar/store/streamAvatarStore.js';
import styles from './StreamAvatarOverlay.module.css';

interface Props {
  channel: string;
  demo?: boolean;
}

export function StreamAvatarOverlay({ channel, demo = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);
  const engineRef = useRef<LipSyncEngine | null>(null);
  const { config, loading } = useStreamAvatarConfig();
  const [error, setError] = useState<string | null>(null);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current || loading) return;

    setError(null);
    try {
      rendererRef.current?.destroy();
    } catch {}

    const renderer = createAvatarRenderer(canvasRef.current, config);
    rendererRef.current = renderer;

    renderer.init().catch((e) => {
      console.error('[stream-avatar] Renderer init failed', e);
      setError('No se pudo iniciar el renderizador del avatar');
    });

    return () => {
      try {
        rendererRef.current?.destroy();
      } catch {}
      rendererRef.current = null;
    };
  }, [loading, config.avatarId]);

  // Update renderer when config changes
  useEffect(() => {
    rendererRef.current?.updateConfig(config);
  }, [config]);

  // Start/stop lip-sync engine
  useEffect(() => {
    if (demo || !config.enabled || !rendererRef.current) return;

    const engine = new LipSyncEngine(config);
    engineRef.current = engine;

    const unsubscribe = engine.onFrame((state) => {
      rendererRef.current?.setViseme(state.viseme, state.volume);
    });

    engine.start(config.audioDeviceId).catch((e) => {
      console.error('[stream-avatar] Failed to start microphone', e);
      setError('No se pudo acceder al micrófono');
    });

    return () => {
      unsubscribe();
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, [
    config.enabled,
    config.avatarId,
    config.audioDeviceId,
    config.micSensitivity,
    config.smoothing,
    config.noiseGate,
    demo,
  ]);

  // Demo mode: simulate talking
  useEffect(() => {
    if (!demo || !rendererRef.current) return;

    const visemes = ['closed', 'slight', 'open', 'wide', 'round', 'open', 'slight'] as const;
    let i = 0;
    const interval = setInterval(() => {
      rendererRef.current?.setViseme(visemes[i % visemes.length], 0.55);
      i++;
    }, 240);

    return () => clearInterval(interval);
  }, [demo, config.avatarId]);

  return (
    <div className={styles.root} data-channel={channel}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
