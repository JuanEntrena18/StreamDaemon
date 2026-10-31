import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useTranslation } from '../i18n/context.js';
import { useStreamAvatarConfig } from '../stream-avatar/store/streamAvatarStore.js';
import { LipSyncEngine } from '../stream-avatar/engine/LipSyncEngine.js';
import { createAvatarRenderer, type AvatarRenderer } from '../stream-avatar/renderer/index.js';
import { useStreamAvatarAssets } from '../stream-avatar/store/assetStore.js';
import { downloadAvatarTemplateZip } from '../stream-avatar/templateGenerator.js';
import type { StreamAvatarViseme } from '../stream-avatar/types.js';
import { Toggle } from './Toggle.js';
import { VoiceMeter } from '../stream-avatar/components/VoiceMeter.js';
import styles from './StreamAvatarPanel.module.css';

interface Props {
  channel: string;
}

interface BuiltinAvatarMeta {
  id: 'default' | 'cyber' | 'pixel' | 'future' | 'dark';
  tag: string;
  accent: string;
  nameKey: string;
  descKey: string;
}

const AVATARS: BuiltinAvatarMeta[] = [
  {
    id: 'default',
    tag: 'STUDIO',
    accent: '#38bdf8',
    nameKey: 'streamAvatar.streamAvatarDefault',
    descKey: 'streamAvatar.streamAvatarDefaultDesc',
  },
  {
    id: 'cyber',
    tag: 'NEON CYBORG',
    accent: '#00f0ff',
    nameKey: 'streamAvatar.streamAvatarCyber',
    descKey: 'streamAvatar.streamAvatarCyberDesc',
  },
  {
    id: 'pixel',
    tag: '8-BIT RETRO',
    accent: '#facc15',
    nameKey: 'streamAvatar.streamAvatarPixel',
    descKey: 'streamAvatar.streamAvatarPixelDesc',
  },
  {
    id: 'future',
    tag: 'MECHA SYNTH',
    accent: '#818cf8',
    nameKey: 'streamAvatar.streamAvatarFuture',
    descKey: 'streamAvatar.streamAvatarFutureDesc',
  },
  {
    id: 'dark',
    tag: 'GOTHIC LORD',
    accent: '#f43f5e',
    nameKey: 'streamAvatar.streamAvatarDark',
    descKey: 'streamAvatar.streamAvatarDarkDesc',
  },
];

interface RequiredFileCardMeta {
  file: string;
  badge: string;
  descKey: string;
  kind: 'body' | 'eyes-open' | 'eyes-closed' | 'mouth-closed' | 'mouth-slight' | 'mouth-open' | 'mouth-wide' | 'mouth-round';
}

