import { createContext, useContext, useState, type ReactNode } from 'react';

interface TtsContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  voiceURI: string | null;
  setVoiceURI: (v: string | null) => void;
  rate: number;
  setRate: (v: number) => void;
  volume: number;
  setVolume: (v: number) => void;
}

const TtsContext = createContext<TtsContextValue>({
  enabled: false,
  setEnabled: () => {},
  voiceURI: null,
  setVoiceURI: () => {},
  rate: 1,
  setRate: () => {},
  volume: 1,
  setVolume: () => {},
});

export function TtsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);

  return (
    <TtsContext.Provider value={{ enabled, setEnabled, voiceURI, setVoiceURI, rate, setRate, volume, setVolume }}>
      {children}
    </TtsContext.Provider>
  );
}

export function useTts() {
  return useContext(TtsContext);
}
