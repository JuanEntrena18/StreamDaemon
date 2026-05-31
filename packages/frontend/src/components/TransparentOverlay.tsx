import { useState, useEffect } from 'react';

interface Props {
  channel: string;
}

const THEMES = [
  { id: '', label: 'Ninguno' },
  { id: 'subnautica2', label: 'Subnautica 2' },
  { id: 'poe2', label: 'Path of Exile 2' },
  { id: 'wow', label: 'World of Warcraft' },
];

export function TransparentOverlay({ channel }: Props) {
  const [mode, setMode] = useState<'channel' | 'url'>('channel');
  const [isOpen, setIsOpen] = useState(false);
  const [clickThrough, setClickThrough] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [customUrl, setCustomUrl] = useState('https://chat.johnnycyan.com/');
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged' | 'guest'>('checking');

  useEffect(() => {
    window.streamforger?.overlay.isOpen().then(setIsOpen);
    window.streamforger?.overlay.getClickThrough().then(setClickThrough);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const backendUrl = window.streamforger?.backendUrl ?? 'http://localhost:3000';
    try {
      const res = await fetch(`${backendUrl}/auth/status`);
      const data = await res.json();
      setAuthStatus(data.authenticated ? 'logged' : 'guest');
    } catch {
      setAuthStatus('guest');
    }
  };

  const toggle = () => {
    if (isOpen) {
      window.streamforger?.overlay.close();
      setIsOpen(false);
      return;
    }

    if (mode === 'url' && customUrl) {
      window.streamforger?.overlay.open(customUrl, true);
      setIsOpen(true);
    } else if (channel) {
      window.streamforger?.overlay.open(channel, false, selectedTheme || undefined);
      setIsOpen(true);
    }
  };

  const toggleClickThrough = () => {
    window.streamforger?.overlay.toggleClickThrough();
    setClickThrough(!clickThrough);
  };

  const handleLogin = () => {
    window.streamforger?.auth.login();
    // Poll for auth completion
    const interval = setInterval(async () => {
      await checkAuth();
      if (authStatus === 'logged') clearInterval(interval);
    }, 2000);
    setTimeout(() => clearInterval(interval), 120000);
  };

  const canOpen = (mode === 'url' && customUrl) || (mode === 'channel' && channel);

  return (
    <div className="bg-zinc-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">🪟 Overlay Transparente</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${authStatus === 'logged' ? 'bg-green-400' : authStatus === 'checking' ? 'bg-yellow-400' : 'bg-red-400'}`} />
          <span className="text-xs text-zinc-400">
            {authStatus === 'logged' ? 'Twitch conectado' : authStatus === 'checking' ? 'Verificando...' : 'No autenticado'}
          </span>
          {authStatus !== 'logged' && (
            <button onClick={handleLogin} className="text-xs text-purple-400 hover:text-purple-300 ml-1">
              Iniciar sesión
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-4">
        Ventana transparente siempre visible sobre tus juegos.
        Atajo: <kbd className="bg-zinc-700 px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+T</kbd> click-through.
      </p>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('channel')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${mode === 'channel' ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:text-white'}`}
        >
          Chat del canal
        </button>
        <button
          onClick={() => setMode('url')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${mode === 'url' ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:text-white'}`}
        >
          URL personalizada
        </button>
      </div>

      {mode === 'url' ? (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">
              URL del overlay (Cyan Chat, StreamElements, etc.)
            </label>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://chat.johnnycyan.com/?channel=..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
            />
          </div>
          <button
            onClick={toggle}
            disabled={!customUrl}
            className={`shrink-0 px-5 py-2 rounded text-sm font-medium transition-colors ${
              isOpen
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white disabled:text-zinc-500'
            }`}
          >
            {isOpen ? 'Cerrar' : 'Abrir'}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">Tema visual</label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={toggle}
            disabled={!canOpen}
            className={`shrink-0 px-5 py-2 rounded text-sm font-medium transition-colors ${
              isOpen
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white disabled:text-zinc-500'
            }`}
          >
            {isOpen ? 'Cerrar' : 'Abrir'}
          </button>
        </div>
      )}

      {isOpen && (
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={clickThrough}
              onChange={toggleClickThrough}
              className="accent-purple-500"
            />
            Click-through
          </label>
          <span className="text-xs text-zinc-500">Arrastrá desde el borde superior</span>
        </div>
      )}

      {!canOpen && mode === 'channel' && (
        <p className="text-xs text-zinc-500 mt-2">Ingresá un canal para abrir el overlay</p>
      )}
    </div>
  );
}
