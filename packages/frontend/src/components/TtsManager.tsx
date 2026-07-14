import { useEffect, useRef, useCallback } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { useTts } from '../contexts/TtsContext';
import { speak, cancelAll } from '../utils/tts';

interface ChatMsg {
  id: string;
  user: { id: string; displayName: string; color: string; badges: string[] };
  text: string;
  timestamp: number;
}

function shouldSkip(msg: ChatMsg, currentUserId: string | null, filters: { excludeOwn: boolean; excludeLinks: boolean; excludeBots: boolean; botNames: string }) {
  if (filters.excludeOwn && currentUserId && msg.user.id === currentUserId) return true;
  if (filters.excludeLinks && /https?:\/\//i.test(msg.text)) return true;
  if (filters.excludeBots && filters.botNames) {
    const names = filters.botNames.split(',').map((n) => n.trim().toLowerCase()).filter(Boolean);
    if (names.includes(msg.user.displayName.toLowerCase())) return true;
  }
  return false;
}

const DEDUP_WINDOW = 10;

export function TtsManager() {
  const { enabled, voiceURI, rate, volume, filters, currentUserId } = useTts();
  const recentTextsRef = useRef<string[]>([]);

  useSocketEvent('chat:message', useCallback((msg: ChatMsg) => {
    if (!enabled) return;
    if (recentTextsRef.current.includes(msg.text)) return;
    if (shouldSkip(msg, currentUserId, filters)) return;
    recentTextsRef.current.push(msg.text);
    if (recentTextsRef.current.length > DEDUP_WINDOW) recentTextsRef.current.shift();
    const textToSpeak = filters.readAuthor ? `${msg.user.displayName}: ${msg.text}` : msg.text;
    speak(textToSpeak, voiceURI, rate, volume);
  }, [enabled, voiceURI, rate, volume, filters, currentUserId]));

  useEffect(() => {
    if (!enabled) cancelAll();
  }, [enabled]);

  return null;
}
