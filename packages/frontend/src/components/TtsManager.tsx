import { useEffect, useRef, useCallback } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { useTts } from '../contexts/TtsContext';
import { speak } from '../utils/tts';

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

export function TtsManager() {
  const { enabled, voiceURI, rate, volume, filters, currentUserId } = useTts();
  const lastMsgRef = useRef('');

  useSocketEvent('chat:message', useCallback((msg: ChatMsg) => {
    if (!enabled || msg.text === lastMsgRef.current) return;
    if (shouldSkip(msg, currentUserId, filters)) return;
    lastMsgRef.current = msg.text;
    speak(msg.text, voiceURI, rate, volume);
  }, [enabled, voiceURI, rate, volume, filters, currentUserId]));

  useEffect(() => {
    if (!enabled) window.speechSynthesis?.cancel();
  }, [enabled]);

  return null;
}
