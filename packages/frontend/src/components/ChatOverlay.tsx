import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ChatMessage } from '@streamforger/shared';

const MAX_MESSAGES = 50;

interface Props {
  channel: string;
  fontFamily?: string;
  fontSize?: number;
  bgMode?: 'transparent' | 'black';
}

export function ChatOverlay({ channel, fontFamily = "'Inter', sans-serif", fontSize = 14, bgMode = 'black' }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { socket, connected } = useSocket();
  const listRef = useRef<HTMLDivElement>(null);

  useSocketEvent('chat:message', useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
  }, []));

  useEffect(() => {
    if (channel && connected) {
      socket.emit('join:channel', channel);
    }
  }, [channel, connected, socket]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: bgMode === 'black' ? '#000' : 'transparent',
        fontFamily,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Messages area */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 6,
                background: `rgba(0,0,0,${bgMode === 'black' ? '0.3' : 'var(--bg-alpha,0.5)'})`,
                lineHeight: 1.45,
              }}
            >
              <span
                style={{
                  color: msg.user.color || '#a78bfa',
                  fontWeight: 700,
                  fontSize: `${fontSize}px`,
                  flexShrink: 0,
                }}
              >
                {msg.user.displayName}
              </span>
              <span
                style={{
                  color: bgMode === 'black' ? '#e2e8f0' : '#f1f5f9',
                  fontSize: `${fontSize}px`,
                  wordBreak: 'break-word',
                }}
              >
                {msg.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
