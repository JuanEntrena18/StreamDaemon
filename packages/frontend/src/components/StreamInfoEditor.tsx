import { useState, useEffect } from 'react';
import { apiPut } from '../utils/api';
import { useTranslation } from '../i18n/context';

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
  const { t } = useTranslation();
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
          {t('info.title')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          {t('info.subtitle')}
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
            {info.isLive ? t('info.enVivo') : t('info.offline')}
          </span>
        </div>

        {/* Título */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.4rem', display: 'block' }}>
            {t('info.tituloLabel')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('info.tituloPlaceholder')}
            className="sf-input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Juego */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.4rem', display: 'block' }}>
            {t('info.juegoLabel')}
          </label>
          <input
            type="text"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder={t('info.juegoPlaceholder')}
            className="sf-input"
            style={{ width: '100%' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={save} disabled={saving} className="sf-btn sf-btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}>
            {saving ? t('info.guardando') : t('info.guardarCambios')}
          </button>
          {saved && <span style={{ fontSize: '0.78rem', color: '#34d399' }}>{t('info.guardado')}</span>}
          {error && <span style={{ fontSize: '0.78rem', color: '#f87171' }}>{error}</span>}
        </div>
      </div>

      {/* Info actual */}
      <div className="glass-card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
        <p className="sf-section-title">{t('info.estadoActual')}</p>
        <div style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)', lineHeight: 1.8 }}>
          <div><strong style={{ color: 'var(--sf-text)' }}>{t('info.tituloLabel')}:</strong> {info.title || t('info.sinTitulo')}</div>
          <div><strong style={{ color: 'var(--sf-text)' }}>{t('info.juegoLabel')}:</strong> {info.gameName || t('info.sinCategoria')}</div>
        </div>
      </div>
    </div>
  );
}
