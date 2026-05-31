import { useState } from 'react';

interface Props {
  channel: string;
  backendUrl: string;
}

export function PredictionPanel({ channel, backendUrl }: Props) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [message, setMessage] = useState('');

  const addOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };

  const removeOption = (i: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, value: string) => {
    const updated = [...options];
    updated[i] = value;
    setOptions(updated);
  };

  const createPrediction = async () => {
    const validOptions = options.filter((o) => o.trim());
    if (!title.trim() || validOptions.length < 2 || !channel) return;

    const res = await fetch(`${backendUrl}/predictions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: channel,
        title: title.trim(),
        options: validOptions.map((o) => o.trim()),
      }),
    });

    if (res.ok) {
      setTitle('');
      setOptions(['', '']);
      setMessage('✅ Predicción creada');
      setTimeout(() => setMessage(''), 3000);
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(err.error || 'Error al crear predicción');
    }
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">📊 Predicciones</h2>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Título de la predicción..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!channel}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-50"
        />

        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Opción ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                disabled={!channel}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-50"
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  className="text-red-400 hover:text-red-300 text-sm disabled:opacity-30"
                  disabled={!channel}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 10 && (
          <button
            onClick={addOption}
            disabled={!channel}
            className="text-sm text-zinc-400 hover:text-zinc-300 disabled:opacity-30"
          >
            + Agregar opción
          </button>
        )}

        <button
          onClick={createPrediction}
          disabled={!title.trim() || options.filter((o) => o.trim()).length < 2 || !channel}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white py-2 rounded transition-colors disabled:text-zinc-500 mt-2"
        >
          Crear predicción
        </button>

        {message && <p className={`text-sm ${message.startsWith('✅') ? 'text-green-400' : 'text-yellow-400'}`}>{message}</p>}
        {!channel && <p className="text-xs text-zinc-500">Ingresa un canal para comenzar</p>}
      </div>
    </div>
  );
}
