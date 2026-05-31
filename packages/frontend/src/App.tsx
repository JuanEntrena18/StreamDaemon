import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { GiveawayPanel } from './components/GiveawayPanel';
import { PredictionPanel } from './components/PredictionPanel';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export function App() {
  const { connected } = useSocket();
  const [channel, setChannel] = useState('');

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">StreamForger</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Open-source stream tools, forged for creators.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Nombre del canal..."
              value={channel}
              onChange={(e) => setChannel(e.target.value.replace(/^#/, ''))}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-48 focus:outline-none focus:border-zinc-500"
            />
            <span className={`flex items-center gap-2 text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
              {connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GiveawayPanel channel={channel} backendUrl={BACKEND_URL} />
          <PredictionPanel channel={channel} backendUrl={BACKEND_URL} />
        </div>

        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">🔌 URLs para OBS (Browser Source)</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Chat Overlay', url: `http://localhost:5173/overlay.html?mode=chat${channel ? `&channel=${channel}` : ''}` },
              { label: 'Sorteos', url: `http://localhost:5173/overlay.html?mode=giveaway${channel ? `&channel=${channel}` : ''}` },
              { label: 'Predicciones', url: `http://localhost:5173/overlay.html?mode=prediction${channel ? `&channel=${channel}` : ''}` },
              { label: 'Redes Sociales', url: 'http://localhost:5173/overlay.html?mode=social' },
            ].map((item) => (
              <div key={item.label} className="bg-zinc-900 rounded p-3">
                <p className="text-zinc-400 mb-1">{item.label}</p>
                <code className="text-xs text-zinc-300 break-all">{item.url}</code>
                <p className="text-xs text-zinc-500 mt-1">
                  Agregar tema: <code className="bg-zinc-800 px-1 rounded">&theme=subnautica2|poe2|wow</code>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
