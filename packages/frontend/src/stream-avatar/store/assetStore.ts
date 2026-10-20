import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiUpload, apiDelete } from '../../utils/api.js';
import { useSocketEvent } from '../../hooks/useSocket.js';

export interface StreamAvatarAsset {
  id: string;
  name: string;
  createdAt: number;
}

export function useStreamAvatarAssets() {
  const [assets, setAssets] = useState<StreamAvatarAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      const res = await apiGet('/stream-avatar/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('[stream-avatar] Failed to load assets', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useSocketEvent('stream-avatar:assets_updated', useCallback((data: StreamAvatarAsset[]) => {
    setAssets(Array.isArray(data) ? data : []);
  }, []));

  const uploadAsset = async (file: File): Promise<{ ok: boolean; error?: string }> => {
    setUploading(true);
    try {
      const res = await apiUpload('/stream-avatar/assets', file);
      const data = await res.json();
      if (data.assets) setAssets(data.assets);
      return { ok: data.ok, error: data.error };
    } catch (e) {
      console.error('[stream-avatar] Upload failed', e);
      return { ok: false, error: 'Upload failed' };
    } finally {
      setUploading(false);
    }
  };

  const deleteAsset = async (id: string): Promise<void> => {
    try {
      await apiDelete(`/stream-avatar/assets/${id}`);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error('[stream-avatar] Delete failed', e);
    }
  };

  return { assets, loading, uploading, uploadAsset, deleteAsset, reload: loadAssets };
}
