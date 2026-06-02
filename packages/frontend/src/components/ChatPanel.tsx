import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';

interface Props {
  channel: string;
}

interface ChatMsg {
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

const MAX_MSGS = 100;

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ channel }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; user: string } | null>(null);
  const [menuMsg, setMenuMsg] = useState<string | null>(null);
  const { socket, connected, reconnect } = useSocket();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useSocketEvent('chat:message', useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.slice(-MAX_MSGS + 1), msg]);
  }, []));

  useEffect(() => {
    if (!channel || !socket) return;
    const rejoin = () => socket.emit('join:channel', channel);
    rejoin();
    socket.on('connect', rejoin);
    return () => {
      socket.off('connect', rejoin);
      socket.emit('leave:channel', channel);
    };
  }, [channel, socket]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuMsg) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuMsg(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuMsg]);

  function send() {
    const text = input.trim();
    if (!text || !channel || !socket?.connected) return;
    if (replyTo) {
      socket.emit('chat:send', { channel, text: `@${replyTo.user} ${text}` });
    } else {
      socket.emit('chat:send', { channel, text });
    }
    setInput('');
    setReplyTo(null);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleReply(msg: ChatMsg) {
    setReplyTo({ id: msg.id, user: msg.user.displayName });
    inputRef.current?.focus();
  }

  function handleModAction(action: 'timeout' | 'ban', user: string) {
    if (!channel || !socket?.connected) return;
    const cmd = action === 'timeout' ? '/timeout' : '/ban';
    socket.emit('chat:send', { channel, text: `${cmd} ${user}` });
    setMenuMsg(null);
  }

  const [overlayOpacity, setOverlayOpacity] = useState(0.9);
  const [overlaySize, setOverlaySize] = useState<'sm' | 'md' | 'lg'>('md');

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

  function changeOverlaySize(size: 'sm' | 'md' | 'lg') {
    setOverlaySize(size);
    const dims = { sm: [300, 450], md: [400, 600], lg: [550, 800] };
    if (window.streamforger) {
      window.streamforger.overlay.resize(dims[size][0], dims[size][1]);
    }
  }

  function changeOverlayOpacity(val: number) {
    setOverlayOpacity(val);
    if (window.streamforger) {
      window.streamforger.overlay.setOpacity(val);
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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

      {/* Overlay controls */}
      {overlayOpen && window.streamforger && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{
            marginBottom: '0.75rem', padding: '0.75rem 1rem',
            background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: 'var(--sf-radius)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--sf-text-2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🪟 Control del overlay
            </span>
            <button onClick={closeOverlayWindow} className="sf-btn sf-btn-danger" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
              ✕ Cerrar
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Size presets */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => changeOverlaySize(s)}
                  style={{
                    padding: '0.25rem 0.6rem', borderRadius: 4, border: '1px solid',
                    borderColor: overlaySize === s ? 'var(--sf-primary)' : 'var(--sf-border)',
                    background: overlaySize === s ? 'rgba(124,58,237,0.2)' : 'transparent',
                    color: overlaySize === s ? '#a78bfa' : 'var(--sf-text-3)',
                    fontSize: '0.68rem', fontWeight: overlaySize === s ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase',
                  }}
                >{s === 'sm' ? 'Peq' : s === 'md' ? 'Med' : 'Grande'}</button>
              ))}
            </div>
            {/* Opacity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: 1, maxWidth: 180 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)' }}>Opacidad</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => changeOverlayOpacity(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#7c3aed' }}
              />
            </div>
          </div>
        </motion.div>
      )}

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
          borderRadius: 'var(--sf-radius-sm)', fontSize: '0.82rem', color: '#f87171',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
        }}>
          <span>Desconectado del servidor.</span>
          <button onClick={reconnect} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
            Reconectar
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        className="glass-card"
        style={{
          height: 420, overflowY: 'auto', padding: '0.5rem',
          display: 'flex', flexDirection: 'column', gap: '1px',
          marginBottom: '0.625rem',
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
                  padding: '0.35rem 0.5rem',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.02)',
                  lineHeight: 1.45,
                  position: 'relative',
                }}
                onMouseEnter={() => setMenuMsg(msg.id)}
                onMouseLeave={() => setMenuMsg(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {/* Badges */}
                  {msg.user.badges?.map((b) => (
                    <span key={b} style={{ fontSize: '0.6rem', opacity: 0.6 }}>{badgeIcon(b)}</span>
                  ))}
                  {/* Name */}
                  <span style={{
                    color: msg.user.color || '#a78bfa', fontWeight: 600, fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                    onClick={() => setReplyTo({ id: msg.id, user: msg.user.displayName })}
                  >
                    {msg.user.displayName}
                  </span>
                  {/* Timestamp */}
                  <span style={{ fontSize: '0.6rem', color: 'var(--sf-text-3)', marginLeft: 'auto', opacity: 0.5 }}>
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <div style={{ color: 'var(--sf-text-2)', fontSize: '0.82rem', wordBreak: 'break-word', paddingLeft: 0 }}>
                  {msg.text}
                </div>

                {/* Action buttons (on hover) */}
                {menuMsg === msg.id && (
                  <div
                    ref={menuRef}
                    style={{
                      position: 'absolute', right: 4, top: 4,
                      display: 'flex', gap: '0.2rem',
                      background: 'var(--sf-bg-2)', border: '1px solid var(--sf-border)',
                      borderRadius: 6, padding: '0.2rem',
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={() => handleReply(msg)}
                      title="Responder"
                      style={btnMenuStyle}
                    >↩</button>
                    <button
                      onClick={() => handleModAction('timeout', msg.user.displayName)}
                      title="Timeout 5 min"
                      style={btnMenuStyle}
                    >⏳</button>
                    <button
                      onClick={() => handleModAction('ban', msg.user.displayName)}
                      title="Banear"
                      style={btnMenuStyle}
                    >🚫</button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div style={{
          padding: '0.3rem 0.75rem', marginBottom: '0.375rem',
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 'var(--sf-radius-sm)', fontSize: '0.78rem',
          color: 'var(--sf-text-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Respondiendo a <strong style={{ color: '#a78bfa' }}>@{replyTo.user}</strong></span>
          <button
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', color: 'var(--sf-text-3)', cursor: 'pointer', fontSize: '0.85rem' }}
          >✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={replyTo ? `Escribe tu respuesta a @${replyTo.user}...` : 'Escribe un mensaje...'}
          disabled={!channel || !connected}
          className="sf-input"
          style={{ flex: 1, fontSize: '0.82rem' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || !channel || !connected}
          className="sf-btn sf-btn-primary"
          style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}
        >
          Enviar
        </button>
      </div>

      {/* Info bar */}
      <div style={{
        marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--sf-text-3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>Conectado a: <strong style={{ color: 'var(--sf-text-2)' }}>#{channel || '—'}</strong></span>
        <span>{messages.length} mensajes · {connected ? '🟢' : '🔴'}</span>
      </div>
    </div>
  );
}

const btnMenuStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--sf-text-3)',
  cursor: 'pointer', padding: '0.15rem 0.35rem', borderRadius: 4,
  fontSize: '0.72rem', lineHeight: 1,
};

function badgeIcon(badge: string): string {
  const map: Record<string, string> = {
    broadcaster: '👑',
    moderator: '🛡️',
    vip: '⭐',
    subscriber: '🎗️',
    turbo: '⚡',
    partner: '✔️',
    bits: '💎',
    predictions: '🔮',
    'bits-leader': '🏆',
    no_audio: '🔇',
    no_video: '📹',
  };
  return map[badge] ?? '📛';
}
