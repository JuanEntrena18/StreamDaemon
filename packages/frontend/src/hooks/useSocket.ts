import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const s = getSocket();

  useEffect(() => {
    s.connect();
    if (s.connected) {
      setConnected(true);
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError = (err: Error) => console.error('Socket error:', err.message);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onError);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onError);
    };
  }, [s]);

  const reconnect = useCallback(() => {
    s.disconnect();
    s.connect();
  }, [s]);

  return { socket: s, connected, reconnect };
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const s = getSocket();

  useEffect(() => {
    s.on(event, handler);
    return () => { s.off(event, handler); };
  }, [s, event, handler]);
}
