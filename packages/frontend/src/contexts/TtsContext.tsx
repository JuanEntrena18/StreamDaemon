import { createContext, useContext, useState, type ReactNode } from 'react';

export interface TtsFilters {
  excludeOwn: boolean;
  excludeLinks: boolean;
  excludeBots: boolean;
  botNames: string;
  readAuthor: boolean;
}

interface TtsContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  engine: 'native' | 'piper';
  setEngine: (v: 'native' | 'piper') => void;
  piperLang: 'es' | 'en';
  setPiperLang: (v: 'es' | 'en') => void;
  voiceURI: string | null;
  setVoiceURI: (v: string | null) => void;
  rate: number;
  setRate: (v: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  filters: TtsFilters;
  setFilters: (f: TtsFilters) => void;
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
}

const defaultFilters: TtsFilters = { excludeOwn: false, excludeLinks: false, excludeBots: false, botNames: '', readAuthor: false };

const TtsContext = createContext<TtsContextValue>({
  enabled: false,
  setEnabled: () => {},
  engine: 'native',
  setEngine: () => {},
  piperLang: 'es',
  setPiperLang: () => {},
  voiceURI: null,
  setVoiceURI: () => {},
  rate: 1,
  setRate: () => {},
  volume: 1,
  setVolume: () => {},
  filters: defaultFilters,
  setFilters: () => {},
  currentUserId: null,
  setCurrentUserId: () => {},
});

export function TtsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [engine, setEngine] = useState<'native' | 'piper'>('native');
  const [piperLang, setPiperLang] = useState<'es' | 'en'>('es');
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [filters, setFilters] = useState<TtsFilters>(defaultFilters);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  return (
    <TtsContext.Provider value={{
      enabled, setEnabled, 
      engine, setEngine,
      piperLang, setPiperLang,
      voiceURI, setVoiceURI, rate, setRate, volume, setVolume,
      filters, setFilters, currentUserId, setCurrentUserId,
    }}>
      {children}
    </TtsContext.Provider>
  );
}

export function useTts() {
  return useContext(TtsContext);
}
