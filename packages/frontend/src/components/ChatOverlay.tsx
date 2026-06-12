import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import type { ChatMessage } from '@streamforger/shared';

const MAX_MESSAGES = 50;

const TTS_LS_KEY = 'streamforger-overlay-tts';

function loadTtsSettings() {
  try {
    const raw = localStorage.getItem(TTS_LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveTtsSettings(s: Record<string, unknown>) {
  try { localStorage.setItem(TTS_LS_KEY, JSON.stringify(s)); } catch {}
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
  fontFamily?: string;
  fontSize?: number;
  bgMode?: 'transparent' | 'black';
}

export function ChatOverlay({ channel, fontFamily = "'Inter', sans-serif", fontSize = 14, bgMode = 'black' }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { socket } = useSocket();
  const listRef = useRef<HTMLDivElement>(null);
  const ttsLastRef = useRef('');

  const tls = loadTtsSettings();
  const [ttsEnabled, setTtsEnabled] = useState(() => tls.enabled ?? false);
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string | null>(() => tls.voiceURI ?? null);
  const [ttsRate, setTtsRate] = useState(() => tls.rate ?? 1);
  const [ttsVolume, setTtsVolume] = useState(() => tls.volume ?? 1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const update = () => setVoices(getVoices());
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Rejoin channel on reconnect
  useEffect(() => {
    if (!channel || !socket) return;
    const join = () => socket.emit('join:channel', channel);
    join();
    socket.on('connect', join);
    return () => { socket.off('connect', join); };
  }, [channel, socket]);

  useSocketEvent('chat:message', useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), msg]);
    if (ttsEnabled && msg.text !== ttsLastRef.current) {
      ttsLastRef.current = msg.text;
      speak(msg.text, ttsVoiceURI, ttsRate, ttsVolume);
    }
  }, [ttsEnabled, ttsVoiceURI, ttsRate, ttsVolume]));

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function toggleTts() {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    saveTtsSettings({ ...loadTtsSettings(), enabled: next });
    if (!next) window.speechSynthesis?.cancel();
  }

  function changeVoice(uri: string) {
    const val = uri || null;
    setTtsVoiceURI(val);
    saveTtsSettings({ ...loadTtsSettings(), voiceURI: val });
  }

  function changeRate(r: number) {
    setTtsRate(r);
    saveTtsSettings({ ...loadTtsSettings(), rate: r });
  }

  function changeVolume(v: number) {
    setTtsVolume(v);
    saveTtsSettings({ ...loadTtsSettings(), volume: v });
  }

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
        boxSizing: 'border-box',
        paddingTop: 36,
      }}
    >
      {/* TTS bar — always on top so it's never cut off */}
      {window.speechSynthesis && (
        <div
          style={{
            padding: '6px 10px',
            background: bgMode === 'black' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: '#a0aec0',
            flexShrink: 0,
          }}
        >
          <button
            onClick={toggleTts}
            style={{
              background: ttsEnabled ? 'rgba(124,58,237,0.3)' : 'transparent',
              border: `1px solid ${ttsEnabled ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.15)'}`,
              color: ttsEnabled ? '#a78bfa' : '#718096',
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
              fontSize: 11, fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            TTS {ttsEnabled ? 'ON' : 'OFF'}
          </button>

          <select
            value={ttsVoiceURI ?? ''}
            onChange={(e) => changeVoice(e.target.value)}
            style={{
              flex: 1, minWidth: 0, maxWidth: 140, padding: '2px 6px', borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.4)', color: '#e2e8f0',
              fontSize: 10, fontFamily: 'inherit', outline: 'none',
            }}
          >
            <option value="">Voz</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
            ))}
          </select>

          <span style={{ fontSize: 9, color: '#718096', whiteSpace: 'nowrap' }}>Vel</span>
          <input
            type="range" min={0.5} max={2} step={0.1}
            value={ttsRate}
            onChange={(e) => changeRate(parseFloat(e.target.value))}
            style={{ width: 48, accentColor: '#7c3aed', cursor: 'pointer' }}
          />

          <span style={{ fontSize: 9, color: '#718096', whiteSpace: 'nowrap' }}>Vol</span>
          <input
            type="range" min={0} max={1} step={0.05}
            value={ttsVolume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            style={{ width: 48, accentColor: '#7c3aed', cursor: 'pointer' }}
          />

          <button
            onClick={() => window.speechSynthesis.cancel()}
            style={{
              background: 'none', border: 'none', color: '#718096',
              cursor: 'pointer', fontSize: 12, padding: '2px 6px',
              fontFamily: 'inherit', lineHeight: 1,
            }}
            title="Detener"
          >
            ✕
          </button>
        </div>
      )}

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
                background: `rgba(0,0,0,${bgMode === 'black' ? '0.3' : '0.5'})`,
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
