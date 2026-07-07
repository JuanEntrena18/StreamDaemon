import { useRef, useEffect } from 'react';
import { AvatarEngine } from '../avatars/AvatarEngine';
import { useAvatarConfig } from '../avatars/avatarStore';
import type { AvatarEventPayload } from '../avatars/types';

interface Props {
  channel: string;
}

/**
 * Overlay component that mounts the PixiJS canvas for avatars.
 * Used as a Browser Source in OBS (mode=avatars).
 */
export function AvatarOverlay({ channel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AvatarEngine | null>(null);
  const { config } = useAvatarConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config.enabled) return;

    const engine = new AvatarEngine(canvas, config);
    engineRef.current = engine;

    engine.init().then(() => {
      // Connect to WebSocket for Twitch events
      const backendUrl = new URLSearchParams(window.location.search).get('backend')
        || import.meta.env.VITE_BACKEND_URL
        || 'http://localhost:3000';

      import('socket.io-client').then(({ io }) => {
        const socket = io(backendUrl, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
          if (channel) socket.emit('join:channel', channel);
        });

        // Chat messages → command detection + avatar spawn
        socket.on('chat:message', (data: { userId: string; username: string; displayName: string; message: string }) => {
          engine.handleChatMessage(data.userId, data.username, data.displayName, data.message);
        });

        // Twitch events → avatar actions
        const eventTypes = ['follow', 'subscription', 'bits', 'raid'];
        for (const eventType of eventTypes) {
          socket.on(`twitch:${eventType}`, (data: any) => {
            const payload: AvatarEventPayload = {
              userId: data.userId || data.user_id || `${eventType}-${Date.now()}`,
              username: data.username || data.user_name || data.login || 'viewer',
              displayName: data.displayName || data.display_name || data.username || 'Viewer',
              type: eventType,
              message: data.message,
              amount: data.amount || data.bits,
              tier: data.tier,
            };
            engine.handleEvent(payload);
          });
        }

        // Clean up socket on unmount
        return () => {
          socket.disconnect();
        };
      });
    });

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [config.enabled, channel]);

  // Update config when it changes (without re-creating the engine)
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(config);
    }
  }, [config]);

  if (!config.enabled) {
    return null;
  }

  return (
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
  );
}
