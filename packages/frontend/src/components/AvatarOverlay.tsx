import { useRef, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { AvatarEngine } from '../avatars/AvatarEngine';
import { useAvatarConfig } from '../avatars/avatarStore';


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
      // We'll use the component hooks to attach socket events
      // to the existing socket, instead of creating a new raw one.
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
        userId: data.userId || `follow-${Date.now()}`,
        username: data.userLogin || 'viewer',
        displayName: data.userName || 'Viewer',
        type: 'follow'
      });
    }
  }, []));

  // Cheer / Bits
  useSocketEvent('channel:cheer', useCallback((data: any) => {
    if (engineRef.current) {
      engineRef.current.handleEvent({
        userId: data.userId || `cheer-${Date.now()}`,
        username: data.userLogin || 'viewer',
        displayName: data.userName || 'Viewer',
        type: 'bits',
        amount: data.bits
      });
    }
  }, []));

  // Subscribe
  useSocketEvent('channel:subscribe', useCallback((data: any) => {
    if (engineRef.current) {
      engineRef.current.handleEvent({
        userId: data.userId || `sub-${Date.now()}`,
        username: data.userLogin || 'viewer',
        displayName: data.userName || 'Viewer',
        type: 'subscription',
        tier: data.tier
      });
    }
  }, []));

  // Raid
  useSocketEvent('channel:raid', useCallback((data: any) => {
    if (engineRef.current) {
      engineRef.current.handleEvent({
        userId: data.raidingBroadcasterId || `raid-${Date.now()}`,
        username: data.raidingBroadcasterLogin || 'viewer',
        displayName: data.raidingBroadcasterName || 'Viewer',
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
