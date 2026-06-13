import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';

interface Props {
  channel: string;
  backendUrl: string;
}

export function PredictionPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    const res = await fetch(`${backendUrl}/predictions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: channel,
        title: title.trim(),
        options: validOptions.map((o) => o.trim()),
      }),
    });

    setLoading(false);
    if (res.ok) {
      setTitle('');
      setOptions(['', '']);
      setMessage('success');
      setTimeout(() => setMessage(''), 3000);
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(err.error || 'error');
    }
  };

  const validOptions = options.filter((o) => o.trim());
  const canCreate = title.trim() && validOptions.length >= 2 && !!channel;

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {t('predictions.title')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          {t('predictions.subtitle')}
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <p className="sf-section-title">{t('predictions.nuevaPrediccion')}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.375rem', fontWeight: 500 }}>
              {t('predictions.pregunta')}
            </label>
            <input
              id="prediction-title-input"
              type="text"
              placeholder={t('predictions.preguntaPlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!channel}
              className="sf-input"
            />
          </div>

          {/* Options */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.5rem', fontWeight: 500 }}>
              {t('predictions.opciones')}
              <span style={{ color: 'var(--sf-text-3)', fontWeight: 400, marginLeft: '0.4rem' }}>
                {t('predictions.opcionesHint')}
              </span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {options.map((opt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(124,58,237,0.15)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa',
                  }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <input
                    id={`prediction-option-${i}`}
                    type="text"
                    placeholder={t('predictions.opcion', { number: i + 1 })}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    disabled={!channel}
                    className="sf-input"
                    style={{ flex: 1 }}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      disabled={!channel}
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: '1px solid var(--sf-border)',
                        background: 'transparent', color: 'var(--sf-text-3)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.875rem', flexShrink: 0, transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--sf-danger)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sf-danger)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--sf-text-3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sf-border)'; }}
                    >
                      ✕
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                onClick={addOption}
                disabled={!channel}
                style={{
                  marginTop: '0.625rem',
                  fontSize: '0.8rem',
                  color: 'var(--sf-primary-light)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: '0.25rem 0',
                  opacity: !channel ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {t('predictions.agregarOpcion')}
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            id="create-prediction-btn"
            onClick={createPrediction}
            disabled={!canCreate || loading}
            className="sf-btn sf-btn-primary"
            style={{ width: '100%', marginTop: '0.25rem' }}
          >
            {loading ? t('predictions.creando') : t('predictions.crear')}
          </button>

          {/* Feedback */}
          {message === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '0.625rem 1rem',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 8,
                fontSize: '0.82rem',
                color: '#34d399',
                textAlign: 'center',
              }}
            >
              {t('predictions.creada')}
            </motion.div>
          )}
          {message && message !== 'success' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--sf-warning)', textAlign: 'center' }}>{message}</p>
          )}
          {!channel && (
            <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-3)', textAlign: 'center' }}>
              {t('predictions.emptyChannel')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
