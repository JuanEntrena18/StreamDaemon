import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { apiGet, apiPost, apiPut } from '../utils/api';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState } from './EmptyState';
import styles from './CommandsPanel.module.css';

interface Props {
  channel: string;
}

interface ChatTimer {
  id: string;
  name: string;
  response: string;
  intervalMinutes: number;
  minLines: number;
  enabled: boolean;
}

export function TimersTab({ channel }: Props) {
  const { t } = useTranslation();
  const [timers, setTimers] = useState<ChatTimer[]>([]);
  const [editing, setEditing] = useState<ChatTimer | null>(null);
  const [newName, setNewName] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [newInterval, setNewInterval] = useState(15);
  const [newLines, setNewLines] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ChatTimer | null>(null);

  useEffect(() => {
    if (!channel) return;
    apiGet(`/timers/${channel}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTimers(data); })
      .catch(() => {});
  }, [channel]);

  const addTimer = async () => {
    if (!newName.trim() || !newResponse.trim()) return;
    setSaving(true);
    setError('');
    try {
      const r = await apiPost('/timers/add', { 
        channel, 
        name: newName.trim(), 
        response: newResponse.trim(),
        intervalMinutes: newInterval,
        minLines: newLines
      });
      if (r.ok) {
        const timer = await r.json();
        setTimers((prev) => [...prev, timer]);
        setNewName('');
        setNewResponse('');
        setNewInterval(15);
        setNewLines(0);
      } else {
        const data = await r.json();
        setError(data.error || t('commands.errorCrear'));
      }
    } catch {
      setError(t('commands.errorConexion'));
    } finally {
      setSaving(false);
    }
  };

  const toggleTimer = async (timer: ChatTimer) => {
    await apiPut('/timers/toggle', { channel, timerId: timer.id, enabled: !timer.enabled });
    setTimers((prev) => prev.map((t) => t.id === timer.id ? { ...t, enabled: !t.enabled } : t));
  };

  const deleteTimer = async (timer: ChatTimer) => {
    await apiPost('/timers/delete', { channel, timerId: timer.id });
    setTimers((prev) => prev.filter((t) => t.id !== timer.id));
  };

  const updateTimer = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiPut('/timers/update', { 
        channel, 
        timerId: editing.id, 
        name: editing.name,
        response: editing.response, 
        intervalMinutes: editing.intervalMinutes, 
        minLines: editing.minLines 
      });
      setTimers((prev) => prev.map((t) => t.id === editing.id ? editing : t));
      setEditing(null);
    } catch {
      setError(t('commands.errorActualizar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="sf-heading">{t('commands.timersTitle')}</h2>
        <p className="text-sm text-muted">{t('commands.timersSubtitle')}</p>
      </div>

      {/* Add new timer */}
      <div className="glass-card sf-card--tight mb-4">
        <div className="flex-between mb-3">
          <p className="sf-section-title" style={{ margin: 0 }}>{t('commands.nuevoTimer')}</p>
        </div>
        <div className="flex-col flex-col--gap-sm">
          <div className="flex-row flex-row--gap-sm">
            <input
              type="text" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('commands.nombreTimerPlaceholder')}
              className="sf-input" style={{ flex: 1 }}
            />
            <label className="flex-row flex-row--gap-xs text-sm" style={{ alignItems: 'center' }}>
              {t('commands.intervaloMinutos')}
              <input type="number" min={1} value={newInterval} onChange={(e) => setNewInterval(parseInt(e.target.value) || 1)} className="sf-input" style={{ width: '70px' }} />
            </label>
            <label className="flex-row flex-row--gap-xs text-sm" style={{ alignItems: 'center' }}>
              {t('commands.lineasMinimas')}
              <input type="number" min={0} value={newLines} onChange={(e) => setNewLines(parseInt(e.target.value) || 0)} className="sf-input" style={{ width: '70px' }} />
            </label>
          </div>
          <input
            type="text" value={newResponse}
            onChange={(e) => setNewResponse(e.target.value)}
            placeholder={t('commands.respuestaPlaceholder')}
            className={`sf-input ${styles.inputFull}`}
          />
        </div>
        <div className="flex-row flex-row--gap-sm mt-3">
          <button onClick={addTimer} disabled={saving || !newName.trim() || !newResponse.trim()}
            className="sf-btn sf-btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
            {saving ? '...' : t('commands.crearTimer')}
          </button>
          {error && <span className={styles.errorText}>{error}</span>}
        </div>
      </div>

      {/* Timer list */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        {timers.length === 0 ? (
          <EmptyState
            icon="⏱️"
            title={t('commands.timersTitle') || 'Timers'}
            description={channel ? (t('commands.emptyTimers') || 'Crea tu primer timer arriba.') : (t('commands.emptyChannel') || 'Conecta un canal.')}
            actionLabel={!channel ? (t('commands.emptyAction') || 'Ir a Configuración') : undefined}
            onAction={!channel ? () => window.dispatchEvent(new CustomEvent('navigateTab', { detail: 'config' })) : undefined}
          />
        ) : (
          <div className="flex-col flex-col--gap-sm">
            {timers.map((timer) => (
              editing?.id === timer.id ? (
                /* Edit mode */
                <div key={timer.id} className={styles.editCard}>
                  <div className={styles.editFormRow}>
                    <input
                      value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder={t('commands.nombreTimerPlaceholder')} className="sf-input" style={{ width: 150 }}
                    />
                    <input
                      value={editing.response} onChange={(e) => setEditing({ ...editing, response: e.target.value })}
                      className="sf-input w-full text-sm" style={{ flex: 1 }}
                    />
                  </div>
                  <div className={styles.editActions}>
                    <label className={styles.checkboxLabel}>
                      {t('commands.intervaloMinutos')}:
                      <input type="number" min={1} value={editing.intervalMinutes} onChange={(e) => setEditing({ ...editing, intervalMinutes: parseInt(e.target.value) || 1 })} className={styles.cooldownInput} />
                    </label>
                    <label className={styles.checkboxLabel}>
                      {t('commands.lineasMinimas')}:
                      <input type="number" min={0} value={editing.minLines} onChange={(e) => setEditing({ ...editing, minLines: parseInt(e.target.value) || 0 })} className={styles.cooldownInput} />
                    </label>
                    <button onClick={updateTimer} disabled={saving} className="sf-btn sf-btn-primary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>{t('commands.guardar')}</button>
                    <button onClick={() => setEditing(null)} className="sf-btn sf-btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>{t('commands.cancelar')}</button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div key={timer.id} className={styles.commandRow} style={{ opacity: timer.enabled ? 1 : 0.4 }}>
                  <span className={timer.enabled ? styles.commandDotEnabled : styles.commandDotDisabled} />
                  <strong className={styles.commandName}>{timer.name}</strong>
                  <span className={styles.commandResponse}>{timer.response}</span>
                  <span className="text-dim text-xs" style={{ whiteSpace: 'nowrap' }}>
                    {timer.intervalMinutes}m {timer.minLines > 0 ? `| ${timer.minLines}L` : ''}
                  </span>
                  <button onClick={() => setEditing(timer)} className={`sf-btn sf-btn-ghost ${styles.pillActionBtnSm}`} title={t('commands.editar')}>✏️</button>
                  <button onClick={() => toggleTimer(timer)} className={`sf-btn sf-btn-ghost ${styles.pillActionBtnSm}`} title={timer.enabled ? t('commands.deshabilitar') : t('commands.habilitar')}>
                    {timer.enabled ? '🔕' : '🔔'}
                  </button>
                  <button onClick={() => setConfirmDelete(timer)} className={`sf-btn sf-btn-ghost ${styles.ghostBtnDanger}`} title={t('commands.eliminar')}>🗑️</button>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDelete !== null}
        title={t('commands.confirmDeleteTimerTitle')}
        message={t('commands.confirmDeleteTimerMsg', { name: confirmDelete?.name || '' })}
        confirmLabel={t('commands.eliminar')}
        onConfirm={() => { if (confirmDelete) deleteTimer(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
