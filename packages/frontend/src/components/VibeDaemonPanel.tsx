import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet, apiPut, apiPost, OVERLAY_BASE_URL } from '../utils/api';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useTranslation } from '../i18n/context';
import { Toggle } from './Toggle';
import type {
  VibeDaemonConfig,
  VibeDaemonTrigger,
  VibeDaemonState,
  VibeDaemonEvent,
  VibeDaemonActivation,
  VibeDaemonEventType,
  VibeDaemonGameId,
  VibeDaemonActionType,
  VibeDaemonConditionType,
  VibeDaemonResetPeriod,
  VibeDaemonCondition,
  VibeDaemonAction,
} from '@streamdaemon/shared';
import styles from './VibeDaemonPanel.module.css';
import { VibeCvSection } from './VibeCvSection';

interface Props {
  channel: string;
}

const EVENT_TYPES: VibeDaemonEventType[] = [
  'kill', 'death', 'victory', 'kill_streak', 'victory_streak',
  'low_health', 'low_shield', 'storm_shrinking', 'manual',
];
const CONDITION_TYPES: VibeDaemonConditionType[] = ['count', 'threshold', 'state'];
const PERIODS: VibeDaemonResetPeriod[] = ['session', 'match', 'round', 'time_window'];
const ACTION_TYPES: VibeDaemonActionType[] = ['overlay', 'media', 'sound', 'chat', 'tts'];

const GAME_ICONS: Record<string, string> = { global: '🌍', fortnite: '🪂' };

interface TriggerEditorProps {
  trigger: VibeDaemonTrigger;
  onPatch: (patch: Partial<VibeDaemonTrigger>) => void;
  onPatchCondition: (patch: Partial<VibeDaemonCondition>) => void;
  onPatchAction: (patch: Partial<VibeDaemonAction>) => void;
  onDelete: () => void;
  onTest: () => void;
}

function numVal(v: string | undefined): number {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : 0;
}

