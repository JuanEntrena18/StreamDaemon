import { useEffect, useRef, useCallback } from 'react';
import { useSocketEvent } from '../hooks/useSocket';
import { useTts } from '../contexts/TtsContext';
import { speak } from '../utils/tts';

export function TtsManager() {
  const { enabled, voiceURI, rate, volume } = useTts();
  const lastMsgRef = useRef('');

  useSocketEvent('chat:message', useCallback((msg: { text: string }) => {
    if (enabled && msg.text !== lastMsgRef.current) {
      lastMsgRef.current = msg.text;
      speak(msg.text, voiceURI, rate, volume);
    }
  }, [enabled, voiceURI, rate, volume]));

  useEffect(() => {
    if (!enabled) window.speechSynthesis?.cancel();
  }, [enabled]);

  return null;
}
