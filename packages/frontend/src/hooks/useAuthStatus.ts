import { useEffect, useState, useCallback } from 'react';

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

export function useAuthStatus() {
  const [status, setStatus] = useState<AuthStatus>({ authenticated: false, user: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/status`);
      if (res.ok) {
        const data: AuthStatus = await res.json();
        setStatus(data);
      }
    } catch {
      // Backend not ready yet — keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Poll every 3 s so the UI updates automatically after the OAuth
    // redirect in the external browser completes.
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const login = useCallback(() => {
    if (window.streamforger) {
      // Desktop: open Twitch OAuth in the default browser via Electron IPC
      window.streamforger.auth.login();
    } else {
      // Web: navigate directly
      window.location.href = `${BACKEND_URL}/auth/login`;
    }
  }, []);

  return { ...status, loading, login, refresh };
}
