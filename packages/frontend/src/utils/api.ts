const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
export const OVERLAY_BASE_URL = import.meta.env.DEV ? 'http://localhost:5173' : BACKEND_URL;

function getAuthToken(): string | undefined {
  if (typeof window !== 'undefined' && (window as any).streamforger?.localApiToken) {
    return (window as any).streamforger.localApiToken;
  }
  return undefined;
}

export async function apiPost(path: string, body: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['x-local-token'] = token;
  return fetch(`${BACKEND_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

export async function apiGet(path: string): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['x-local-token'] = token;
  return fetch(`${BACKEND_URL}${path}`, { headers });
}

export async function apiPut(path: string, body: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['x-local-token'] = token;
  return fetch(`${BACKEND_URL}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
}