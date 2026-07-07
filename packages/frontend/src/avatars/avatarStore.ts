import { useState, useCallback } from 'react';
import type { AvatarConfig } from './types';
import { DEFAULT_AVATAR_CONFIG } from './types';

const LS_KEY = 'sf-avatars-config';

function loadConfig(): AvatarConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new keys added in future versions
      return { ...DEFAULT_AVATAR_CONFIG, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_AVATAR_CONFIG };
}

function saveConfig(config: AvatarConfig) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch {}
}

/**
 * Lightweight avatar config hook using React state + localStorage.
 * No external store library needed — keeps the avatar system fully isolated.
 */
export function useAvatarConfig() {
  const [config, setConfigState] = useState<AvatarConfig>(loadConfig);

  const setConfig = useCallback((updater: Partial<AvatarConfig> | ((prev: AvatarConfig) => AvatarConfig)) => {
    setConfigState((prev) => {
      const next = typeof updater === 'function'
        ? updater(prev)
        : { ...prev, ...updater };
      saveConfig(next);
      return next;
    });
  }, []);

  const updateField = useCallback(<K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    setConfigState((prev) => {
      const next = { ...prev, [key]: value };
      saveConfig(next);
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    const fresh = { ...DEFAULT_AVATAR_CONFIG };
    saveConfig(fresh);
    setConfigState(fresh);
  }, []);

  return { config, setConfig, updateField, resetConfig };
}
