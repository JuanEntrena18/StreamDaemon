import { useState, useEffect } from 'react';
import { apiPut } from '../utils/api';
import { useTranslation } from '../i18n/context';
import { useToast } from '../contexts/ToastContext';
import styles from './StreamInfoEditor.module.css';

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
  const toast = useToast();
  const [info, setInfo] = useState<StreamInfo>({ title: '', gameName: '', isLive: false });
  const [title, setTitle] = useState('');
  const [game, setGame] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
    try {
      const r = await apiPut('/stream/info', { channel, title, game });
      if (!r.ok) {
        const data = await r.json();
        toast.error(data.error || t('info.errorGuardar') || 'Error al guardar');
      } else {
        toast.success(t('info.guardado'));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      toast.error(t('info.errorConexion') || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          {t('info.title')}
        </h2>
        <p className={styles.subtitle}>
          {t('info.subtitle')}
        </p>
      </div>

      <div className={`glass-card ${styles.card}`}>
        {/* Estado */}
        <div className={styles.statusRow}>
          <span className={`${styles.statusDot} ${info.isLive ? styles['statusDot--live'] : styles['statusDot--offline']}`} />
          <span className={styles.statusLabel}>
            {info.isLive ? t('info.enVivo') : t('info.offline')}
          </span>
        </div>

        {/* Título */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
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
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
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
        <div className={styles.actions}>
          <button onClick={save} disabled={saving} className={`sf-btn sf-btn-primary ${styles.saveBtn}`}>
            {saving ? t('info.guardando') : t('info.guardarCambios')}
          </button>
          {saved && <span className={styles.savedText}>{t('info.guardado')}</span>}
        </div>
      </div>

      {/* Info actual */}
      <div className={`glass-card ${styles.infoCard}`}>
        <p className="sf-section-title">{t('info.estadoActual')}</p>
        <div className={styles.infoLines}>
          <div><strong className={styles.infoLabel}>{t('info.tituloLabel')}:</strong> {info.title || t('info.sinTitulo')}</div>
          <div><strong className={styles.infoLabel}>{t('info.juegoLabel')}:</strong> {info.gameName || t('info.sinCategoria')}</div>
        </div>
      </div>
    </div>
  );
}
