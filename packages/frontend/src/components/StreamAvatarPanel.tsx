import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from '../i18n/context.js';
import { useStreamAvatarConfig } from '../stream-avatar/store/streamAvatarStore.js';
import { LipSyncEngine } from '../stream-avatar/engine/LipSyncEngine.js';
import { createAvatarRenderer, type AvatarRenderer } from '../stream-avatar/renderer/index.js';
import { useStreamAvatarAssets } from '../stream-avatar/store/assetStore.js';
import { Toggle } from './Toggle.js';
import { VoiceMeter } from '../stream-avatar/components/VoiceMeter.js';
import styles from './StreamAvatarPanel.module.css';

interface Props {
  channel: string;
}

const AVATARS = [
  { id: 'default', name: 'avatars.streamAvatarDefault', desc: 'avatars.streamAvatarDefaultDesc', icon: '🎭' },
  { id: 'cyber', name: 'avatars.streamAvatarCyber', desc: 'avatars.streamAvatarCyberDesc', icon: '🌆' },
  { id: 'pixel', name: 'avatars.streamAvatarPixel', desc: 'avatars.streamAvatarPixelDesc', icon: '🕹️' },
  { id: 'future', name: 'avatars.streamAvatarFuture', desc: 'avatars.streamAvatarFutureDesc', icon: '🤖' },
  { id: 'dark', name: 'avatars.streamAvatarDark', desc: 'avatars.streamAvatarDarkDesc', icon: '🧛' },
];

