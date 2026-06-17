import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { SOUNDS, setMasterVolume, type SoundKey } from '../utils/sounds';
import { useTranslation } from '../i18n/context';

const OVERLAY_LS_KEY = 'streamforger-chat-overlay-settings';

function loadOverlaySettings() {
  try {
    const raw = localStorage.getItem(OVERLAY_LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveOverlaySettings(settings: Record<string, unknown>) {
  try {
    localStorage.setItem(OVERLAY_LS_KEY, JSON.stringify(settings));
  } catch {}
}

function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices()?.filter((v) => v.lang.startsWith('es') || v.lang.startsWith('en')) ?? [];
}

function speak(text: string, voiceURI: string | null, rate: number, volume: number) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (voiceURI) {
    const found = getVoices().find((v) => v.voiceURI === voiceURI);
    if (found) utterance.voice = found;
  }
  utterance.rate = rate;
  utterance.volume = volume;
  window.speechSynthesis.speak(utterance);
}

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
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; user: string } | null>(null);
  const [menuMsg, setMenuMsg] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState<SoundKey | ''>('');
  const { socket, connected, reconnect } = useSocket();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastSoundRef = useRef(0);
  const [soundVolume, setSoundVolume] = useState(1);
  const [ttsVolume, setTtsVolume] = useState(1);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string | null>(null);
  const [ttsRate, setTtsRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const ttsLastMsgRef = useRef('');

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const update = () => setVoices(getVoices());
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const playSound = useCallback(() => {
    if (!selectedSound) return;
    const now = Date.now();
    if (now - lastSoundRef.current < 2000) return;
    lastSoundRef.current = now;
    setMasterVolume(soundVolume);
    SOUNDS[selectedSound]();
  }, [selectedSound, soundVolume]);

  useSocketEvent('chat:message', useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev.slice(-MAX_MSGS + 1), msg]);
    playSound();
    if (ttsEnabled && msg.text !== ttsLastMsgRef.current) {
      ttsLastMsgRef.current = msg.text;
      speak(msg.text, ttsVoiceURI, ttsRate, ttsVolume);
    }
  }, [playSound, ttsEnabled, ttsVoiceURI, ttsRate, ttsVolume]));

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

  const ls = loadOverlaySettings();
  const [overlayOpacity, setOverlayOpacity] = useState(() => ls.opacity ?? 0.9);
  const [overlaySize, setOverlaySize] = useState<'sm' | 'md' | 'lg'>(() => ls.size ?? 'md');
  const [overlayBgMode, setOverlayBgMode] = useState<'transparent' | 'black'>(() => ls.bgMode ?? 'black');
  const [overlayFont, setOverlayFont] = useState(() => ls.font ?? "'Inter', sans-serif");
  const [overlayFontSize, setOverlayFontSize] = useState(() => ls.fontSize ?? 14);
  const [overlayMode, setOverlayMode] = useState<'chat' | 'cyanchat'>(() => {
    const saved = localStorage.getItem('overlayMode');
    return saved === 'cyanchat' ? 'cyanchat' : 'chat';
  });
  const [cyanChatUrl, setCyanChatUrl] = useState(() => localStorage.getItem('cyanChatUrl') || '');

  const FONT_OPTIONS = [
    { label: t('chat.fontInter'), value: "'Inter', sans-serif" },
    { label: t('chat.fontArial'), value: 'Arial, sans-serif' },
    { label: t('chat.fontMonospace'), value: "'Courier New', monospace" },
    { label: t('chat.fontGeorgia'), value: 'Georgia, serif' },
    { label: t('chat.fontVerdana'), value: 'Verdana, sans-serif' },
    { label: t('chat.fontImpact'), value: "'Arial Black', Impact, sans-serif" },
  ];

  function openOverlayWindow() {
    if (!channel) return;
    if (window.streamforger) {
      const baseUrl = window.streamforger.backendUrl || 'http://localhost:3000';
      if (overlayMode === 'cyanchat') {
        window.streamforger.overlay.open(`${baseUrl}/overlay.html?mode=cyanchat&channel=${encodeURIComponent(channel)}`, true);
      } else {
        window.streamforger.overlay.open(channel, false, '');
      }
      setOverlayOpen(true);
    } else {
      const url = overlayMode === 'cyanchat'
        ? `${window.location.origin}/overlay.html?mode=cyanchat&channel=${encodeURIComponent(channel)}`
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

  function changeOverlaySize(size: 'sm' | 'md' | 'lg') {
    setOverlaySize(size);
    saveOverlaySettings({ ...loadOverlaySettings(), size });
    const dims = { sm: [300, 450], md: [400, 600], lg: [550, 800] };
    if (window.streamforger) {
      window.streamforger.overlay.resize(dims[size][0], dims[size][1]);
    }
  }

  function changeOverlayOpacity(val: number) {
    setOverlayOpacity(val);
    saveOverlaySettings({ ...loadOverlaySettings(), opacity: val });
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
            {t('chat.title')}
          </h2>
          <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
            {t('chat.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginRight: '0.25rem' }}>
            {(['chat', 'cyanchat'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setOverlayMode(m); localStorage.setItem('overlayMode', m); }}
                disabled={overlayOpen}
                style={{
                  padding: '0.25rem 0.6rem', borderRadius: 6, border: '1px solid',
                  borderColor: overlayMode === m ? 'var(--sf-primary)' : 'var(--sf-border)',
                  background: overlayMode === m ? 'rgba(124,58,237,0.2)' : 'transparent',
                  color: overlayMode === m ? '#a78bfa' : 'var(--sf-text-3)',
                  fontSize: '0.72rem', fontWeight: overlayMode === m ? 600 : 400,
                  cursor: overlayOpen ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: overlayOpen ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                }}
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
        <div style={{
          marginBottom: '0.75rem', padding: '0.75rem 1rem',
          background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.15)',
          borderRadius: 'var(--sf-radius)',
        }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginBottom: '0.3rem', display: 'block' }}>
            URL de Cyan Chat
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
              Configurar ↗
            </a>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', marginTop: '0.3rem', marginBottom: 0 }}>
            Abrí Cyan Chat, configurá tus opciones, y pegá la URL generada acá.
          </p>
        </div>
      )}

      {/* Overlay controls (Electron only) */}
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
              {t('chat.controlOverlay')}
            </span>
            <button onClick={closeOverlayWindow} className="sf-btn sf-btn-danger" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
              {t('chat.cerrar')}
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
                >{s === 'sm' ? t('chat.small') : s === 'md' ? t('chat.medium') : t('chat.large')}</button>
              ))}
            </div>
            {/* Opacity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: 1, maxWidth: 180 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)' }}>{t('chat.opacidad')}</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {/* Background mode */}
            <button
              onClick={() => {
                const next = overlayBgMode === 'transparent' ? 'black' : 'transparent';
                setOverlayBgMode(next);
                saveOverlaySettings({ ...loadOverlaySettings(), bgMode: next });
                window.streamforger?.overlay.setBgMode?.(next);
              }}
              style={{
                padding: '0.25rem 0.6rem', borderRadius: 4, border: '1px solid',
                borderColor: 'var(--sf-border)',
                background: 'transparent',
                color: 'var(--sf-text-3)',
                fontSize: '0.68rem', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {overlayBgMode === 'transparent' ? t('chat.fondoTransparente') : t('chat.fondoNegro')}
            </button>

            {/* Font selector */}
            <select
              value={overlayFont}
              onChange={(e) => {
                setOverlayFont(e.target.value);
                saveOverlaySettings({ ...loadOverlaySettings(), font: e.target.value });
                window.streamforger?.overlay.setFont?.(e.target.value);
              }}
              style={{
                padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid var(--sf-border)',
                background: 'transparent', color: 'var(--sf-text-3)',
                fontSize: '0.68rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
              }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Font size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--sf-text-3)' }}>A</span>
              <input
                type="range"
                min={10}
                max={24}
                value={overlayFontSize}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setOverlayFontSize(v);
                  saveOverlaySettings({ ...loadOverlaySettings(), fontSize: v });
                  window.streamforger?.overlay.setFontSize?.(v);
                }}
                style={{ width: 60, accentColor: '#7c3aed', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--sf-text-3)' }}>A</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--sf-text-3)', minWidth: 16 }}>{overlayFontSize}</span>
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
          {t('chat.emptyChannel')}
        </div>
      )}
      {channel && !connected && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--sf-radius-sm)', fontSize: '0.82rem', color: '#f87171',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
        }}>
          <span>{t('chat.disconnected')}</span>
          <button onClick={reconnect} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
            {t('chat.reconectar')}
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
              ? t('chat.waitingMessages')
              : t('chat.messagesHere')}
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
                      title={t('chat.responder')}
                      style={btnMenuStyle}
                    >↩</button>
                    <button
                      onClick={() => handleModAction('timeout', msg.user.displayName)}
                      title={t('chat.timeout5m')}
                      style={btnMenuStyle}
                    >⏳</button>
                    <button
                      onClick={() => handleModAction('ban', msg.user.displayName)}
                      title={t('chat.banear')}
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
          <span>{t('chat.replyingTo', { user: replyTo.user })}</span>
          <button
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', color: 'var(--sf-text-3)', cursor: 'pointer', fontSize: '0.85rem' }}
          >✕</button>
        </div>
      )}

      {/* Sound selector + volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--sf-text-3)', fontWeight: 500 }}>{t('chat.sonido')}</span>
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedSound('')}
            style={{
              padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid',
              borderColor: selectedSound === '' ? 'var(--sf-primary)' : 'var(--sf-border)',
              background: selectedSound === '' ? 'rgba(124,58,237,0.2)' : 'transparent',
              color: selectedSound === '' ? '#a78bfa' : 'var(--sf-text-3)',
              fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{t('chat.sinSonido')}</button>
          {(['pop', 'ding', 'chime', 'notification'] as SoundKey[]).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSound(s)}
              style={{
                padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid',
                borderColor: selectedSound === s ? 'var(--sf-primary)' : 'var(--sf-border)',
                background: selectedSound === s ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: selectedSound === s ? '#a78bfa' : 'var(--sf-text-3)',
                fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={() => { setMasterVolume(soundVolume); SOUNDS[s](); }}
            >{s === 'pop' ? t('chat.sonidoPop') : s === 'ding' ? t('chat.sonidoDing') : s === 'chime' ? t('chat.sonidoChime') : t('chat.sonidoNotif')}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--sf-text-3)', minWidth: 16 }}>🔈</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={soundVolume}
            onChange={(e) => { setSoundVolume(parseFloat(e.target.value)); setMasterVolume(parseFloat(e.target.value)); }}
            style={{ width: 56, accentColor: '#7c3aed', cursor: 'pointer' }}
            title={t('chat.volumenSonidos')}
          />
          <span style={{ fontSize: '0.6rem', color: 'var(--sf-text-3)', minWidth: 16 }}>🔊</span>
        </div>
      </div>

      {/* TTS Controls */}
      <div style={{
        marginBottom: '0.5rem', padding: '0.6rem 0.75rem',
        background: ttsEnabled ? 'rgba(124,58,237,0.06)' : 'transparent',
        border: `1px solid ${ttsEnabled ? 'rgba(124,58,237,0.15)' : 'var(--sf-border)'}`,
        borderRadius: 'var(--sf-radius-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--sf-text-3)', fontWeight: 500 }}>{t('chat.tts')}</span>
            <button
              onClick={() => { setTtsEnabled(!ttsEnabled); if (ttsEnabled) window.speechSynthesis?.cancel(); }}
              style={{
                width: 36, height: 18, borderRadius: 99,
                background: ttsEnabled ? 'var(--sf-primary)' : 'var(--sf-border)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: ttsEnabled ? 18 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
          {ttsEnabled && window.speechSynthesis && (
            <button
              onClick={() => window.speechSynthesis.cancel()}
              style={{
                background: 'none', border: 'none', color: 'var(--sf-text-3)',
                cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'inherit',
                padding: '0.1rem 0.4rem', borderRadius: 4,
              }}
            >{t('chat.detener')}</button>
          )}
        </div>
        {ttsEnabled && window.speechSynthesis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', minWidth: 34 }}>{t('chat.voz')}</span>
              <select
                value={ttsVoiceURI ?? ''}
                onChange={(e) => setTtsVoiceURI(e.target.value || null)}
                style={{
                  flex: 1, padding: '0.2rem 0.4rem', borderRadius: 4,
                  border: '1px solid var(--sf-border)',
                  background: '#13132e', color: '#e2e8f0',
                  fontSize: '0.7rem', fontFamily: 'inherit', outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">{t('chat.vozPorDefecto')}</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', minWidth: 34 }}>{t('chat.velocidad')}</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={ttsRate}
                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', minWidth: 24 }}>{ttsRate.toFixed(1)}x</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', minWidth: 34 }}>{t('chat.volumen')}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ttsVolume}
                onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)', minWidth: 24 }}>{Math.round(ttsVolume * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
      <div style={{
        marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--sf-text-3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{t('chat.conectadoA')} <strong style={{ color: 'var(--sf-text-2)' }}>#{channel || '—'}</strong></span>
        <span>{messages.length} {t('chat.mensajes')} · {connected ? '🟢' : '🔴'}</span>
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
