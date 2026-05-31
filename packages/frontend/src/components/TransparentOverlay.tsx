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
  const [isOpen, setIsOpen] = useState(false);
  const [clickThrough, setClickThrough] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('');

  useEffect(() => {
    window.streamforger?.overlay.isOpen().then(setIsOpen);
    window.streamforger?.overlay.getClickThrough().then(setClickThrough);
  }, []);

  const toggle = () => {
    if (isOpen) {
      window.streamforger?.overlay.close();
      setIsOpen(false);
    } else if (channel) {
      window.streamforger?.overlay.open(channel, selectedTheme || undefined);
      setIsOpen(true);
    }
  };

  const toggleClickThrough = () => {
    window.streamforger?.overlay.toggleClickThrough();
    setClickThrough(!clickThrough);
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🪟 Overlay Transparente
      </h2>
      <p className="text-sm text-zinc-400 mb-4">
        Ventana transparente siempre visible sobre tus juegos.
        Atajo: <kbd className="bg-zinc-700 px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+T</kbd> para alternar click-through.
      </p>

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
          disabled={!channel && !isOpen}
          className={`px-5 py-2 rounded text-sm font-medium transition-colors ${
            isOpen
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white disabled:text-zinc-500'
          }`}
        >
          {isOpen ? 'Cerrar overlay' : 'Abrir overlay'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={clickThrough}
              onChange={toggleClickThrough}
              className="accent-purple-500"
            />
            Modo click-through (el ratón pasa a través)
          </label>
          <span className="text-xs text-zinc-500">
            Arrastrá desde el borde superior invisible para mover la ventana
          </span>
        </div>
      )}

      {!channel && (
        <p className="text-xs text-zinc-500 mt-2">
          Ingresá un canal para abrir el overlay
        </p>
      )}
    </div>
  );
}
