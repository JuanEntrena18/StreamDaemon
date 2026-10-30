import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n/context';
import { Toggle } from './Toggle';
import type {
  VibeCvConfig,
  VibeCvStatus,
  VibeCvCaptureDebug,
  VibeCvRoi,
  VibeCvRatios,
} from '@streamdaemon/shared';
import styles from './VibeDaemonPanel.module.css';

const isDesktop = typeof window !== 'undefined' && !!window.streamforger?.isDesktop;

function numVal(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

interface RoiEditorProps {
  label: string;
  roi: VibeCvRoi;
  accent: string;
  onChange: (roi: VibeCvRoi) => void;
}

function RoiEditor({ label, roi, accent, onChange }: RoiEditorProps) {
  return (
    <div>
      <span className={styles.fieldLabel} style={{ color: accent }}>{label}</span>
      <div className={styles.cvRoiRow}>
        {(['x', 'y', 'w', 'h'] as const).map((k) => (
          <input
            key={k}
            type="number"
            min={0}
            max={1}
            step={0.005}
            title={k}
            className={`sf-input ${styles.cvRoiInput}`}
            value={roi[k]}
            onChange={(e) => {
              const v = Math.max(0, Math.min(1, numVal(e.target.value)));
              onChange({ ...roi, [k]: v });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RatioBadge({ label, value, triggered, accent }: { label: string; value: number; triggered: boolean; accent: string }) {
  return (
    <span className={styles.cvRatioBadge} style={{ borderColor: triggered ? accent : 'var(--sf-border)' }}>
      <span className={styles.cvRatioDot} style={{ background: triggered ? accent : 'rgba(255,255,255,0.25)' }} />
      {label} {(value * 100).toFixed(1)}%
    </span>
  );
}

export function VibeCvSection() {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState<VibeCvConfig | null>(null);
  const [status, setStatus] = useState<VibeCvStatus | null>(null);
  const [capture, setCapture] = useState<VibeCvCaptureDebug | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    window.streamforger?.vibeCv.getConfig().then((c) => setCfg(c)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const id = window.setInterval(() => {
      window.streamforger?.vibeCv.getStatus().then((s) => setStatus(s)).catch(() => {});
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const patch = useCallback((p: Partial<VibeCvConfig>) => {
    setCfg((c) => (c ? { ...c, ...p } : c));
  }, []);

  const patchRoi = useCallback((key: 'shieldRoi' | 'healthRoi' | 'stormRoi', p: Partial<VibeCvRoi>) => {
    setCfg((c) => (c && c[key] ? { ...c, [key]: { ...c[key], ...p } } : c));
  }, []);

  const patchCooldowns = useCallback((p: Partial<VibeCvConfig['cooldowns']>) => {
    setCfg((c) => (c ? { ...c, cooldowns: { ...c.cooldowns, ...p } } : c));
  }, []);

  const save = useCallback(async () => {
    if (!cfg || !isDesktop) return;
    const ok = await window.streamforger?.vibeCv.setConfig(cfg);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [cfg]);

  const testCapture = useCallback(async () => {
    if (!isDesktop) return;
    setBusy(true);
    try {
      const cap = await window.streamforger?.vibeCv.captureDebug();
      if (cap) setCapture(cap);
    } catch {
      setCapture({ dataUrl: null, ratios: { shield: 0, health: 0, storm: 0 }, sourceLabel: null, captureSize: null });
    } finally {
      setBusy(false);
    }
  }, []);

  const ratios: VibeCvRatios | null = capture?.ratios ?? status?.ratios ?? null;

  return (
    <div className="glass-card sf-card--tight mb-5">
      <p className="sf-section-title">🧪 {t('vibedaemon.cvTitle')}</p>
      <p className="text-sm text-muted">{t('vibedaemon.cvSubtitle')}</p>

      {!isDesktop && (
        <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--sf-warning)' }}>
          {t('vibedaemon.cvNotDesktop')}
        </p>
      )}

      {isDesktop && cfg && (
        <>
          <div className="flex-wrap mt-3" style={{ gap: '0.75rem', alignItems: 'center' }}>
            <Toggle
              size="sm"
              checked={cfg.enabled}
              label={t('vibedaemon.cvEnabled')}
              onChange={(enabled) => patch({ enabled })}
            />
            <div style={{ flex: 1 }} />
            {saved && <span className={styles.savedFlash}>✓ {t('vibedaemon.cvSaved')}</span>}
            <button className="sf-btn sf-btn--primary" onClick={save}>
              💾 {t('vibedaemon.cvSave')}
            </button>
          </div>

          <div className={styles.configGrid}>
            <div>
              <label className={styles.fieldLabel}>{t('vibedaemon.cvSource')}</label>
              <select
                className={`sf-input ${styles.fieldInput}`}
                value={cfg.sourceType}
                onChange={(e) => patch({ sourceType: e.target.value as VibeCvConfig['sourceType'] })}
              >
                <option value="screen">🖥 {t('vibedaemon.cvScreen')}</option>
                <option value="window">🪟 {t('vibedaemon.cvWindow')}</option>
              </select>
            </div>
            {cfg.sourceType === 'window' && (
              <div>
                <label className={styles.fieldLabel}>{t('vibedaemon.cvWindowTitle')}</label>
                <input
                  className={`sf-input ${styles.fieldInput}`}
                  value={cfg.windowTitleMatch}
                  onChange={(e) => patch({ windowTitleMatch: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className={styles.fieldLabel}>{t('vibedaemon.cvFps')}</label>
              <select
                className={`sf-input ${styles.fieldInput}`}
                value={cfg.captureFps}
                onChange={(e) => patch({ captureFps: numVal(e.target.value) })}
              >
                <option value={0.5}>0.5</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
          </div>

          <div className="flex-wrap mt-3" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <button className="sf-btn" onClick={testCapture} disabled={busy}>
              📸 {busy ? t('vibedaemon.cvAnalyzing') : t('vibedaemon.cvCapture')}
            </button>
            {status && (
              <span className="text-sm text-muted">
                {status.running ? '🟢' : '⚪'}{' '}
                {status.running ? t('vibedaemon.cvRunning') : t('vibedaemon.cvStopped')}
                {status.sourceLabel ? ` · ${status.sourceLabel}` : ''}
              </span>
            )}
          </div>

          {status?.lastError && (
            <p className="text-sm" style={{ marginTop: '0.4rem', color: 'var(--sf-danger)' }}>{status.lastError}</p>
          )}
          {status?.lastEvent && (
            <div className={styles.lastActivation}>
              {t('vibedaemon.lastActivation')}:{' '}
              <strong>{t(`vibedaemon.event_${status.lastEvent.eventType}`)}</strong>
              {' · '}
              {new Date(status.lastEvent.at).toLocaleTimeString()}
            </div>
          )}

          {capture && cfg && (
            <div className="mt-3">
              <div className={styles.cvPreview}>
                {capture.dataUrl ? (
                  <img src={capture.dataUrl} alt="Vibe CV capture" />
                ) : (
                  <div className={styles.cvNoCapture}>{t('vibedaemon.cvNoCapture')}</div>
                )}
                <div
                  className={styles.cvRoiBoxShield}
                  style={{ left: `${cfg.shieldRoi.x * 100}%`, top: `${cfg.shieldRoi.y * 100}%`, width: `${cfg.shieldRoi.w * 100}%`, height: `${cfg.shieldRoi.h * 100}%` }}
                />
                <div
                  className={styles.cvRoiBoxHealth}
                  style={{ left: `${cfg.healthRoi.x * 100}%`, top: `${cfg.healthRoi.y * 100}%`, width: `${cfg.healthRoi.w * 100}%`, height: `${cfg.healthRoi.h * 100}%` }}
                />
                <div
                  className={styles.cvRoiBoxStorm}
                  style={{ left: `${cfg.stormRoi.x * 100}%`, top: `${cfg.stormRoi.y * 100}%`, width: `${cfg.stormRoi.w * 100}%`, height: `${cfg.stormRoi.h * 100}%` }}
                />
              </div>
              <div className={styles.cvRatioRow}>
                <RatioBadge
                  label={t('vibedaemon.cvShield')}
                  value={ratios?.shield ?? 0}
                  triggered={(ratios?.shield ?? 1) < cfg.shieldTriggerRatio}
                  accent="#22d3ee"
                />
                <RatioBadge
                  label={t('vibedaemon.cvHealth')}
                  value={ratios?.health ?? 0}
                  triggered={(ratios?.health ?? 1) < cfg.healthTriggerRatio}
                  accent="#34d399"
                />
                <RatioBadge
                  label={t('vibedaemon.cvStorm')}
                  value={ratios?.storm ?? 0}
                  triggered={(ratios?.storm ?? 0) > cfg.stormTriggerRatio}
                  accent="#c84bff"
                />
              </div>
              {capture.sourceLabel && (
                <p className="text-sm text-muted" style={{ marginTop: '0.4rem' }}>
                  {capture.sourceLabel}
                  {capture.captureSize ? ` · ${capture.captureSize.width}×${capture.captureSize.height}` : ''}
                </p>
              )}
            </div>
          )}

          <button className="sf-btn mt-3" onClick={() => setAdvanced((v) => !v)}>
            {advanced ? '▾' : '▸'} {t('vibedaemon.cvAdvanced')}
          </button>

          {advanced && cfg && (
            <div className="mt-3">
              <p className={styles.fieldLabel}>{t('vibedaemon.cvRois')}</p>
              <div className={styles.configGrid}>
                <RoiEditor
                  label={t('vibedaemon.cvShield')}
                  roi={cfg.shieldRoi}
                  accent="#22d3ee"
                  onChange={(shieldRoi) => patchRoi('shieldRoi', shieldRoi)}
                />
                <RoiEditor
                  label={t('vibedaemon.cvHealth')}
                  roi={cfg.healthRoi}
                  accent="#34d399"
                  onChange={(healthRoi) => patchRoi('healthRoi', healthRoi)}
                />
                <RoiEditor
                  label={t('vibedaemon.cvStorm')}
                  roi={cfg.stormRoi}
                  accent="#c84bff"
                  onChange={(stormRoi) => patchRoi('stormRoi', stormRoi)}
                />
              </div>

              <p className={styles.fieldLabel} style={{ marginTop: '0.75rem' }}>{t('vibedaemon.cvThresholds')}</p>
              <div className={styles.configGrid}>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvShield')} · {t('vibedaemon.cvTriggerRatio')}</label>
                  <input
                    type="number" min={0} max={1} step={0.01}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.shieldTriggerRatio}
                    onChange={(e) => patch({ shieldTriggerRatio: Math.max(0, Math.min(1, numVal(e.target.value))) })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvShield')} · {t('vibedaemon.cvRecoveryRatio')}</label>
                  <input
                    type="number" min={0} max={1} step={0.01}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.shieldRecoveryRatio}
                    onChange={(e) => patch({ shieldRecoveryRatio: Math.max(0, Math.min(1, numVal(e.target.value))) })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvHealth')} · {t('vibedaemon.cvTriggerRatio')}</label>
                  <input
                    type="number" min={0} max={1} step={0.01}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.healthTriggerRatio}
                    onChange={(e) => patch({ healthTriggerRatio: Math.max(0, Math.min(1, numVal(e.target.value))) })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvHealth')} · {t('vibedaemon.cvRecoveryRatio')}</label>
                  <input
                    type="number" min={0} max={1} step={0.01}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.healthRecoveryRatio}
                    onChange={(e) => patch({ healthRecoveryRatio: Math.max(0, Math.min(1, numVal(e.target.value))) })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvStorm')} · {t('vibedaemon.cvTriggerRatio')}</label>
                  <input
                    type="number" min={0} max={1} step={0.005}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.stormTriggerRatio}
                    onChange={(e) => patch({ stormTriggerRatio: Math.max(0, Math.min(1, numVal(e.target.value))) })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvStorm')} · {t('vibedaemon.cvClearRatio')}</label>
                  <input
                    type="number" min={0} max={1} step={0.005}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.stormClearRatio}
                    onChange={(e) => patch({ stormClearRatio: Math.max(0, Math.min(1, numVal(e.target.value))) })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvConsecutive')}</label>
                  <input
                    type="number" min={1} max={10}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.consecutiveFrames}
                    onChange={(e) => patch({ consecutiveFrames: Math.max(1, Math.min(10, Math.round(numVal(e.target.value)))) })}
                  />
                </div>
              </div>

              <p className={styles.fieldLabel} style={{ marginTop: '0.75rem' }}>{t('vibedaemon.cvCooldowns')}</p>
              <div className={styles.configGrid}>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvShield')} (ms)</label>
                  <input
                    type="number" min={1000} step={1000}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.cooldowns.lowShieldMs}
                    onChange={(e) => patchCooldowns({ lowShieldMs: Math.max(1000, Math.round(numVal(e.target.value))) })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvHealth')} (ms)</label>
                  <input
                    type="number" min={1000} step={1000}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.cooldowns.lowHealthMs}
                    onChange={(e) => patchCooldowns({ lowHealthMs: Math.max(1000, Math.round(numVal(e.target.value))) })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel}>{t('vibedaemon.cvStorm')} (ms)</label>
                  <input
                    type="number" min={1000} step={1000}
                    className={`sf-input ${styles.fieldInput}`}
                    value={cfg.cooldowns.stormMs}
                    onChange={(e) => patchCooldowns({ stormMs: Math.max(1000, Math.round(numVal(e.target.value))) })}
                  />
                </div>
              </div>
              <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
                {t('vibedaemon.cvCalibrationHint')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
