import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSocket } from '../hooks/useSocket';
import { SOUNDS, setMasterVolume, type SoundKey } from '../utils/sounds';
import { useTranslation } from '../i18n/context';
import { useChat, type ChatMsg } from '../contexts/ChatContext';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState } from './EmptyState';
import { ChatSoundSelector } from './ChatSoundSelector';
import { ChatTtsControls } from './ChatTtsControls';
import { ChatGreetingConfig } from './ChatGreetingConfig';
import { ChatOverlayControls } from './ChatOverlayControls';
import styles from './ChatPanel.module.css';

interface Props {
  channel: string;
}

function formatTimestamp(ts: number, locale: string): string {
  return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

interface ChatMessageProps {
  msg: ChatMsg;
  locale: string;
  menuMsg: string | null;
  onHover: (id: string | null) => void;
  onReply: (msg: ChatMsg) => void;
  onModAction: (action: 'timeout' | 'ban', user: string) => void;
  onConfirmMod: (action: 'timeout' | 'ban', user: string) => void;
}

const ChatMessage = memo(function ChatMessage({
  msg,
  locale,
  menuMsg,
  onHover,
  onReply,
  onModAction,
  onConfirmMod,
}: ChatMessageProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  return (
    <div
      className={styles.msgBubble}
      onMouseEnter={() => onHover(msg.id)}
      onMouseLeave={() => onHover(null)}
      data-message-id={msg.id}
    >
      <div className="flex-row flex-wrap" style={{ gap: '0.35rem' }}>
        {msg.user.badges?.map((b) => (
          <span key={b} className={styles.badgeIcon}>{badgeIcon(b)}</span>
        ))}
        <span
          className={styles.userName}
          style={{ color: msg.user.color || '#a78bfa' }}
          onClick={() => onReply(msg)}
        >
          {msg.user.displayName}
        </span>
        <span className={styles.timestamp}>{formatTimestamp(msg.timestamp, locale || 'es-ES')}</span>
      </div>
      <div className={styles.msgText}>{msg.text}</div>

      {menuMsg === msg.id && (
        <div ref={menuRef} className={styles.msgMenu}>
          <button onClick={() => onReply(msg)} title={t('chat.responder')} aria-label={t('chat.responder')} className={styles.menuBtn}>↩</button>
          <button onClick={() => onModAction('timeout', msg.user.displayName)} title={t('chat.timeout5m')} aria-label={t('chat.timeout5m')} className={styles.menuBtn}>⏳</button>
          <button onClick={() => onConfirmMod('ban', msg.user.displayName)} title={t('chat.banear')} aria-label={t('chat.banear')} className={styles.menuBtn}>🚫</button>
        </div>
      )}
    </div>
  );
});

export function ChatPanel({ channel }: Props) {
  const { t, dateLocale } = useTranslation();
  const { messages, onNewMessage } = useChat();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; user: string } | null>(null);
  const [menuMsg, setMenuMsg] = useState<string | null>(null);
  const [confirmModAction, setConfirmModAction] = useState<{ action: 'timeout' | 'ban'; user: string } | null>(null);
  const [selectedSound, setSelectedSound] = useState<SoundKey | ''>('');
  const [soundVolume, setSoundVolume] = useState(1);
  const { socket, connected, reconnect } = useSocket();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSoundRef = useRef(0);
  const stickToBottomRef = useRef(true);

  const playSound = useCallback(() => {
    if (!selectedSound) return;
    const now = Date.now();
    if (now - lastSoundRef.current < 2000) return;
    lastSoundRef.current = now;
    setMasterVolume(soundVolume);
    SOUNDS[selectedSound]();
  }, [selectedSound, soundVolume]);

  useEffect(() => {
    const unsub = onNewMessage(playSound);
    return unsub;
  }, [onNewMessage, playSound]);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => messages[index]?.id ?? index,
    measureElement: (el) => {
      const style = window.getComputedStyle(el);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      return el.getBoundingClientRect().height + marginTop + marginBottom;
    },
    overscan: 5,
  });

  // Auto-scroll to bottom while user is near bottom
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [messages.length, virtualizer]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      stickToBottomRef.current = nearBottom;
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

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

  const [overlayMode, setOverlayMode] = useState<'chat' | 'cyanchat'>(() => {
    const saved = localStorage.getItem('overlayMode');
    return saved === 'cyanchat' ? 'cyanchat' : 'chat';
  });
  const [cyanChatUrl, setCyanChatUrl] = useState(() => localStorage.getItem('cyanChatUrl') || '');

  function openOverlayWindow() {
    if (!channel) return;
    if (window.streamforger) {
      if (overlayMode === 'cyanchat') {
        window.streamforger.overlay.open(cyanChatUrl || `https://chat.johnnycyan.com/?channel=${encodeURIComponent(channel)}`, true);
      } else {
        window.streamforger.overlay.open(channel, false, '');
      }
      setOverlayOpen(true);
    } else {
      const url = overlayMode === 'cyanchat'
        ? (cyanChatUrl || `https://chat.johnnycyan.com/?channel=${encodeURIComponent(channel)}`)
        : `${window.location.origin}/overlay.html?channel=${channel}&mode=chat`;
      window.open(url, 'streamforger-chat-overlay', 'width=400,height=600,menubar=no,toolbar=no,location=no,status=no');
    }
  }

  function closeOverlayWindow() {
    if (window.streamforger) {
      window.streamforger.overlay.close();
    }
    setOverlayOpen(false);
  }

  function pillClasses(active: boolean, extra?: string) {
    return `${styles.pillBtn} ${active ? styles['pillBtn--active'] : ''} ${extra || ''}`;
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className="flex-between mb-4">
        <div>
          <h2 className="sf-heading flex-row--gap-sm">
            {t('chat.title')}
          </h2>
          <p className="text-sm text-muted">{t('chat.subtitle')}</p>
        </div>
        <div className="flex-row--gap-sm" style={{ flexShrink: 0 }}>
          <div className="flex-row--gap-sm" style={{ marginRight: '0.25rem' }}>
            {(['chat', 'cyanchat'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setOverlayMode(m); localStorage.setItem('overlayMode', m); }}
                disabled={overlayOpen}
                className={pillClasses(overlayMode === m)}
              >
                {m === 'chat' ? 'Chat' : 'Cyan Chat'}
              </button>
            ))}
          </div>
          {!overlayOpen ? (
            <button
              onClick={openOverlayWindow}
              disabled={!channel}
              className="sf-btn sf-btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.875rem' }}
            >
              {t('chat.abrirOverlay')}
            </button>
          ) : (
            <button
              onClick={closeOverlayWindow}
              className="sf-btn sf-btn-danger"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.875rem' }}
            >
              {t('chat.cerrarOverlay')}
            </button>
          )}
        </div>
      </div>

      {/* Cyan Chat URL config */}
      {overlayMode === 'cyanchat' && (
        <div className={styles.cyanChatBox}>
          <label className="sf-label mb-2">{t('chat.cyanUrl')}</label>
          <div className="flex-row--gap-sm">
            <input
              type="url"
              value={cyanChatUrl}
              onChange={(e) => { setCyanChatUrl(e.target.value); localStorage.setItem('cyanChatUrl', e.target.value); }}
              placeholder="https://chat.johnnycyan.com/chat.html?channel=..."
              className="sf-input"
              style={{ flex: 1, fontSize: '0.78rem', fontFamily: 'monospace' }}
            />
            <a
              href="https://chat.johnnycyan.com/"
              target="_blank"
              rel="noreferrer"
              className="sf-btn"
              style={{ fontSize: '0.72rem', padding: '0.4rem 0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {t('chat.cyanConfig')}
            </a>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', marginTop: '0.3rem', marginBottom: 0 }}>
            {t('chat.cyanDesc')}
          </p>
        </div>
      )}

      {overlayOpen && window.streamforger && (
        <ChatOverlayControls
          onClose={closeOverlayWindow}
        />
      )}

      {/* Connection status (only when disconnected while channel is active) */}
      {channel && !connected && (
        <div className={styles.statusError}>
          <span>{t('chat.disconnected')}</span>
          <button onClick={reconnect} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
            {t('chat.reconectar')}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className={`glass-card ${styles.msgContainer}`} ref={listRef} aria-live="polite">
        {!channel ? (
          <EmptyState 
            icon="💬"
            title={t('chat.emptyStateTitle') || 'Conecta a tu canal'}
            description={t('chat.emptyStateDesc') || 'Introduce el nombre de tu canal en la barra superior o ve a Configuración para iniciar sesión.'}
            actionLabel={t('chat.emptyStateBtn') || 'Ir a Configuración'}
            onAction={() => window.dispatchEvent(new CustomEvent('navigateTab', { detail: 'config' }))}
          />
        ) : messages.length === 0 ? (
          <EmptyState 
            icon="📭"
            title={t('chat.emptyMessagesTitle') || 'El chat está tranquilo'}
            description={t('chat.waitingMessages') || 'Esperando mensajes... ¡Rompe el hielo!'}
          />
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const msg = messages[virtualItem.index];
              if (!msg) return null;
              return (
                <div
                  key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ChatMessage
                    msg={msg}
                    locale={dateLocale || 'es-ES'}
                    menuMsg={menuMsg}
                    onHover={setMenuMsg}
                    onReply={handleReply}
                    onModAction={handleModAction}
                    onConfirmMod={(action, user) => setConfirmModAction({ action, user })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className={styles.replyBar}>
          <span>{t('chat.replyingTo', { user: replyTo.user })}</span>
          <button
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', color: 'var(--sf-text-3)', cursor: 'pointer', fontSize: '0.85rem' }}
          >✕</button>
        </div>
      )}

      <ChatSoundSelector
        selectedSound={selectedSound}
        soundVolume={soundVolume}
        onSoundChange={setSelectedSound}
        onVolumeChange={setSoundVolume}
      />

      <ChatTtsControls />

      <ChatGreetingConfig channel={channel} />

      {/* Input */}
      <div className="flex-row--gap-sm">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={replyTo ? t('chat.placeholderReply', { user: replyTo.user }) : t('chat.placeholderMessage')}
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
          {t('chat.enviar')}
        </button>
      </div>

      {/* Info bar */}
      <div className={styles.infoBar}>
        <span>{t('chat.conectadoA')} <strong style={{ color: 'var(--sf-text-2)' }}>#{channel || '—'}</strong></span>
        <span>{messages.length} {t('chat.mensajes')} · {connected ? '🟢' : '🔴'}</span>
      </div>

      <ConfirmModal
        open={confirmModAction !== null}
        title={confirmModAction?.action === 'ban' ? t('chat.confirmBanTitle') : t('chat.confirmTimeoutTitle')}
        message={confirmModAction?.action === 'ban' ? t('chat.confirmBanMsg', { user: confirmModAction?.user || '' }) : t('chat.confirmTimeoutMsg', { user: confirmModAction?.user || '' })}
        confirmLabel={confirmModAction?.action === 'ban' ? t('chat.banear') : t('chat.timeout5m')}
        onConfirm={() => { if (confirmModAction) handleModAction(confirmModAction.action, confirmModAction.user); setConfirmModAction(null); }}
        onCancel={() => setConfirmModAction(null)}
      />
    </div>
  );
}

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
