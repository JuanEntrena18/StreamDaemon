import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/context';
import { useToast } from '../contexts/ToastContext';
import { apiPost } from '../utils/api';
import { EmptyState } from './EmptyState';
import styles from './PredictionPanel.module.css';

interface Props {
  channel: string;
  backendUrl: string;
}

export function PredictionPanel({ channel }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
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
    const res = await apiPost('/predictions/create', {
      channelId: channel,
      title: title.trim(),
      options: validOptions.map((o) => o.trim()),
    });

    setLoading(false);
    if (res.ok) {
      setTitle('');
      setOptions(['', '']);
      toast.success(t('predictions.creada'));
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || t('predictions.errorCrear') || 'Error');
    }
  };

  const validOptions = options.filter((o) => o.trim());
  const canCreate = title.trim() && validOptions.length >= 2 && !!channel;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.heading}>
          {t('predictions.title')}
        </h2>
        <p className={styles.subtitle}>
          {t('predictions.subtitle')}
        </p>
      </div>

      <div className={`glass-card ${styles.card}`}>
        <p className="sf-section-title">{t('predictions.nuevaPrediccion')}</p>

        {!channel ? (
          <EmptyState
            icon="🔮"
            title={t('predictions.emptyTitle') || 'Sin conexión'}
            description={t('predictions.emptyChannel') || 'Conecta tu cuenta de Twitch en Configuración para crear predicciones.'}
            actionLabel={t('predictions.emptyAction') || 'Ir a Configuración'}
            onAction={() => window.dispatchEvent(new CustomEvent('navigateTab', { detail: 'config' }))}
          />
        ) : (
          <div className={styles.formFields}>
          {/* Title */}
          <div>
            <label className={styles.fieldLabel}>
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
            <label className={styles.fieldLabel}>
              {t('predictions.opciones')}
              <span className={styles.fieldHint}>
                {t('predictions.opcionesHint')}
              </span>
            </label>
            <div className={styles.optionsList}>
              {options.map((opt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={styles.optionRow}
                >
                  <div className={styles.optionBadge}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <input
                    id={`prediction-option-${i}`}
                    type="text"
                    placeholder={t('predictions.opcion', { number: i + 1 })}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    disabled={!channel}
                    className={`sf-input ${styles.optionInput}`}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      disabled={!channel}
                      className={styles.removeBtn}
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
                className={styles.addOptionBtn}
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
            className={`sf-btn sf-btn-primary ${styles.submitBtn}`}
          >
            {loading ? t('predictions.creando') : t('predictions.crear')}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
