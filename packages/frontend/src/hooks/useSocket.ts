import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';

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

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    return () => {
      s.off('connect');
      s.off('disconnect');
    };
  }, [s]);

  return { socket: s, connected };
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const s = getSocket();

  useEffect(() => {
    s.on(event, handler);
    return () => { s.off(event, handler); };
  }, [s, event, handler]);
}
