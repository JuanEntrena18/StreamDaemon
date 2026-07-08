import { useRef, useEffect, useCallback, useState } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { AvatarEngine } from '../avatars/AvatarEngine';
import { useAvatarConfig } from '../avatars/avatarStore';


interface Props {
  channel: string;
  demo?: boolean;
}

/**
 * Overlay component that mounts the PixiJS canvas for avatars.
 * Used as a Browser Source in OBS (mode=avatars).
 */
export function AvatarOverlay({ channel, demo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AvatarEngine | null>(null);
  const { config } = useAvatarConfig();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config.enabled) return;

    const engine = new AvatarEngine(canvas, config);
    engineRef.current = engine;

    engine.init().catch((err) => {
      console.error('Failed to init PixiJS', err);
      setError(`WebGL Error: Asegúrate de tener activada la Aceleración por Hardware en la fuente de navegador de OBS.\nDetalle: ${err?.message || err}`);
    });

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [config.enabled, channel]);

  // Hook into the global socket
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  // Chat messages
  useSocketEvent('chat:message', useCallback((msg: any) => {
    if (engineRef.current) {
      engineRef.current.handleChatMessage(
        msg.user?.id || 'viewer',
        msg.user?.displayName || 'viewer',
        msg.user?.displayName || 'Viewer',
        msg.text || ''
      );
    }
  }, []));

  // Follow
  useSocketEvent('channel:follow', useCallback((data: any) => {
    if (engineRef.current) {
      engineRef.current.handleEvent({
        userId: data.userId || data.userName || `follow-${Date.now()}`,
        username: data.userName || 'viewer',
        displayName: data.userDisplayName || 'Viewer',
        type: 'follow'
      });
    }
  }, []));

  // Cheer / Bits
  useSocketEvent('channel:cheer', useCallback((data: any) => {
    if (engineRef.current) {
      engineRef.current.handleEvent({
        userId: data.userName || `cheer-${Date.now()}`,
        username: data.userName || 'viewer',
        displayName: data.userDisplayName || 'Viewer',
        type: 'bits',
        amount: data.bits
      });
    }
  }, []));

  // Subscribe
  useSocketEvent('channel:subscribe', useCallback((data: any) => {
    if (engineRef.current) {
      engineRef.current.handleEvent({
        userId: data.userName || `sub-${Date.now()}`,
        username: data.userName || 'viewer',
        displayName: data.userDisplayName || 'Viewer',
        type: 'subscription',
        tier: data.tier
      });
    }
  }, []));

  // Raid
  useSocketEvent('channel:raid', useCallback((data: any) => {
    if (engineRef.current) {
      engineRef.current.handleEvent({
        userId: data.fromChannel || `raid-${Date.now()}`,
        username: data.fromChannel || 'viewer',
        displayName: data.fromDisplayName || 'Viewer',
        type: 'raid'
      });
    }
  }, []));

  // Update config when it changes (without re-creating the engine)
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(config);
    }
  }, [config]);

  // Demo mode
  useEffect(() => {
    if (!demo) return;
    
    let timeoutId: ReturnType<typeof setTimeout>;
    let counter = 0;
    const mockNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'];

    const tick = () => {
      const engine = engineRef.current;
      if (engine && config.enabled) {
        counter++;
        const name = mockNames[counter % mockNames.length];
        const userId = `demo-${name}`;

        const rand = Math.random();
        if (rand < 0.2) {
          engine.handleChatMessage(userId, name.toLowerCase(), name, '!jump');
        } else if (rand < 0.4) {
          engine.handleChatMessage(userId, name.toLowerCase(), name, '!dance');
        } else if (rand < 0.6) {
          engine.handleEvent({
            userId, username: name.toLowerCase(), displayName: name, type: 'bits', amount: Math.floor(Math.random() * 500) + 10
          });
        } else if (rand < 0.7) {
          engine.handleEvent({
            userId, username: name.toLowerCase(), displayName: name, type: 'follow'
          });
        } else {
          engine.handleChatMessage(userId, name.toLowerCase(), name, 'Hello everyone! LURK');
        }
      }
      timeoutId = setTimeout(tick, Math.random() * 2000 + 1000);
    };

    // Delay start slightly
    timeoutId = setTimeout(tick, 1000);

    return () => clearTimeout(timeoutId);
  }, [demo, config.enabled]);

  if (!config.enabled) {
    return null;
  }

  return (
    <>
      {error && (
        <div style={{
          position: 'absolute', top: 20, left: 20, right: 20,
          background: 'rgba(255,0,0,0.8)', color: 'white',
          padding: '20px', borderRadius: '8px', fontSize: '24px',
          fontFamily: 'sans-serif', zIndex: 9999
        }}>
          {error}
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