export function StreamAvatarPanel({ channel }: Props) {
  const { t } = useTranslation();
  const { config, updateField, loading } = useStreamAvatarConfig();
  const { assets, uploading, uploadAsset, deleteAsset } = useStreamAvatarAssets();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);
  const engineRef = useRef<LipSyncEngine | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;
  const overlayUrl = `${overlayBaseUrl}/overlay.html?mode=stream-avatar&channel=${encodeURIComponent(channel)}`;

  // List audio input devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then((devs) => setDevices(devs.filter((d) => d.kind === 'audioinput')))
      .catch((e) => console.error('[stream-avatar] enumerateDevices failed', e));
  }, []);

  // Initialize/re-create preview renderer when avatar changes
  useEffect(() => {
    if (!canvasRef.current || loading) return;

    rendererRef.current?.destroy();
    const renderer = createAvatarRenderer(canvasRef.current, config);
    rendererRef.current = renderer;
    renderer.init().catch((e) => console.error('[stream-avatar] Preview init failed', e));

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [loading, config.avatarId]);

  // Update preview when config changes (except avatarId which recreates)
  useEffect(() => {
    rendererRef.current?.updateConfig(config);
  }, [config]);

  // Start preview lip-sync
  useEffect(() => {
    if (!config.enabled || !rendererRef.current) return;

    const engine = new LipSyncEngine(config);
    engineRef.current = engine;

    const unsubscribe = engine.onFrame((state) => {
      rendererRef.current?.setViseme(state.viseme, state.volume);
    });

    engine.start(config.audioDeviceId).catch((e) => {
      console.error('[stream-avatar] Preview mic failed', e);
    });

    return () => {
      unsubscribe();
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, [config.enabled, config.audioDeviceId, config.micSensitivity, config.smoothing, config.noiseGate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const result = await uploadAsset(file);
    if (!result.ok) {
      setUploadError(result.error || 'Error al subir el avatar');
    }
    e.target.value = '';
  };

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = overlayUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [overlayUrl]);

  if (loading) {
    return <div className={styles.container}>{t('app.loading')}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={`sf-heading ${styles.heading}`}>
          🎭 {t('streamAvatar.title')}
          <span className={styles.betaBadge}>🧪 BETA</span>
        </h2>
        <p className={styles.subtitle}>{t('streamAvatar.subtitle')}</p>
      </div>

      <div className={`glass-card ${styles.card}`}>
        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>{t('streamAvatar.enableLabel')}</div>
            <div className={styles.toggleDesc}>{t('streamAvatar.enableDesc')}</div>
          </div>
          <Toggle checked={config.enabled} onChange={() => updateField('enabled', !config.enabled)} size="md" />
        </div>
      </div>

      <div className={styles.twoColumn}>
        <div className={styles.column}>
          <div className={`glass-card ${styles.card}`}>
            <p className={styles.sectionTitle}>🎙️ {t('streamAvatar.audioTitle')}</p>

            <div className={styles.field}>
              <label className={styles.label}>{t('streamAvatar.micDevice')}</label>
              <select
                className="sf-select"
                value={config.audioDeviceId}
                onChange={(e) => updateField('audioDeviceId', e.target.value)}
              >
                <option value="default">{t('streamAvatar.micDefault')}</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('streamAvatar.voiceDetector')}</label>
              <VoiceMeter deviceId={config.audioDeviceId} enabled={config.enabled} />
            </div>

            <SliderField
              label={t('streamAvatar.micSensitivity')}
              value={config.micSensitivity}
              min={0.5}
              max={3}
              step={0.1}
              onChange={(v) => updateField('micSensitivity', v)}
            />

            <SliderField
              label={t('streamAvatar.smoothing')}
              value={config.smoothing}
              min={0}
              max={0.95}
              step={0.05}
              onChange={(v) => updateField('smoothing', v)}
            />

            <SliderField
              label={t('streamAvatar.noiseGate')}
              value={config.noiseGate}
              min={0}
              max={0.2}
              step={0.01}
              onChange={(v) => updateField('noiseGate', v)}
            />
          </div>

          <div className={`glass-card ${styles.card}`}>
            <p className={styles.sectionTitle}>🎨 {t('streamAvatar.avatarTitle')}</p>
            <div className={styles.avatarGrid}>
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  className={config.avatarId === a.id ? styles.avatarCardActive : styles.avatarCard}
                  onClick={() => updateField('avatarId', a.id)}
                >
                  <span className={styles.avatarIcon}>{a.icon}</span>
                  <div>
                    <div className={styles.avatarName}>{t(a.name)}</div>
                    <div className={styles.avatarDesc}>{t(a.desc)}</div>
                  </div>
                </button>
              ))}
              {assets.map((a) => (
                <button
                  key={a.id}
                  className={config.avatarId === a.id ? styles.avatarCardActive : styles.avatarCard}
                  onClick={() => updateField('avatarId', a.id)}
                >
                  <span className={styles.avatarIcon}>📦</span>
                  <div className={styles.assetInfo}>
                    <div className={styles.avatarName}>{a.name}</div>
                    <button
                      className={styles.deleteAssetBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteAsset(a.id);
                      }}
                      title={t('streamAvatar.deleteAsset')}
                    >
                      ✕
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`glass-card ${styles.card}`}>
            <p className={styles.sectionTitle}>📦 {t('streamAvatar.customAvatarTitle')}</p>
            <p className={styles.sectionDesc}>{t('streamAvatar.customAvatarDesc')}</p>
            <label className={styles.fileInputLabel}>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                disabled={uploading}
                className={styles.fileInput}
              />
              <span className="sf-btn-primary">
                {uploading ? t('streamAvatar.uploading') : t('streamAvatar.uploadAvatar')}
              </span>
            </label>
            {uploadError && <div className={styles.error}>{uploadError}</div>}
          </div>
        </div>

        <div className={styles.column}>
          <div className={`glass-card ${styles.card}`}>
            <p className={styles.sectionTitle}>👁️ {t('streamAvatar.previewTitle')}</p>
            <div className={styles.previewWrap}>
              <canvas ref={canvasRef} className={styles.previewCanvas} />
            </div>
          </div>

          <div className={`glass-card ${styles.card}`}>
            <p className={styles.sectionTitle}>⚙️ {t('streamAvatar.layoutTitle')}</p>

            <SliderField
              label={t('streamAvatar.scale')}
              value={config.scale}
              min={0.25}
              max={2}
              step={0.05}
              onChange={(v) => updateField('scale', v)}
            />

            <SliderField
              label={t('streamAvatar.offsetX')}
              value={config.offsetX}
              min={-0.5}
              max={0.5}
              step={0.02}
              onChange={(v) => updateField('offsetX', v)}
            />

            <SliderField
              label={t('streamAvatar.offsetY')}
              value={config.offsetY}
              min={-0.5}
              max={0.5}
              step={0.02}
              onChange={(v) => updateField('offsetY', v)}
            />

            <div className={styles.toggleRow} style={{ marginTop: '0.75rem' }}>
              <span className={styles.label}>{t('streamAvatar.flipX')}</span>
              <Toggle checked={config.flipX} onChange={() => updateField('flipX', !config.flipX)} size="sm" />
            </div>
          </div>

          <div className={`glass-card ${styles.card}`}>
            <p className={styles.sectionTitle}>📺 {t('streamAvatar.obsTitle')}</p>
            <p className={styles.sectionDesc}>{t('streamAvatar.obsDesc')}</p>

            <div className={styles.toggleRow} style={{ marginBottom: '1rem' }}>
              <div>
                <span className={styles.label}>{t('streamAvatar.chromaKey')}</span>
                <div className={styles.toggleDesc}>{t('streamAvatar.chromaKeyDesc')}</div>
              </div>
              <Toggle checked={config.chromaKey} onChange={() => updateField('chromaKey', !config.chromaKey)} size="sm" />
            </div>

            {config.chromaKey && (
              <div className={styles.field}>
                <label className={styles.label}>{t('streamAvatar.chromaKeyColor')}</label>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    value={config.chromaKeyColor}
                    onChange={(e) => updateField('chromaKeyColor', e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={config.chromaKeyColor}
                    onChange={(e) => updateField('chromaKeyColor', e.target.value)}
                    className="sf-input"
                  />
                </div>
              </div>
            )}

            <div className={styles.urlRow}>
              <input type="text" readOnly value={overlayUrl} className={styles.urlInput} />
              <button className="sf-btn-primary" onClick={copyUrl}>
                {copied ? t('streamAvatar.copied') : t('streamAvatar.copyUrl')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.sliderHeader}>
        <label className={styles.label}>{label}</label>
        <span className={styles.sliderValue}>{value.toFixed(step < 0.05 ? 2 : 1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.slider}
      />
    </div>
  );
}
