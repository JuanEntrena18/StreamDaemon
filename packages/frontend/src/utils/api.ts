export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
export const OVERLAY_BASE_URL = import.meta.env.DEV ? 'http://localhost:5173' : BACKEND_URL;

let _cachedToken: string | undefined;

function getAuthToken(): string | undefined {
  if (typeof window !== 'undefined' && (window as any).streamforger?.localApiToken) {
    return (window as any).streamforger.localApiToken;
  }
  return _cachedToken;
}

async function fetchApiToken(): Promise<string | undefined> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/token`);
    if (!res.ok) return undefined;
    const data = await res.json();
    _cachedToken = data.token;
    return _cachedToken;
  } catch {
    return undefined;
  }
}

let _initPromise: Promise<void> | undefined;
async function ensureApiInit(): Promise<void> {
  if (_cachedToken || getAuthToken()) return;
  if (!_initPromise) {
    _initPromise = fetchApiToken().then(() => {});
  }
  return _initPromise;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  await ensureApiInit();

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token) headers.set('x-local-token', token);

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  return res;
}

export async function apiPost(path: string, body?: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiGet(path: string): Promise<Response> {
  return apiFetch(path, { method: 'GET' });
}

export async function apiPut(path: string, body?: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(path: string, body?: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'DELETE',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}