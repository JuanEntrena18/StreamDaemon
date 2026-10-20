import { useState, useCallback, useEffect } from 'react';
import { StreamAvatarConfigSchema, type StreamAvatarConfig } from '@streamdaemon/shared';
import { apiGet, apiPut } from '../../utils/api.js';
import { useSocketEvent } from '../../hooks/useSocket.js';

export const DEFAULT_STREAM_AVATAR_CONFIG: StreamAvatarConfig = StreamAvatarConfigSchema.parse({});

export function useStreamAvatarConfig() {
  const [config, setConfigState] = useState<StreamAvatarConfig>(DEFAULT_STREAM_AVATAR_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/stream-avatar/config')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setConfigState((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((e) => console.error('[stream-avatar] Failed to load config', e))
      .finally(() => setLoading(false));
  }, []);

  useSocketEvent('stream-avatar:config_updated', useCallback((newConfig: Partial<StreamAvatarConfig>) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  }, []));

  const saveConfig = async (nextConfig: StreamAvatarConfig) => {
    try {
      await apiPut('/stream-avatar/config', nextConfig);
    } catch (e) {
      console.error('[stream-avatar] Failed to save config', e);
    }
  };

  const setConfig = useCallback((updater: Partial<StreamAvatarConfig> | ((prev: StreamAvatarConfig) => StreamAvatarConfig)) => {
    setConfigState((prev) => {
      const next = typeof updater === 'function'
        ? updater(prev)
        : { ...prev, ...updater };
      saveConfig(next);
      return next;
    });
  }, []);

  const updateField = useCallback(<K extends keyof StreamAvatarConfig>(key: K, value: StreamAvatarConfig[K]) => {
    setConfigState((prev) => {
      const next = { ...prev, [key]: value };
      saveConfig(next);
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    const fresh = { ...DEFAULT_STREAM_AVATAR_CONFIG };
    setConfigState(fresh);
    saveConfig(fresh);
  }, []);

  return { config, setConfig, updateField, resetConfig, loading };
}
