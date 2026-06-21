import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { SOUNDS, setMasterVolume, type SoundKey } from '../utils/sounds';
import { useTranslation } from '../i18n/context';
import { apiGet, apiPut } from '../utils/api';
import { useTts } from '../contexts/TtsContext';
import { getVoices } from '../utils/tts';
import styles from './ChatPanel.module.css';

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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const tts = useTts();
  const [greetingEnabled, setGreetingEnabled] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState('¡Bienvenido @{user} al canal!');
  const [greetingOpen, setGreetingOpen] = useState(false);

  useEffect(() => {
    if (!channel) return;
    apiGet(`/chat/greeting-config?channel=${encodeURIComponent(channel)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.enabled === 'boolean') {
          setGreetingEnabled(data.enabled);
          if (data.message) setGreetingMessage(data.message);
        }
      })
      .catch(() => {});
  }, [channel]);

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
  }, [playSound]));

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

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

  function pillClasses(active: boolean, extra?: string) {
    return `${styles.pillBtn} ${active ? styles['pillBtn--active'] : ''} ${extra || ''}`;
  }

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
          <label className="sf-label mb-2">{t('chat.cyanUrl') || 'URL de Cyan Chat'}</label>
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
              Configurar ↗
            </a>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--sf-text-3)', marginTop: '0.3rem', marginBottom: 0 }}>
            Abre Cyan Chat, configura tus opciones y pega la URL que se genera aquí.
          </p>
        </div>
      )}

      {/* Overlay controls (Electron only) */}
      {overlayOpen && window.streamforger && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={styles.overlayControlBox}
        >
          <div className="flex-between mb-2">
            <span className="sf-section-title" style={{ margin: 0 }}>{t('chat.controlOverlay')}</span>
            <button onClick={closeOverlayWindow} className="sf-btn sf-btn-danger" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
              {t('chat.cerrar')}
            </button>
          </div>
          <div className="flex-wrap mb-1">
            {/* Size presets */}
            <div className="flex-row--gap-sm">
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => changeOverlaySize(s)}
                  className={pillClasses(overlaySize === s, styles['pillBtn--sm'])}
                  style={{ textTransform: 'uppercase' }}
                >{s === 'sm' ? t('chat.small') : s === 'md' ? t('chat.medium') : t('chat.large')}</button>
              ))}
            </div>
            {/* Opacity */}
            <div className="flex-row--gap-sm" style={{ flex: 1, maxWidth: 180 }}>
              <span className="text-dim" style={{ fontSize: '0.68rem' }}>{t('chat.opacidad')}</span>
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
          <div className="flex-row--gap-sm flex-wrap mt-2">
            {/* Background mode */}
            <button
              onClick={() => {
                const next = overlayBgMode === 'transparent' ? 'black' : 'transparent';
                setOverlayBgMode(next);
                saveOverlaySettings({ ...loadOverlaySettings(), bgMode: next });
                window.streamforger?.overlay.setBgMode?.(next);
              }}
              className={`${styles.pillBtn} ${styles['pillBtn--sm']}`}
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
            <div className="flex-row--gap-sm">
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
              <span className="text-dim" style={{ fontSize: '0.6rem', minWidth: 16 }}>{overlayFontSize}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Connection status */}
      {!channel && (
        <div className={styles.statusWarning}>
          {t('chat.emptyChannel')}
        </div>
      )}
      {channel && !connected && (
        <div className={styles.statusError}>
          <span>{t('chat.disconnected')}</span>
          <button onClick={reconnect} className="sf-btn sf-btn-primary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}>
            {t('chat.reconectar')}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className={`glass-card ${styles.msgContainer}`} ref={listRef}>
        {messages.length === 0 ? (
          <div className={styles.msgEmpty}>
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
                className={styles.msgBubble}
                onMouseEnter={() => setMenuMsg(msg.id)}
                onMouseLeave={() => setMenuMsg(null)}
              >
                <div className="flex-row flex-wrap" style={{ gap: '0.35rem' }}>
                  {msg.user.badges?.map((b) => (
                    <span key={b} className={styles.badgeIcon}>{badgeIcon(b)}</span>
                  ))}
                  <span
                    className={styles.userName}
                    style={{ color: msg.user.color || '#a78bfa' }}
                    onClick={() => setReplyTo({ id: msg.id, user: msg.user.displayName })}
                  >
                    {msg.user.displayName}
                  </span>
                  <span className={styles.timestamp}>{formatTimestamp(msg.timestamp)}</span>
                </div>
                <div className={styles.msgText}>{msg.text}</div>

                {menuMsg === msg.id && (
                  <div ref={menuRef} className={styles.msgMenu}>
                    <button onClick={() => handleReply(msg)} title={t('chat.responder')} className={styles.menuBtn}>↩</button>
                    <button onClick={() => handleModAction('timeout', msg.user.displayName)} title={t('chat.timeout5m')} className={styles.menuBtn}>⏳</button>
                    <button onClick={() => handleModAction('ban', msg.user.displayName)} title={t('chat.banear')} className={styles.menuBtn}>🚫</button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
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

      {/* Sound selector + volume */}
      <div className={styles.soundRow}>
        <span className="text-dim" style={{ fontSize: '0.7rem', fontWeight: 500 }}>{t('chat.sonido')}</span>
        <div className="flex-row--gap-sm flex-wrap">
          <button
            onClick={() => setSelectedSound('')}
            className={pillClasses(selectedSound === '', styles['pillBtn--xs'])}
          >{t('chat.sinSonido')}</button>
          {(['pop', 'ding', 'chime', 'notification'] as SoundKey[]).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSound(s)}
              className={pillClasses(selectedSound === s, styles['pillBtn--xs'])}
              onMouseEnter={() => { setMasterVolume(soundVolume); SOUNDS[s](); }}
            >{s === 'pop' ? t('chat.sonidoPop') : s === 'ding' ? t('chat.sonidoDing') : s === 'chime' ? t('chat.sonidoChime') : t('chat.sonidoNotif')}</button>
          ))}
        </div>
        <div className={styles.volRange}>
          <span className="text-dim" style={{ fontSize: '0.6rem', minWidth: 16 }}>🔈</span>
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
          <span className="text-dim" style={{ fontSize: '0.6rem', minWidth: 16 }}>🔊</span>
        </div>
      </div>

      {/* TTS Controls */}
      <div className={`${styles.ttsBox} ${tts.enabled ? styles.ttsBoxEnabled : styles.ttsBoxDisabled}`}>
        <div className="flex-between mb-1">
          <div className="flex-row--gap-sm">
            <span className="text-dim" style={{ fontSize: '0.7rem', fontWeight: 500 }}>{t('chat.tts')}</span>
            <button
              onClick={() => { tts.setEnabled(!tts.enabled); if (tts.enabled) window.speechSynthesis?.cancel(); }}
              className={`${styles.toggleTrack} ${tts.enabled ? styles.toggleTrackOn : styles.toggleTrackOff}`}
            >
              <span className={styles.toggleThumb} style={{ left: tts.enabled ? 18 : 2 }} />
            </button>
          </div>
          {tts.enabled && window.speechSynthesis && (
            <button
              onClick={() => window.speechSynthesis.cancel()}
              className={styles.collapseArrow}
            >{t('chat.detener')}</button>
          )}
        </div>
        {tts.enabled && window.speechSynthesis && (
          <div className="flex-col--gap-sm">
            <div className="flex-row--gap-sm">
              <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 34 }}>{t('chat.voz')}</span>
              <select
                value={tts.voiceURI ?? ''}
                onChange={(e) => tts.setVoiceURI(e.target.value || null)}
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
            <div className="flex-row--gap-sm">
              <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 34 }}>{t('chat.velocidad')}</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={tts.rate}
                onChange={(e) => tts.setRate(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
              />
              <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 24 }}>{tts.rate.toFixed(1)}x</span>
            </div>
            <div className="flex-row--gap-sm">
              <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 34 }}>{t('chat.volumen')}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={tts.volume}
                onChange={(e) => tts.setVolume(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
              />
              <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 24 }}>{Math.round(tts.volume * 100)}%</span>
            </div>
            <div className="sf-divider" style={{ margin: '0.35rem 0' }} />
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>
                <input type="checkbox" checked={tts.filters.excludeOwn} onChange={(e) => tts.setFilters({ ...tts.filters, excludeOwn: e.target.checked })} style={{ accentColor: '#7c3aed', cursor: 'pointer' }} />
                {t('chat.ttsFilterOwn')}
              </label>
              <label className={styles.filterLabel}>
                <input type="checkbox" checked={tts.filters.excludeLinks} onChange={(e) => tts.setFilters({ ...tts.filters, excludeLinks: e.target.checked })} style={{ accentColor: '#7c3aed', cursor: 'pointer' }} />
                {t('chat.ttsFilterLinks')}
              </label>
              <label className={styles.filterLabel}>
                <input type="checkbox" checked={tts.filters.excludeBots} onChange={(e) => tts.setFilters({ ...tts.filters, excludeBots: e.target.checked })} style={{ accentColor: '#7c3aed', cursor: 'pointer' }} />
                {t('chat.ttsFilterBots')}
              </label>
            </div>
            {tts.filters.excludeBots && (
              <input
                type="text"
                value={tts.filters.botNames}
                onChange={(e) => tts.setFilters({ ...tts.filters, botNames: e.target.value })}
                placeholder={t('chat.ttsBotPlaceholder')}
                className="sf-input"
                style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Greeting config */}
      <div className={`${styles.greetingBox} ${greetingEnabled ? styles.greetingBoxEnabled : styles.greetingBoxDisabled}`}>
        <div className="flex-between mb-1">
          <div className="flex-row--gap-sm">
            <span className="text-dim" style={{ fontSize: '0.7rem', fontWeight: 500 }}>
              {t('chat.greeting')}
            </span>
            <button
              onClick={async () => {
                const next = !greetingEnabled;
                setGreetingEnabled(next);
                await apiPut('/chat/greeting-config', { channel, enabled: next });
              }}
              className={`${styles.toggleTrack} ${greetingEnabled ? styles.toggleTrackOn : styles.toggleTrackOff}`}
            >
              <span className={styles.toggleThumb} style={{ left: greetingEnabled ? 18 : 2 }} />
            </button>
          </div>
          <button
            onClick={() => setGreetingOpen(!greetingOpen)}
            className={styles.collapseArrow}
            style={{ transform: greetingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >▼</button>
        </div>
        {greetingOpen && (
          <div className="flex-col--gap-sm">
            <div className="flex-row--gap-sm">
              <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 44 }}>
                {t('chat.greetingMsg')}
              </span>
              <input
                type="text"
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                onBlur={() => apiPut('/chat/greeting-config', { channel, message: greetingMessage })}
                placeholder="¡Bienvenido @{user} al canal!"
                className="sf-input"
                style={{ flex: 1, fontSize: '0.78rem', fontFamily: 'monospace' }}
              />
            </div>
            {greetingMessage.includes('{user}') && (
              <div className={styles.greetingPreview}>
                {t('chat.greetingPreview')}: <span style={{ color: '#a78bfa' }}>
                  {greetingMessage.replace(/\{user\}/g, '@' + (channel || 'usuario'))}
                </span>
              </div>
            )}
            <div className={styles.greetingHint}>{t('chat.greetingDelay')}</div>
          </div>
        )}
      </div>

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
