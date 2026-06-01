import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';

interface Props {
  channel: string;
}

interface ChatMsg {
  id: string;
  user: { displayName: string; color: string };
  text: string;
}

const MAX_MSGS = 100;

export function ChatPanel({ channel }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { socket, connected } = useSocket();
  const listRef = useRef<HTMLDivElement>(null);

  useSocketEvent('chat:message', useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.slice(-MAX_MSGS + 1), msg]);
  }, []));

  useEffect(() => {
    if (!channel || !socket) return;
    socket.emit('join:channel', channel);
    return () => { socket.emit('leave:channel', channel); };
  }, [channel, socket]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function openOverlayWindow() {
    if (!channel) return;
    if (window.streamforger) {
      window.streamforger.overlay.open(channel, false, '');
      setOverlayOpen(true);
    }
  }

  function closeOverlayWindow() {
    if (window.streamforger) {
      window.streamforger.overlay.close();
      setOverlayOpen(false);
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💬 Chat en vivo
          </h2>
          <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
            Mensajes del chat en tiempo real
          </p>
        </div>

        {window.streamforger && (
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {!overlayOpen ? (
              <button
                onClick={openOverlayWindow}
                disabled={!channel}
                className="sf-btn sf-btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.875rem' }}
              >
                🪟 Abrir ventana transparente
              </button>
            ) : (
              <button
                onClick={closeOverlayWindow}
                className="sf-btn sf-btn-danger"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.875rem' }}
              >
                ✕ Cerrar overlay
              </button>
            )}
          </div>
        )}
      </div>

      {/* Connection status */}
      {!channel && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--sf-radius-sm)', fontSize: '0.82rem', color: '#fbbf24', textAlign: 'center',
        }}>
          Ingresa un canal de Twitch en la barra superior
        </div>
      )}

      {channel && !connected && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--sf-radius-sm)', fontSize: '0.82rem', color: '#f87171', textAlign: 'center',
        }}>
          Desconectado del servidor. Reintentando...
        </div>
      )}

      {/* Chat messages */}
      <div
        className="glass-card"
        style={{
          height: 500, overflowY: 'auto', padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.375rem',
        }}
        ref={listRef}
      >
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--sf-text-3)', fontSize: '0.85rem', textAlign: 'center',
          }}>
            {channel && connected
              ? 'Esperando mensajes del chat...'
              : 'Los mensajes aparecerán aquí'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.03)',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: msg.user.color || '#a78bfa', fontWeight: 600, fontSize: '0.82rem', marginRight: '0.5rem' }}>
                  {msg.user.displayName}
                </span>
                <span style={{ color: 'var(--sf-text-2)', fontSize: '0.82rem', wordBreak: 'break-word' }}>
                  {msg.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Info */}
      <div style={{
        marginTop: '1rem', fontSize: '0.75rem', color: 'var(--sf-text-3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>Conectado a: <strong style={{ color: 'var(--sf-text-2)' }}>#{channel || '—'}</strong></span>
        <span>{messages.length} mensajes</span>
      </div>
    </div>
  );
}
