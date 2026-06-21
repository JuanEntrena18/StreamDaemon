import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { apiPost } from '../utils/api';
import { ConfirmModal } from './ConfirmModal';
import styles from './ModPanel.module.css';

interface Props {
  channel: string;
  backendUrl: string;
}

type ModAction = 'timeout' | 'ban' | 'unban';

export function ModPanel({ channel, backendUrl }: Props) {
  const { t } = useTranslation();
  const [userName, setUserName] = useState('');
  const [duration, setDuration] = useState(300);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<ModAction>('timeout');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatters, setChatters] = useState<{ userName: string; userDisplayName: string }[]>([]);
  const [chattersLoading, setChattersLoading] = useState(true);
  const [chattersError, setChattersError] = useState('');
  const [showBanConfirm, setShowBanConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      setChattersLoading(true);
      setChattersError('');
      try {
        const r = await fetch(`${backendUrl}/mod/chatters/${encodeURIComponent(channel)}`);
        if (!r.ok) {
          const d = await r.json();
          setChattersError(d.error || t('mod.errorUsuarios'));
          return;
        }
        const d = await r.json();
        setChatters(d.chatters || []);
      } catch {
        setChattersError(t('mod.errorConexion'));
      } finally {
        setChattersLoading(false);
      }
    })();
  }, [channel]);

  const filteredChatters = chatters.filter((c) =>
    c.userName.toLowerCase().includes(userName.toLowerCase())
  );

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
      setResult({ ok: false, message: t('mod.errorConexion') });
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          {t('mod.title')}
        </h2>
        <p className={styles.subtitle}>
          {t('mod.subtitle')}
        </p>
      </div>

      <div className={`glass-card ${styles.card}`}>
        {/* Action selector */}
        <div className={styles.actionBar}>
          {(['timeout', 'ban', 'unban'] as ModAction[]).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`sf-btn ${styles.actionBtn} ${action === a ? styles['actionBtn--active'] : styles['actionBtn--inactive']}`}
            >
              {a === 'timeout' ? t('mod.timeout') : a === 'ban' ? t('mod.ban') : t('mod.unban')}
            </button>
          ))}
        </div>

        {/* Username */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            {t('mod.usuario')}
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') execute(); }}
            placeholder={t('mod.usuarioPlaceholder')}
            className="sf-input w-full"
          />

          {/* Chatters list */}
          {chattersLoading ? (
            <div className={styles.chattersLoading}>
              {t('mod.cargandoUsuarios')}
            </div>
          ) : chattersError ? (
            <div className={styles.chattersError}>
              {chattersError}
            </div>
          ) : filteredChatters.length > 0 ? (
            <div className={styles.chattersList}>
              {filteredChatters.map((c) => (
                <div
                  key={c.userName}
                  onClick={() => setUserName(c.userName)}
                  className={styles.chatterItem}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sf-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {c.userDisplayName}
                </div>
              ))}
            </div>
          ) : userName && filteredChatters.length === 0 ? (
            <div className={styles.noResults}>
              {t('mod.noEncontrado')}
            </div>
          ) : null}
        </div>

        {/* Duration (timeout only) */}
        {action === 'timeout' && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              {t('mod.duracion')}
            </label>
            <div className={styles.durationPresets}>
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDuration(p.value)}
                  className={`sf-btn ${styles.durationBtn} ${duration === p.value ? styles['durationBtn--active'] : styles['durationBtn--inactive']}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reason */}
        {action !== 'unban' && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              {t('mod.razon')}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('mod.razonPlaceholder')}
              className="sf-input w-full"
            />
          </div>
        )}

        {/* Execute */}
        <button onClick={() => action === 'ban' ? setShowBanConfirm(true) : execute()} disabled={loading || !userName.trim()} className={`sf-btn ${styles.executeBtn}`} style={{
          background: action === 'timeout' ? 'rgba(245,158,11,0.15)' : action === 'ban' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          color: action === 'timeout' ? '#fbbf24' : action === 'ban' ? '#f87171' : '#34d399',
          border: `1px solid ${action === 'timeout' ? 'rgba(245,158,11,0.3)' : action === 'ban' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
        }}>
          {loading ? t('mod.procesando') : `${t('mod.ejecutar')} ${action === 'timeout' ? t('mod.timeout') : action === 'ban' ? t('mod.ban') : t('mod.unban')}`}
        </button>

        <ConfirmModal
          open={showBanConfirm}
          title={t('mod.confirmBanTitle')}
          message={t('mod.confirmBanMsg', { user: userName })}
          confirmLabel={t('mod.ban')}
          onConfirm={() => { setShowBanConfirm(false); execute(); }}
          onCancel={() => setShowBanConfirm(false)}
        />

        {/* Result */}
        {result && (
          <div className={`${styles.resultBox} ${result.ok ? styles['resultBox--ok'] : styles['resultBox--err']}`}>
            {result.ok ? '✅ ' : '❌ '}{result.message}
          </div>
        )}
      </div>
    </div>
  );
}
