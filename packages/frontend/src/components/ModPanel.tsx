import { useState } from 'react';
import { apiPost } from '../utils/api';

interface Props {
  channel: string;
  backendUrl: string;
}

type ModAction = 'timeout' | 'ban' | 'unban' | 'delete';

export function ModPanel({ channel }: Props) {
  const [userName, setUserName] = useState('');
  const [duration, setDuration] = useState(300);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<ModAction>('timeout');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    if (!userName.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      let r: Response;
      switch (action) {
        case 'timeout':
          r = await apiPost('/mod/timeout', { channel, userName: userName.trim(), duration, reason });
          break;
        case 'ban':
          r = await apiPost('/mod/ban', { channel, userName: userName.trim(), reason });
          break;
        case 'unban':
          r = await apiPost('/mod/unban', { channel, userName: userName.trim() });
          break;
        default:
          return;
      }
      if (r.ok) {
        setResult({ ok: true, message: `${action === 'timeout' ? 'Timeout' : action === 'ban' ? 'Ban' : 'Unban'} aplicado a ${userName}` });
        setUserName('');
        setReason('');
      } else {
        const data = await r.json();
        setResult({ ok: false, message: data.error || 'Error' });
      }
    } catch {
      setResult({ ok: false, message: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  const DURATION_PRESETS = [
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '5m', value: 300 },
    { label: '10m', value: 600 },
    { label: '1h', value: 3600 },
    { label: '24h', value: 86400 },
  ];

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🛡️ Moderación
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          Gestioná tu chat con timeout, ban y unban desde el panel
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {/* Action selector */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem' }}>
          {(['timeout', 'ban', 'unban'] as ModAction[]).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className="sf-btn"
              style={{
                fontSize: '0.78rem', padding: '0.4rem 0.75rem',
                background: action === a ? 'var(--sf-primary)' : 'var(--sf-surface-hover)',
                color: action === a ? '#fff' : 'var(--sf-text-2)',
                border: action === a ? '1px solid var(--sf-primary)' : '1px solid var(--sf-border)',
                textTransform: 'capitalize',
              }}
            >
              {a === 'timeout' ? '⏳ Timeout' : a === 'ban' ? '🚫 Ban' : '✅ Unban'}
            </button>
          ))}
        </div>

        {/* Username */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.35rem', display: 'block' }}>
            Nombre de usuario
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') execute(); }}
            placeholder="Ej: nombre_del_usuario"
            className="sf-input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Duration (timeout only) */}
        {action === 'timeout' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.35rem', display: 'block' }}>
              Duración
            </label>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDuration(p.value)}
                  className="sf-btn"
                  style={{
                    fontSize: '0.72rem', padding: '0.3rem 0.6rem',
                    background: duration === p.value ? 'var(--sf-primary)' : 'var(--sf-surface-hover)',
                    color: duration === p.value ? '#fff' : 'var(--sf-text-2)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reason */}
        {action !== 'unban' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.35rem', display: 'block' }}>
              Razón (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Spam en el chat"
              className="sf-input"
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Execute */}
        <button onClick={execute} disabled={loading || !userName.trim()} className="sf-btn" style={{
          fontSize: '0.85rem', padding: '0.5rem 1.25rem',
          background: action === 'timeout' ? 'rgba(245,158,11,0.15)' : action === 'ban' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          color: action === 'timeout' ? '#fbbf24' : action === 'ban' ? '#f87171' : '#34d399',
          border: `1px solid ${action === 'timeout' ? 'rgba(245,158,11,0.3)' : action === 'ban' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
        }}>
          {loading ? 'Procesando...' : `Ejecutar ${action === 'timeout' ? 'Timeout' : action === 'ban' ? 'Ban' : 'Unban'}`}
        </button>

        {/* Result */}
        {result && (
          <div style={{
            marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6,
            fontSize: '0.82rem',
            background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: result.ok ? '#34d399' : '#f87171',
          }}>
            {result.ok ? '✅ ' : '❌ '}{result.message}
          </div>
        )}
      </div>
    </div>
  );
}
