import { useEffect, useState, useCallback, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export interface AuthUser {
  id: string;
  login: string;
  displayName: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface DeviceCodeState {
  status: 'idle' | 'loading' | 'polling';
  userCode?: string;
  verificationUri?: string;
  deviceCode?: string;
  interval?: number;
  error?: string;
}

export function useAuthStatus() {
  const [status, setStatus] = useState<AuthStatus>({ authenticated: false, user: null });
  const [loading, setLoading] = useState(true);
  const [deviceState, setDeviceState] = useState<DeviceCodeState>({ status: 'idle' });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/status`);
      if (res.ok) {
        const data: AuthStatus = await res.json();
        setStatus(data);
        if (data.authenticated) {
          setDeviceState({ status: 'idle' });
        }
      }
    } catch {
      // Backend not ready yet — keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const startDeviceLogin = useCallback(async () => {
    setDeviceState({ status: 'loading' });
    try {
      const res = await fetch(`${BACKEND_URL}/auth/device`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDeviceState({ status: 'idle', error: err.error || 'Error al iniciar login' });
        return;
      }
      const data = await res.json();
      setDeviceState({
        status: 'polling',
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        deviceCode: data.device_code,
        interval: data.interval,
      });
    } catch {
      setDeviceState({ status: 'idle', error: 'Error de red' });
    }
  }, []);

  useEffect(() => {
    if (deviceState.status !== 'polling' || !deviceState.deviceCode) return;

    let cancelled = false;
    const intervalMs = (deviceState.interval || 5) * 1000;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${BACKEND_URL}/auth/device/poll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: deviceState.deviceCode }),
        });
        if (cancelled) return;
        const data = await res.json();
        if (data.status === 'authenticated') {
          setDeviceState({ status: 'idle' });
          refresh();
          return;
        }
        if (data.error === 'expired_token' || data.error === 'access_denied') {
          setDeviceState({
            status: 'idle',
            error: data.error === 'expired_token' ? 'Código expirado, intenta de nuevo' : 'Acceso denegado',
          });
          return;
        }
      } catch {
        // Network error — keep polling
      }
      if (!cancelled) {
        timeoutRef.current = setTimeout(poll, intervalMs);
      }
    };

    timeoutRef.current = setTimeout(poll, 100);
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [deviceState.status, deviceState.deviceCode, deviceState.interval, refresh]);

  const cancelDeviceLogin = useCallback(() => {
    setDeviceState({ status: 'idle' });
  }, []);

  const login = useCallback(() => {
    if (window.streamforger?.isDesktop) {
      startDeviceLogin();
    } else {
      window.open(`${BACKEND_URL}/auth/login`, '_blank');
    }
  }, [startDeviceLogin]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, { method: 'POST' });
    } catch { /* ignore */ }
    setStatus({ authenticated: false, user: null });
  }, []);

  return { ...status, loading, login, logout, deviceState, cancelDeviceLogin, refresh };
}
