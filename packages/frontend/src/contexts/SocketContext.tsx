import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

const isElectron = typeof window !== 'undefined' && !!window.streamforger?.isDesktop;

async function fetchLocalToken(): Promise<string | undefined> {
  if (isElectron) return undefined;
  try {
    const res = await fetch(`${SOCKET_URL}/auth/token`);
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.token;
  } catch {
    return undefined;
  }
}

let globalSocket: Socket | null = null;

function getOrCreateSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: async (cb: (token?: string) => void) => {
        const token = await fetchLocalToken();
        cb(token);
      },
    });
  }
  return globalSocket;
}

export interface SocketContextValue {
  socket: Socket;
  connected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket>(getOrCreateSocket());
  const socket = socketRef.current;
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    socket.connect();
    if (socket.connected) {
      setConnected(true);
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError = (err: Error) => console.error('Socket error:', err.message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, [socket]);

  const reconnect = useCallback(() => {
    socket.disconnect();
    socket.connect();
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, connected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return ctx;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (ctx) {
    return ctx;
  }
  // Fallback for components rendered outside a provider (e.g. legacy overlays)
  const socket = getOrCreateSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return {
    socket,
    connected: socket.connected,
    reconnect: () => {
      socket.disconnect();
      socket.connect();
    },
  };
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const cb = (data: T) => handlerRef.current(data);
    socket.on(event, cb);
    return () => {
      socket.off(event, cb);
    };
  }, [socket, event]);
}
