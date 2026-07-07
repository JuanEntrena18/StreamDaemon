import { useState, useCallback, useEffect } from 'react';
import type { AvatarConfig } from './types';
import { DEFAULT_AVATAR_CONFIG } from './types';
import { apiGet, apiPut } from '../utils/api';
import { useSocketEvent } from '../hooks/useSocket';

export function useAvatarConfig() {
  const [config, setConfigState] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);

  useEffect(() => {
    apiGet('/avatars/config')
      .then((data) => {
        if (data) {
          setConfigState((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((e) => console.error('Failed to load avatar config', e));
  }, []);

  useSocketEvent('avatars:config_updated', useCallback((newConfig: any) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  }, []));

  const saveConfig = async (nextConfig: AvatarConfig) => {
    try {
      await apiPut('/avatars/config', nextConfig);
    } catch (e) {
      console.error('Failed to save avatar config', e);
    }
  };

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
    setConfigState(fresh);
    saveConfig(fresh);
  }, []);

  return { config, setConfig, updateField, resetConfig };
}
