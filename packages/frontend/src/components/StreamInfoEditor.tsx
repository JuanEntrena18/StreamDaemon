import { useState, useEffect } from 'react';
import { apiPut } from '../utils/api';

interface Props {
  channel: string;
  backendUrl: string;
}

interface StreamInfo {
  title: string;
  gameName: string;
  gameId?: string;
  isLive: boolean;
}

export function StreamInfoEditor({ channel, backendUrl }: Props) {
  const [info, setInfo] = useState<StreamInfo>({ title: '', gameName: '', isLive: false });
  const [title, setTitle] = useState('');
  const [game, setGame] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!channel) return;
    fetch(`${backendUrl}/stream/info?channel=${channel}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setInfo(data);
          setTitle(data.title || '');
          setGame(data.gameName || '');
        }
      })
      .catch(() => {});
  }, [channel, backendUrl]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const r = await apiPut('/stream/info', { channel, title, game });
      if (!r.ok) {
        const data = await r.json();
        setError(data.error || 'Error al guardar');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ✏️ Información del stream
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Editá el título y el juego de tu stream en Twitch
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {/* Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: info.isLive ? '#34d399' : '#6b7280',
          }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)' }}>
            {info.isLive ? 'En vivo' : 'Offline'}
          </span>
        </div>

        {/* Título */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.4rem', display: 'block' }}>
            Título del stream
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Jugando algo increíble hoy!"
            className="sf-input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Juego */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.4rem', display: 'block' }}>
            Juego / Categoría
          </label>
          <input
            type="text"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="Ej: Just Chatting, Valorant, Minecraft..."
            className="sf-input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={save} disabled={saving} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && <span style={{ fontSize: '0.78rem', color: '#34d399' }}>✓ Cambios guardados</span>}
          {error && <span style={{ fontSize: '0.78rem', color: '#f87171' }}>{error}</span>}
        </div>
      </div>

      {/* Info actual */}
      <div className="glass-card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
        <p className="sf-section-title">📋 Estado actual</p>
        <div style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.8 }}>
          <div><strong style={{ color: 'var(--sf-text)' }}>Título:</strong> {info.title || '(sin título)'}</div>
          <div><strong style={{ color: 'var(--sf-text)' }}>Juego:</strong> {info.gameName || '(sin categoría)'}</div>
        </div>
      </div>
    </div>
  );
}
