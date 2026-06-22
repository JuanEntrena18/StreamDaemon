import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { useSocketEvent } from '../hooks/useSocket';

const MAX_MSGS = 100;

export interface ChatMsg {
  id: string;
  user: {
    id: string;
    displayName: string;
    color: string;
    badges: string[];
  };
  text: string;
  timestamp: number;
}

interface ChatContextValue {
  messages: ChatMsg[];
  onNewMessage: (cb: () => void) => () => void;
}

const ChatContext = createContext<ChatContextValue>({
  messages: [],
  onNewMessage: () => () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const handlersRef = useRef<Set<() => void>>(new Set());

  const onNewMessage = useCallback((cb: () => void) => {
    handlersRef.current.add(cb);
    return () => { handlersRef.current.delete(cb); };
  }, []);

  useSocketEvent('chat:message', useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.slice(-MAX_MSGS + 1), msg]);
    handlersRef.current.forEach((h) => h());
  }, []));

  return (
    <ChatContext.Provider value={{ messages, onNewMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