function TriggerEditor({ trigger, onPatch, onPatchCondition, onPatchAction, onDelete, onTest }: TriggerEditorProps) {
  const { t } = useTranslation();
  const condition = trigger.condition;
  const action = trigger.action;
  const showsThreshold = condition.type === 'count' || condition.type === 'threshold';
  const showsPeriod = condition.type !== 'state';

  return (
    <div className={styles.daemonCard}>
      <div className={styles.daemonHeader}>
        <input
          className={`sf-input ${styles.daemonNameInput}`}
          value={trigger.name}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
        <Toggle
          size="sm"
          checked={trigger.enabled}
          onChange={(enabled) => onPatch({ enabled })}
        />
        <button className={`sf-btn ${styles.testBtn}`} onClick={onTest}>
          ▶ {t('vibedaemon.test')}
        </button>
        <button className={`sf-btn ${styles.deleteBtn}`} onClick={onDelete}>
          🗑 {t('vibedaemon.delete')}
        </button>
      </div>

      <div className={styles.configGrid}>
        <div>
          <label className={styles.fieldLabel}>{t('vibedaemon.eventType')}</label>
          <select
            className={`sf-input ${styles.fieldInput}`}
            value={trigger.eventType}
            onChange={(e) => onPatch({ eventType: e.target.value as VibeDaemonEventType })}
          >
            {EVENT_TYPES.map((et) => (
              <option key={et} value={et}>{t(`vibedaemon.event_${et}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={styles.fieldLabel}>{t('vibedaemon.conditionType')}</label>
          <select
            className={`sf-input ${styles.fieldInput}`}
            value={condition.type}
            onChange={(e) => onPatchCondition({ type: e.target.value as VibeDaemonConditionType })}
          >
            {CONDITION_TYPES.map((ct) => (
              <option key={ct} value={ct}>{t(`vibedaemon.condition_${ct}`)}</option>
            ))}
          </select>
        </div>

        {showsThreshold && (
          <div>
            <label className={styles.fieldLabel}>{t('vibedaemon.triggerThreshold')}</label>
            <input
              type="number"
              min={1}
              className={`sf-input ${styles.fieldInput}`}
              value={condition.type === 'threshold' ? condition.threshold ?? 1 : condition.count ?? 1}
              onChange={(e) => {
                const value = Math.max(1, numVal(e.target.value));
                onPatchCondition(condition.type === 'threshold' ? { threshold: value } : { count: value });
              }}
            />
          </div>
        )}

        {showsPeriod && (
          <div>
            <label className={styles.fieldLabel}>{t('vibedaemon.resetPeriod')}</label>
            <select
              className={`sf-input ${styles.fieldInput}`}
              value={condition.period ?? 'session'}
              onChange={(e) => onPatchCondition({ period: e.target.value as VibeDaemonResetPeriod })}
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>{t(`vibedaemon.period_${p}`)}</option>
              ))}
            </select>
          </div>
        )}

        {condition.period === 'time_window' && (
          <div>
            <label className={styles.fieldLabel}>{t('vibedaemon.timeWindow')}</label>
            <input
              type="number"
              min={1}
              className={`sf-input ${styles.fieldInput}`}
              value={condition.timeWindowSeconds ?? 60}
              onChange={(e) => onPatchCondition({ timeWindowSeconds: Math.max(1, numVal(e.target.value)) })}
            />
          </div>
        )}

        <div>
          <label className={styles.fieldLabel}>{t('vibedaemon.cooldown')}</label>
          <input
            type="number"
            min={0}
            step={500}
            className={`sf-input ${styles.fieldInput}`}
            value={trigger.cooldownMs ?? 0}
            onChange={(e) => onPatch({ cooldownMs: Math.max(0, numVal(e.target.value)) })}
          />
        </div>

        <div>
          <label className={styles.fieldLabel}>{t('vibedaemon.actionType')}</label>
          <select
            className={`sf-input ${styles.fieldInput}`}
            value={action.type}
            onChange={(e) => onPatchAction({ type: e.target.value as VibeDaemonActionType })}
          >
            {ACTION_TYPES.map((at) => (
              <option key={at} value={at}>{t(`vibedaemon.action_${at}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={styles.fieldLabel}>{t('vibedaemon.duration')}</label>
          <input
            type="number"
            min={100}
            max={60000}
            step={500}
            className={`sf-input ${styles.fieldInput}`}
            value={action.durationMs ?? 3000}
            onChange={(e) => onPatchAction({ durationMs: Math.max(100, numVal(e.target.value)) })}
          />
        </div>

        {(action.type === 'media') && (
          <div className={styles.fullRow}>
            <label className={styles.fieldLabel}>{t('vibedaemon.mediaUrl')}</label>
            <input
              className={`sf-input ${styles.fieldInput}`}
              value={action.mediaUrl ?? ''}
              placeholder="https://.../Fire_XL.webm"
              onChange={(e) => onPatchAction({ mediaUrl: e.target.value })}
            />
          </div>
        )}

        {action.type === 'sound' && (
          <>
            <div className={styles.fullRow}>
              <label className={styles.fieldLabel}>{t('vibedaemon.soundUrl')}</label>
              <input
                className={`sf-input ${styles.fieldInput}`}
                value={action.soundUrl ?? ''}
                placeholder="https://.../Elimination-02.mp3"
                onChange={(e) => onPatchAction({ soundUrl: e.target.value })}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>{t('vibedaemon.volume')} ({Math.round((action.volume ?? 0.7) * 100)}%)</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                className={styles.fieldInput}
                value={action.volume ?? 0.7}
                onChange={(e) => onPatchAction({ volume: numVal(e.target.value) / 100 })}
              />
            </div>
          </>
        )}

        <div className={styles.fullRow}>
          <label className={styles.fieldLabel}>{t('vibedaemon.messageTemplate')}</label>
          <input
            className={`sf-input ${styles.fieldInput}`}
            value={action.message ?? ''}
            placeholder="{{trigger}} · {{event}}"
            onChange={(e) => onPatchAction({ message: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function VibeDaemonPanel({ channel }: Props) {
  const { t } = useTranslation();
  const { socket, connected } = useSocket();
  const [config, setConfig] = useState<VibeDaemonConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [state, setState] = useState<VibeDaemonState | null>(null);
  const [lastActivation, setLastActivation] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newGameId, setNewGameId] = useState<string>('global');
  const [newGameCustom, setNewGameCustom] = useState('');
  const [newName, setNewName] = useState('');
  const [newEventType, setNewEventType] = useState<VibeDaemonEventType>('kill');

  useEffect(() => {
    if (channel && connected) socket.emit('join:channel', channel);
  }, [channel, connected, socket]);

  useEffect(() => {
    apiGet('/vibe-daemon/config')
      .then((r) => r.json())
      .then((data: VibeDaemonConfig) => setConfig(data))
      .catch(() => {});
  }, []);

  const refreshState = useCallback(() => {
    if (!channel) return;
    apiGet(`/vibe-daemon/state/${encodeURIComponent(channel)}`)
      .then((r) => r.json())
      .then((data: VibeDaemonState) => setState(data))
      .catch(() => {});
  }, [channel]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useSocketEvent('vibe-daemon:state', useCallback((data: VibeDaemonState) => {
    if (data?.channel === channel) setState(data);
  }, [channel]));

  useSocketEvent('vibe-daemon:activation', useCallback((data: VibeDaemonActivation) => {
    if (data?.channel === channel) setLastActivation(data.triggerName);
  }, [channel]));

  const groups = useMemo(() => {
    if (!config) return [];
    const map = new Map<VibeDaemonGameId, VibeDaemonTrigger[]>();
    for (const trigger of config.triggers) {
      const list = map.get(trigger.gameId) ?? [];
      list.push(trigger);
      map.set(trigger.gameId, list);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === 'global') return -1;
      if (b[0] === 'global') return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [config]);

  const mutate = useCallback((updater: (cfg: VibeDaemonConfig) => VibeDaemonConfig) => {
    setConfig((c) => (c ? updater(c) : c));
    setDirty(true);
    setSavedFlash(false);
  }, []);

  const patchTrigger = useCallback((id: string, patch: Partial<VibeDaemonTrigger>) => {
    mutate((cfg) => ({
      ...cfg,
      triggers: cfg.triggers.map((tr) => (tr.id === id ? { ...tr, ...patch } : tr)),
    }));
  }, [mutate]);

  const patchCondition = useCallback((id: string, patch: Partial<VibeDaemonCondition>) => {
    mutate((cfg) => ({
      ...cfg,
      triggers: cfg.triggers.map((tr) => (
        tr.id === id ? { ...tr, condition: { ...tr.condition, ...patch } } : tr
      )),
    }));
  }, [mutate]);

  const patchAction = useCallback((id: string, patch: Partial<VibeDaemonAction>) => {
    mutate((cfg) => ({
      ...cfg,
      triggers: cfg.triggers.map((tr) => (
        tr.id === id ? { ...tr, action: { ...tr.action, ...patch } } : tr
      )),
    }));
  }, [mutate]);

  const deleteTrigger = useCallback((id: string) => {
    mutate((cfg) => ({ ...cfg, triggers: cfg.triggers.filter((tr) => tr.id !== id) }));
  }, [mutate]);

  const addTrigger = useCallback(() => {
    const gameId = (newGameId === 'custom' ? newGameCustom.trim().toLowerCase() : newGameId) || 'global';
    if (!newName.trim()) return;
    const trigger: VibeDaemonTrigger = {
      id: `vd-${gameId}-${Date.now().toString(36)}`,
      gameId,
      name: newName.trim(),
      enabled: true,
      eventType: newEventType,
      condition: { type: 'count', count: 1, period: 'session' },
      action: { type: 'overlay', overlayId: 'vibe-daemon', durationMs: 3000 },
    };
    mutate((cfg) => ({ ...cfg, triggers: [...cfg.triggers, trigger] }));
    setNewName('');
    setNewGameCustom('');
  }, [newGameId, newGameCustom, newName, newEventType, mutate]);

  const save = useCallback(async () => {
    if (!config) return;
    const res = await apiPut('/vibe-daemon/config', config);
    if (res.ok) {
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  }, [config]);

  const testTrigger = useCallback((trigger: VibeDaemonTrigger) => {
    if (!channel) return;
    apiPost('/vibe-daemon/test', { channel, eventType: trigger.eventType, gameId: trigger.gameId }).catch(() => {});
  }, [channel]);

  const sendEvent = useCallback((eventType: VibeDaemonEventType, gameId: string = 'global') => {
    if (!channel) return;
    const event: VibeDaemonEvent = { channel, gameId, eventType, timestamp: Date.now() };
    apiPost('/vibe-daemon/event', event).catch(() => {});
  }, [channel]);

  const resetSession = useCallback(() => {
    if (!channel) return;
    apiPost(`/vibe-daemon/reset/${encodeURIComponent(channel)}`, { gameId: 'global' })
      .then(() => refreshState())
      .catch(() => {});
  }, [channel, refreshState]);

  const overlayUrl = `${OVERLAY_BASE_URL}/overlays/vibe-daemon.html?channel=${encodeURIComponent(channel)}`;

  const copyUrl = useCallback(() => {
    navigator.clipboard?.writeText(overlayUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [overlayUrl]);

  const hotkeys = config?.hotkeys ?? {};

  return (
    <div className={styles.container}>
      <div className="mb-5">
        <h2 className="sf-heading">👹 {t('vibedaemon.title')}</h2>
        <p className="text-sm text-muted">{t('vibedaemon.subtitle')}</p>
      </div>

      {config && (
        <div className="glass-card sf-card--tight mb-5 flex-wrap" style={{ gap: '0.75rem', alignItems: 'center' }}>
          <Toggle
            size="sm"
            checked={config.enabled}
            label={t('vibedaemon.enabled')}
            onChange={(enabled) => mutate((cfg) => ({ ...cfg, enabled }))}
          />
          <div style={{ flex: 1 }} />
          {dirty && <span className={styles.dirtyBadge}>● {t('vibedaemon.dirty')}</span>}
          {savedFlash && <span className={styles.savedFlash}>✓ {t('vibedaemon.saved')}</span>}
          <button className="sf-btn sf-btn--primary" onClick={save} disabled={!dirty}>
            💾 {t('vibedaemon.save')}
          </button>
        </div>
      )}

      {config && groups.map(([gameId, triggers]) => (
        <div key={gameId} className="mb-5">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>{GAME_ICONS[gameId] ?? '🎮'}</span>
            <span>{gameId === 'global' ? t('vibedaemon.globalSection') : gameId.toUpperCase()}</span>
            <span className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 400 }}>
              ({triggers.length})
            </span>
          </div>
          {triggers.map((trigger) => (
            <TriggerEditor
              key={trigger.id}
              trigger={trigger}
              onPatch={(patch) => patchTrigger(trigger.id, patch)}
              onPatchCondition={(patch) => patchCondition(trigger.id, patch)}
              onPatchAction={(patch) => patchAction(trigger.id, patch)}
              onDelete={() => deleteTrigger(trigger.id)}
              onTest={() => testTrigger(trigger)}
            />
          ))}
        </div>
      ))}

      {config && (
        <div className="glass-card sf-card--tight mb-5">
          <p className="sf-section-title">➕ {t('vibedaemon.addTitle')}</p>
          <div className={styles.addForm}>
            <div className={styles.addField}>
              <label className={styles.fieldLabel}>{t('vibedaemon.game')}</label>
              <select
                className={`sf-input ${styles.fieldInput}`}
                value={newGameId}
                onChange={(e) => setNewGameId(e.target.value)}
              >
                <option value="global">🌍 {t('vibedaemon.globalSection')}</option>
                <option value="fortnite">🪂 Fortnite</option>
                <option value="custom">{t('vibedaemon.newGameCustom')}</option>
              </select>
            </div>
            {newGameId === 'custom' && (
              <div className={styles.addField}>
                <label className={styles.fieldLabel}>{t('vibedaemon.gameId')}</label>
                <input
                  className={`sf-input ${styles.fieldInput}`}
                  value={newGameCustom}
                  placeholder={t('vibedaemon.gameIdPlaceholder')}
                  onChange={(e) => setNewGameCustom(e.target.value)}
                />
              </div>
            )}
            <div className={styles.addField}>
              <label className={styles.fieldLabel}>{t('vibedaemon.name')}</label>
              <input
                className={`sf-input ${styles.fieldInput}`}
                value={newName}
                placeholder="Low Ammo"
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className={styles.addField}>
              <label className={styles.fieldLabel}>{t('vibedaemon.eventType')}</label>
              <select
                className={`sf-input ${styles.fieldInput}`}
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value as VibeDaemonEventType)}
              >
                {EVENT_TYPES.map((et) => (
                  <option key={et} value={et}>{t(`vibedaemon.event_${et}`)}</option>
                ))}
              </select>
            </div>
            <button className="sf-btn sf-btn--primary" onClick={addTrigger}>
              ➕ {t('vibedaemon.add')}
            </button>
          </div>
        </div>
      )}

      <div className="glass-card sf-card--tight mb-5">
        <p className="sf-section-title">📊 {t('vibedaemon.sessionState')}</p>
        <div className={styles.stateGrid}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{state?.kills ?? 0}</div>
            <div className={styles.statLabel}>{t('vibedaemon.kills')}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{state?.deaths ?? 0}</div>
            <div className={styles.statLabel}>{t('vibedaemon.deaths')}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{state?.victories ?? 0}</div>
            <div className={styles.statLabel}>{t('vibedaemon.victories')}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{state?.killStreak ?? 0}</div>
            <div className={styles.statLabel}>{t('vibedaemon.killStreak')}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{state?.victoryStreak ?? 0}</div>
            <div className={styles.statLabel}>{t('vibedaemon.victoryStreak')}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{state?.maxKillStreak ?? 0}</div>
            <div className={styles.statLabel}>{t('vibedaemon.bestKillStreak')}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{state?.maxVictoryStreak ?? 0}</div>
            <div className={styles.statLabel}>{t('vibedaemon.bestVictoryStreak')}</div>
          </div>
        </div>
        {lastActivation && (
          <div className={styles.lastActivation}>
            {t('vibedaemon.lastActivation')}: <strong>{lastActivation}</strong>
          </div>
        )}
        <div className="flex-wrap mt-3" style={{ gap: '0.5rem' }}>
          <button className={styles.killBtn} onClick={() => sendEvent('kill')}>🔥 {t('vibedaemon.sendKill')}</button>
          <button className={styles.deathBtn} onClick={() => sendEvent('death')}>💀 {t('vibedaemon.sendDeath')}</button>
          <button className={styles.victoryBtn} onClick={() => sendEvent('victory')}>👑 {t('vibedaemon.sendVictory')}</button>
          <button className="sf-btn" onClick={resetSession}>🔄 {t('vibedaemon.resetSession')}</button>
        </div>
      </div>

      <VibeCvSection />

      <div className="glass-card sf-card--tight mb-5">
        <p className="sf-section-title">⌨️ {t('vibedaemon.hotkeys')}</p>
        <div className={styles.hotkeyRow}>
          {(['kill', 'death', 'victory'] as const).map((k) => (
            hotkeys[k] ? (
              <span key={k}>
                {t(`vibedaemon.event_${k === 'kill' ? 'kill' : k}`)}: <span className={styles.hotkeyKey}>{hotkeys[k]}</span>
              </span>
            ) : null
          ))}
        </div>
        <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
          {t('vibedaemon.hotkeysNote')}
        </p>
      </div>

      <div className="glass-card sf-card--tight">
        <p className="sf-section-title">🔗 {t('vibedaemon.overlayUrl')}</p>
        <div className={styles.urlBox}>{overlayUrl}</div>
        <div className="mt-3">
          <button className="sf-btn" onClick={copyUrl}>
            {copied ? `✓ ${t('vibedaemon.copied')}` : `📋 ${t('vibedaemon.copy')}`}
          </button>
        </div>
      </div>
    </div>
  );
}