const REQUIRED_FILES_GUIDE: RequiredFileCardMeta[] = [
  { file: 'body.png', badge: 'CAPA 1 · BASE', descKey: 'streamAvatar.fileBodyDesc', kind: 'body' },
  { file: 'eyes-open.png', badge: 'CAPA 3 · OJOS', descKey: 'streamAvatar.fileEyesOpenDesc', kind: 'eyes-open' },
  { file: 'eyes-closed.png', badge: 'CAPA 3 · BLINK', descKey: 'streamAvatar.fileEyesClosedDesc', kind: 'eyes-closed' },
  { file: 'mouth-closed.png', badge: 'M / B / P · SILENCIO', descKey: 'streamAvatar.fileMouthClosedDesc', kind: 'mouth-closed' },
  { file: 'mouth-slight.png', badge: 'VOLUMEN BAJO', descKey: 'streamAvatar.fileMouthSlightDesc', kind: 'mouth-slight' },
  { file: 'mouth-open.png', badge: 'VOCAL A · FUERTE', descKey: 'streamAvatar.fileMouthOpenDesc', kind: 'mouth-open' },
  { file: 'mouth-wide.png', badge: 'VOCALES E / I', descKey: 'streamAvatar.fileMouthWideDesc', kind: 'mouth-wide' },
  { file: 'mouth-round.png', badge: 'VOCALES O / U', descKey: 'streamAvatar.fileMouthRoundDesc', kind: 'mouth-round' },
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
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [demoVoice, setDemoVoice] = useState(false);
  const [liveVolume, setLiveVolume] = useState(0);
  const [liveViseme, setLiveViseme] = useState<StreamAvatarViseme>('closed');
  const [showTutorial, setShowTutorial] = useState(true);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;
  const overlayUrl = `${overlayBaseUrl}/overlay.html?mode=stream-avatar&channel=${encodeURIComponent(channel)}`;

  // List audio input devices
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then((devs) => setDevices(devs.filter((d) => d.kind === 'audioinput')))
      .catch((e) => console.error('[stream-avatar] enumerateDevices failed', e));
  }, []);

  // Initialize/re-create preview renderer when avatar changes
  useEffect(() => {
    if (!canvasRef.current || loading) return;

    try {
      rendererRef.current?.destroy();
    } catch {}

    const renderer = createAvatarRenderer(canvasRef.current, config);
    rendererRef.current = renderer;
    renderer.init().catch((e) => console.error('[stream-avatar] Preview init failed', e));

    return () => {
      try {
        rendererRef.current?.destroy();
      } catch {}
      rendererRef.current = null;
    };
  }, [loading, config.avatarId]);

  // Update preview when config changes (except avatarId which recreates)
  useEffect(() => {
    rendererRef.current?.updateConfig(config);
  }, [config]);

  // Demo voice simulation loop
  useEffect(() => {
    if (!demoVoice) {
      if (!config.enabled) {
        rendererRef.current?.setViseme('closed', 0);
        setLiveViseme('closed');
        setLiveVolume(0);
      }
      return;
    }

    const sequence: Array<{ viseme: StreamAvatarViseme; vol: number }> = [
      { viseme: 'slight', vol: 0.28 },
      { viseme: 'open', vol: 0.78 },
      { viseme: 'wide', vol: 0.64 },
      { viseme: 'round', vol: 0.72 },
      { viseme: 'open', vol: 0.85 },
      { viseme: 'slight', vol: 0.35 },
      { viseme: 'closed', vol: 0.04 },
    ];
    let step = 0;

    const timer = setInterval(() => {
      const item = sequence[step % sequence.length];
      rendererRef.current?.setViseme(item.viseme, item.vol);
      setLiveViseme(item.viseme);
      setLiveVolume(item.vol);
      step++;
    }, 220);

    return () => {
      clearInterval(timer);
    };
  }, [demoVoice, config.enabled]);

  // Start preview microphone lip-sync when enabled (and not overridden by demoVoice)
  useEffect(() => {
    if (demoVoice || !config.enabled || !rendererRef.current) {
      if (!demoVoice) {
        setLiveVolume(0);
        setLiveViseme('closed');
      }
      return;
    }

    const engine = new LipSyncEngine(config);
    engineRef.current = engine;

    const unsubscribe = engine.onFrame((state) => {
      rendererRef.current?.setViseme(state.viseme, state.volume);
      setLiveVolume(Math.min(state.volume * 2.5, 1));
      setLiveViseme(state.viseme);
    });

    engine.start(config.audioDeviceId).catch((e) => {
      console.error('[stream-avatar] Preview mic failed', e);
    });

    return () => {
      unsubscribe();
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, [
    demoVoice,
    config.enabled,
    config.avatarId,
    config.audioDeviceId,
    config.micSensitivity,
    config.smoothing,
    config.noiseGate,
  ]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadSuccess(false);
    const result = await uploadAsset(file);
    if (!result.ok) {
      setUploadError(result.error || 'Error al subir el avatar');
    } else {
      setUploadSuccess(true);
      if (result.assetId) {
        updateField('avatarId', result.assetId);
      }
      setTimeout(() => setUploadSuccess(false), 4000);
    }
    e.target.value = '';
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadAvatarTemplateZip();
    } catch (e) {
      console.error('[stream-avatar] Template download failed', e);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleResetLayout = () => {
    updateField('scale', 1);
    updateField('offsetX', 0);
    updateField('offsetY', 0);
    updateField('flipX', false);
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
    return <div className={styles.container}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.container}>
      {/* TOP BAR / HERO HEADER */}
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <h2 className={`sf-heading ${styles.heading}`}>
              🎭 {t('streamAvatar.title')}
            </h2>
            <span className={config.enabled ? styles.statusBadgeLive : styles.statusBadgeStandby}>
              <span className={styles.statusDot} />
              {config.enabled ? t('streamAvatar.statusActive') : t('streamAvatar.statusStandby')}
            </span>
          </div>
          <p className={styles.subtitle}>{t('streamAvatar.subtitle')}</p>
        </div>

        <div className={styles.masterSwitchCard}>
          <div>
            <div className={styles.toggleLabel}>{t('streamAvatar.enableLabel')}</div>
            <div className={styles.toggleDesc}>{t('streamAvatar.enableDesc')}</div>
          </div>
          <Toggle
            checked={config.enabled}
            onChange={() => updateField('enabled', !config.enabled)}
            size="md"
          />
        </div>
      </div>

      {/* SECTION 1: AVATAR ROSTER (5 BUILT-IN + CUSTOM ASSETS) */}
      <div className={`glass-card ${styles.card}`}>
        <div className={styles.sectionHeaderRow}>
          <div>
            <p className={styles.sectionTitle}>🎨 {t('streamAvatar.avatarTitle')}</p>
            <p className={styles.sectionDesc}>{t('streamAvatar.avatarSubtitle')}</p>
          </div>
        </div>

        <div className={styles.avatarGrid}>
          {AVATARS.map((a) => {
            const isActive = config.avatarId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={isActive ? styles.avatarCardActive : styles.avatarCard}
                style={{ '--avatar-accent': a.accent } as React.CSSProperties}
                onClick={() => updateField('avatarId', a.id)}
              >
                <div className={styles.avatarPortraitWrap}>
                  <AvatarPortraitSvg id={a.id} />
                </div>
                <div className={styles.avatarCardBody}>
                  <span className={styles.avatarTag}>{a.tag}</span>
                  <div className={styles.avatarName}>{t(a.nameKey)}</div>
                  <div className={styles.avatarDesc}>{t(a.descKey)}</div>
                </div>
              </button>
            );
          })}

          {assets.map((a) => {
            const isActive = config.avatarId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={isActive ? styles.avatarCardActive : styles.avatarCard}
                style={{ '--avatar-accent': '#10b981' } as React.CSSProperties}
                onClick={() => updateField('avatarId', a.id)}
              >
                <div className={styles.avatarPortraitWrap}>
                  <AvatarPortraitSvg id="custom" />
                </div>
                <div className={styles.avatarCardBody}>
                  <div className={styles.customHeaderRow}>
                    <span className={styles.avatarTagCustom}>{t('streamAvatar.customBadge')}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className={styles.deleteAssetBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteAsset(a.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          void deleteAsset(a.id);
                        }
                      }}
                      title={t('streamAvatar.deleteAsset')}
                    >
                      ✕
                    </span>
                  </div>
                  <div className={styles.avatarName}>{a.name}</div>
                  <div className={styles.avatarDesc}>8 PNG Layers · Lip-Sync</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: TWO-COLUMN WORKSPACE (AUDIO + PREVIEW + LAYOUT + OBS) */}
      <div className={styles.twoColumn}>
        <div className={styles.column}>
          {/* LIVE PREVIEW MONITOR */}
          <div className={`glass-card ${styles.card}`}>
            <div className={styles.cardHeaderInline}>
              <p className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                👁️ {t('streamAvatar.previewTitle')}
              </p>
              <button
                type="button"
                className={demoVoice ? styles.demoBtnActive : styles.demoBtn}
                onClick={() => setDemoVoice((v) => !v)}
              >
                {demoVoice ? t('streamAvatar.demoVoiceActive') : t('streamAvatar.demoVoiceBtn')}
              </button>
            </div>

            <div className={styles.previewWrap}>
              <canvas ref={canvasRef} className={styles.previewCanvas} />
              <div className={styles.previewHud}>
                <span className={styles.previewHudChip}>
                  {AVATARS.find((a) => a.id === config.avatarId)
                    ? t(AVATARS.find((a) => a.id === config.avatarId)!.nameKey)
                    : assets.find((a) => a.id === config.avatarId)?.name || config.avatarId}
                </span>
                <span className={styles.previewHudViseme}>
                  VISEMA: <strong>{liveViseme.toUpperCase()}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* POSITION & SCALE */}
          <div className={`glass-card ${styles.card}`}>
            <div className={styles.cardHeaderInline}>
              <p className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                ⚙️ {t('streamAvatar.layoutTitle')}
              </p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleResetLayout}
              >
                {t('streamAvatar.resetLayoutBtn')}
              </button>
            </div>

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
              <span className={styles.label} style={{ marginBottom: 0 }}>
                {t('streamAvatar.flipX')}
              </span>
              <Toggle
                checked={config.flipX}
                onChange={() => updateField('flipX', !config.flipX)}
                size="sm"
              />
            </div>
          </div>
        </div>

        <div className={styles.column}>
          {/* MICROPHONE & LIP-SYNC CALIBRATION */}
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
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || d.deviceId}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('streamAvatar.voiceDetector')}</label>
              <VoiceMeter
                deviceId={config.audioDeviceId}
                enabled={config.enabled || demoVoice}
                liveLevel={liveVolume}
                liveViseme={liveViseme}
              />
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

          {/* OBS BROWSER SOURCE URL & CHROMA KEY */}
          <div className={`glass-card ${styles.card}`}>
            <p className={styles.sectionTitle}>📺 {t('streamAvatar.obsTitle')}</p>
            <p className={styles.sectionDesc}>{t('streamAvatar.obsDesc')}</p>

            <div className={styles.toggleRow} style={{ marginBottom: '1rem' }}>
              <div>
                <span className={styles.label} style={{ marginBottom: 0 }}>
                  {t('streamAvatar.chromaKey')}
                </span>
                <div className={styles.toggleDesc}>{t('streamAvatar.chromaKeyDesc')}</div>
              </div>
              <Toggle
                checked={config.chromaKey}
                onChange={() => updateField('chromaKey', !config.chromaKey)}
                size="sm"
              />
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
              <button type="button" className="sf-btn-primary" onClick={copyUrl}>
                {copied ? t('streamAvatar.copied') : t('streamAvatar.copyUrl')}
              </button>
            </div>
          </div>

          {/* UPLOAD CUSTOM ZIP */}
          <div className={`glass-card ${styles.card}`}>
            <div className={styles.customUploadHeader}>
              <div>
                <p className={styles.sectionTitle} style={{ marginBottom: '0.35rem' }}>
                  📦 {t('streamAvatar.customAvatarTitle')}
                </p>
                <p className={styles.sectionDesc} style={{ marginBottom: 0 }}>
                  {t('streamAvatar.customAvatarDesc')}
                </p>
              </div>
            </div>

            <div className={styles.uploadActionsRow}>
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

              <button
                type="button"
                className={styles.templateBtn}
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
              >
                {downloadingTemplate
                  ? t('streamAvatar.downloadingTemplate')
                  : t('streamAvatar.downloadTemplateBtn')}
              </button>
            </div>

            {uploadError && <div className={styles.error}>{uploadError}</div>}
            {uploadSuccess && (
              <div className={styles.successBanner}>✓ {t('streamAvatar.uploadSuccess')}</div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: INTERACTIVE CUSTOM AVATAR DESIGN TUTORIAL & SPECIFICATION */}
      <div className={`glass-card ${styles.tutorialSection}`}>
        <div className={styles.tutorialHeader}>
          <div>
            <div className={styles.tutorialBadgeRow}>
              <span className={styles.specPill}>PNGTUBER SPEC v2.0</span>
              <span className={styles.specPillMuted}>8 ARCHIVOS PNG · 512×512 / 1024×1024 PX</span>
            </div>
            <h3 className={styles.tutorialHeading}>📐 {t('streamAvatar.tutorialTitle')}</h3>
            <p className={styles.tutorialSubtitle}>{t('streamAvatar.tutorialSubtitle')}</p>
          </div>
          <div className={styles.tutorialHeaderActions}>
            <button
              type="button"
              className={styles.templateBtn}
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
            >
              {downloadingTemplate
                ? t('streamAvatar.downloadingTemplate')
                : t('streamAvatar.downloadTemplateBtn')}
            </button>
            <button
              type="button"
              className={styles.collapseBtn}
              onClick={() => setShowTutorial((v) => !v)}
            >
              {showTutorial ? t('streamAvatar.tutorialToggleClose') : t('streamAvatar.tutorialToggleOpen')}
            </button>
          </div>
        </div>

        {showTutorial && (
          <div className={styles.tutorialBody}>
            {/* STEP 1 & STEP 2 SIDE BY SIDE */}
            <div className={styles.tutorialStepsGrid}>
              {/* STEP 1: CANVAS SPECS */}
              <div className={styles.tutorialStepCard}>
                <div className={styles.stepTitle}>{t('streamAvatar.step1Title')}</div>
                <p className={styles.stepDesc}>{t('streamAvatar.step1Desc')}</p>
                <div className={styles.canvasSpecDiagram}>
                  <div className={styles.canvasBlueprint}>
                    <span className={styles.blueprintCornerTL} />
                    <span className={styles.blueprintCornerTR} />
                    <span className={styles.blueprintCornerBL} />
                    <span className={styles.blueprintCornerBR} />
                    <div className={styles.blueprintInner}>
                      <span className={styles.blueprintDim}>512 × 512 px</span>
                      <span className={styles.blueprintSub}>PNG-32 Transparente (Alfa)</span>
                    </div>
                  </div>
                  <ul className={styles.specCheckList}>
                    <li>✓ Todos los PNG con el <strong>mismo tamaño de lienzo</strong> (ej. 512×512 px).</li>
                    <li>✓ <strong>No recortes</strong> el área transparente alrededor de los ojos o la boca.</li>
                    <li>✓ Comprime los 8 archivos directamente en un archivo <code>.zip</code>.</li>
                  </ul>
                </div>
              </div>

              {/* STEP 2: LAYER STACKING ORDER */}
              <div className={styles.tutorialStepCard}>
                <div className={styles.stepTitle}>{t('streamAvatar.step2Title')}</div>
                <p className={styles.stepDesc}>{t('streamAvatar.step2Desc')}</p>
                <div className={styles.layerStackList}>
                  <div className={styles.layerStackItem} style={{ '--layer-color': '#38bdf8' } as React.CSSProperties}>
                    <span className={styles.layerBadge}>Z: 3</span>
                    <div>
                      <div className={styles.layerItemTitle}>{t('streamAvatar.layer3Name')}</div>
                      <div className={styles.layerItemDesc}>{t('streamAvatar.layer3Desc')}</div>
                    </div>
                  </div>
                  <div className={styles.layerStackItem} style={{ '--layer-color': '#a855f7' } as React.CSSProperties}>
                    <span className={styles.layerBadge}>Z: 2</span>
                    <div>
                      <div className={styles.layerItemTitle}>{t('streamAvatar.layer2Name')}</div>
                      <div className={styles.layerItemDesc}>{t('streamAvatar.layer2Desc')}</div>
                    </div>
                  </div>
                  <div className={styles.layerStackItem} style={{ '--layer-color': '#10b981' } as React.CSSProperties}>
                    <span className={styles.layerBadge}>Z: 1</span>
                    <div>
                      <div className={styles.layerItemTitle}>{t('streamAvatar.layer1Name')}</div>
                      <div className={styles.layerItemDesc}>{t('streamAvatar.layer1Desc')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: THE 8 REQUIRED PNG FILES */}
            <div className={styles.step3Block}>
              <div className={styles.stepTitle}>{t('streamAvatar.step3Title')}</div>
              <p className={styles.stepDesc}>{t('streamAvatar.step3Desc')}</p>

              <div className={styles.requiredFilesGrid}>
                {REQUIRED_FILES_GUIDE.map((item) => (
                  <div key={item.file} className={styles.requiredFileCard}>
                    <div className={styles.requiredFilePreview}>
                      <TutorialLayerSvg kind={item.kind} />
                    </div>
                    <div className={styles.requiredFileMeta}>
                      <span className={styles.requiredFileBadge}>{item.badge}</span>
                      <code className={styles.requiredFileName}>{item.file}</code>
                      <p className={styles.requiredFileDesc}>{t(item.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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

function AvatarPortraitSvg({ id }: { id: BuiltinAvatarMeta['id'] | 'custom' }): ReactNode {
  if (id === 'default') {
    return (
      <svg viewBox="0 0 80 80" className={styles.portraitSvg}>
        <rect x="18" y="54" width="44" height="22" rx="10" fill="#4f46e5" />
        <path d="M14 40 A26 24 0 0 1 66 40" fill="none" stroke="#1e293b" strokeWidth="6" />
        <rect x="10" y="34" width="8" height="16" rx="4" fill="#38bdf8" />
        <rect x="62" y="34" width="8" height="16" rx="4" fill="#38bdf8" />
        <rect x="20" y="22" width="40" height="34" rx="16" fill="#ffdfc4" />
        <path d="M20 32 Q24 14 40 16 Q58 14 60 32 Q48 24 40 26 Q30 24 20 32 Z" fill="#312e81" />
        <circle cx="32" cy="38" r="3.5" fill="#1e1b4b" />
        <circle cx="48" cy="38" r="3.5" fill="#1e1b4b" />
        <path d="M35 47 Q40 52 45 47" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'cyber') {
    return (
      <svg viewBox="0 0 80 80" className={styles.portraitSvg}>
        <polygon points="16,74 24,52 56,52 64,74" fill="#090d16" stroke="#ff003c" strokeWidth="2" />
        <polygon points="22,24 58,24 62,42 50,56 30,56 18,42" fill="#161f33" stroke="#00f0ff" strokeWidth="2" />
        <path d="M22 24 L30 12 L42 18 L52 10 L58 24 Z" fill="#ff003c" />
        <rect x="22" y="33" width="36" height="9" rx="3" fill="#00f0ff" />
        <line x1="31" y1="48" x2="31" y2="52" stroke="#00f0ff" strokeWidth="2.5" />
        <line x1="37" y1="46" x2="37" y2="53" stroke="#ff003c" strokeWidth="2.5" />
        <line x1="43" y1="46" x2="43" y2="53" stroke="#ff003c" strokeWidth="2.5" />
        <line x1="49" y1="48" x2="49" y2="52" stroke="#00f0ff" strokeWidth="2.5" />
      </svg>
    );
  }
  if (id === 'pixel') {
    return (
      <svg viewBox="0 0 80 80" className={styles.portraitSvg} shapeRendering="crispEdges">
        <rect x="20" y="54" width="40" height="20" fill="#2563eb" />
        <rect x="24" y="16" width="32" height="10" fill="#dc2626" />
        <rect x="20" y="24" width="44" height="4" fill="#facc15" />
        <rect x="22" y="28" width="36" height="26" fill="#ffcca8" />
        <rect x="28" y="35" width="6" height="6" fill="#1e293b" />
        <rect x="46" y="35" width="6" height="6" fill="#1e293b" />
        <rect x="34" y="45" width="12" height="5" fill="#991b1b" />
      </svg>
    );
  }
  if (id === 'future') {
    return (
      <svg viewBox="0 0 80 80" className={styles.portraitSvg}>
        <rect x="18" y="54" width="44" height="20" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
        <circle cx="40" cy="64" r="5" fill="#38bdf8" />
        <line x1="12" y1="22" x2="12" y2="42" stroke="#38bdf8" strokeWidth="3" />
        <line x1="68" y1="22" x2="68" y2="42" stroke="#38bdf8" strokeWidth="3" />
        <rect x="20" y="20" width="40" height="34" rx="10" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
        <rect x="25" y="28" width="30" height="18" rx="5" fill="#090d16" />
        <ellipse cx="33" cy="35" rx="4" ry="3" fill="#38bdf8" />
        <ellipse cx="47" cy="35" rx="4" ry="3" fill="#38bdf8" />
        <rect x="31" y="42" width="18" height="2.5" fill="#818cf8" />
      </svg>
    );
  }
  if (id === 'dark') {
    return (
      <svg viewBox="0 0 80 80" className={styles.portraitSvg}>
        <polygon points="12,74 20,42 60,42 68,74" fill="#181024" stroke="#9f1239" strokeWidth="2" />
        <polygon points="12,34 22,30 22,42" fill="#e2d9f3" />
        <polygon points="68,34 58,30 58,42" fill="#e2d9f3" />
        <rect x="22" y="20" width="36" height="34" rx="16" fill="#e2d9f3" />
        <path d="M22 28 Q40 12 58 28 L40 30 Z" fill="#090514" />
        <circle cx="32" cy="36" r="3.5" fill="#f43f5e" />
        <circle cx="48" cy="36" r="3.5" fill="#f43f5e" />
        <path d="M33 46 L47 46" stroke="#4c0519" strokeWidth="2.5" />
        <polygon points="35,46 37,51 39,46" fill="#ffffff" />
        <polygon points="41,46 43,51 45,46" fill="#ffffff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className={styles.portraitSvg}>
      <rect x="14" y="14" width="52" height="52" rx="12" fill="rgba(16, 185, 129, 0.14)" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="40" cy="36" r="12" fill="#10b981" opacity="0.85" />
      <path d="M24 58 Q40 46 56 58" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function TutorialLayerSvg({ kind }: { kind: RequiredFileCardMeta['kind'] }): ReactNode {
  return (
    <svg viewBox="0 0 120 90" className={styles.tutorialSvg}>
      {/* Face guide silhouette in faint dashed line so the user sees relative placement */}
      <rect
        x="30"
        y="12"
        width="60"
        height="58"
        rx="26"
        fill={kind === 'body' ? '#f8d8be' : 'none'}
        stroke={kind === 'body' ? '#818cf8' : 'rgba(148, 163, 184, 0.28)'}
        strokeWidth="2"
        strokeDasharray={kind === 'body' ? undefined : '3 3'}
      />
      {kind === 'body' && (
        <>
          <path d="M26 84 Q30 66 60 66 Q90 66 94 84" fill="#312e81" stroke="#6366f1" strokeWidth="2" />
          <path d="M30 32 Q34 10 60 12 Q86 10 90 32 Q74 22 60 25 Q46 22 30 32 Z" fill="#312e81" />
        </>
      )}
      {kind === 'eyes-open' && (
        <>
          <path d="M40 31 Q47 28 53 31 M67 31 Q73 28 80 31" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="47" cy="40" rx="6.5" ry="6" fill="#ffffff" stroke="#1e1b4b" strokeWidth="1.5" />
          <ellipse cx="73" cy="40" rx="6.5" ry="6" fill="#ffffff" stroke="#1e1b4b" strokeWidth="1.5" />
          <circle cx="47" cy="40" r="3.5" fill="#6366f1" />
          <circle cx="73" cy="40" r="3.5" fill="#6366f1" />
        </>
      )}
      {kind === 'eyes-closed' && (
        <>
          <path d="M40 40 Q47 45 54 40" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <path d="M66 40 Q73 45 80 40" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {kind === 'mouth-closed' && (
        <path d="M50 55 Q60 58 70 55" fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
      )}
      {kind === 'mouth-slight' && (
        <rect x="50" y="52" width="20" height="6" rx="3" fill="#881337" stroke="#fb7185" strokeWidth="2" />
      )}
      {kind === 'mouth-open' && (
        <>
          <ellipse cx="60" cy="55" rx="11" ry="9" fill="#881337" stroke="#fb7185" strokeWidth="2" />
          <ellipse cx="60" cy="59" rx="6" ry="3.5" fill="#fb7185" />
        </>
      )}
      {kind === 'mouth-wide' && (
        <>
          <rect x="45" y="50" width="30" height="11" rx="5.5" fill="#881337" stroke="#fb7185" strokeWidth="2" />
          <line x1="49" y1="53" x2="71" y2="53" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      {kind === 'mouth-round' && (
        <>
          <ellipse cx="60" cy="55" rx="7.5" ry="9.5" fill="#881337" stroke="#fb7185" strokeWidth="2" />
          <ellipse cx="60" cy="58" rx="4" ry="3" fill="#fb7185" />
        </>
      )}
    </svg>
  );
}
