import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ChatMessage } from '@streamforger/shared';

const MAX_MESSAGES = 50;

interface Props {
  channel: string;
}

export function ChatOverlay({ channel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { socket } = useSocket();

  useSocketEvent('chat:message', useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
  }, []));

  if (channel && socket) {
    socket.emit('join:channel', channel);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 max-w-lg">
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: 'var(--theme-border)',
                boxShadow: 'var(--theme-glow)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <span
                className="font-bold text-sm shrink-0"
                style={{ color: msg.user.color }}
              >
                {msg.user.displayName}
              </span>
              <span className="text-sm leading-relaxed break-words">
                {msg.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
