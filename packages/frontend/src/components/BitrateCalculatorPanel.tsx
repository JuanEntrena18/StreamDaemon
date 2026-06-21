import { useState, useMemo } from 'react';
import { useTranslation } from '../i18n/context';
import styles from './BitrateCalculatorPanel.module.css';

interface Props {
  channel: string;
  backendUrl: string;
}

const PRESETS: Record<string, { w: number; h: number }> = {
  '1080p': { w: 1920, h: 1080 },
  '900p': { w: 1600, h: 900 },
  '720p': { w: 1280, h: 720 },
  '480p': { w: 854, h: 480 },
};

const FPS_OPTIONS = [60, 30, 24];
const AUDIO_OPTIONS = [320, 256, 160, 96];

interface Tier {
  label: string; res: string; w: number; h: number;
  fps: number; bpp: number; audio: number;
}

const TIERS: Tier[] = [
  { label: '1080p60', res: '1080p', w: 1920, h: 1080, fps: 60, bpp: 0.05, audio: 160 },
  { label: '1080p30', res: '1080p', w: 1920, h: 1080, fps: 30, bpp: 0.10, audio: 160 },
  { label: '900p60',  res: '900p',  w: 1600, h: 900,  fps: 60, bpp: 0.08, audio: 128 },
  { label: '720p60',  res: '720p',  w: 1280, h: 720,  fps: 60, bpp: 0.10, audio: 128 },
  { label: '720p30',  res: '720p',  w: 1280, h: 720,  fps: 30, bpp: 0.12, audio: 96  },
  { label: '480p30',  res: '480p',  w: 854,  h: 480,  fps: 30, bpp: 0.12, audio: 96  },
];

function getRecommendation(uploadMbps: number) {
  const maxBitrate = Math.min(uploadMbps * 1000 * 0.8, 6000);
  for (const t of TIERS) {
    const vb = Math.round((t.w * t.h * t.fps * t.bpp) / 1000);
    const tb = vb + t.audio;
    if (tb <= maxBitrate) return { ...t, videoBitrate: vb, totalBitrate: tb, maxBitrate: Math.round(maxBitrate) };
  }
  const last = TIERS[TIERS.length - 1];
  const vb = Math.round((last.w * last.h * last.fps * last.bpp) / 1000);
  const tb = Math.min(vb + last.audio, Math.round(maxBitrate));
  return { ...last, videoBitrate: vb, totalBitrate: tb, maxBitrate: Math.round(maxBitrate) };
}

function btnStyle(active: boolean, color: string): React.CSSProperties {
  return {
    borderColor: active ? color : 'var(--sf-border)',
    background: active ? `${color}22` : 'transparent',
    color: active ? color : 'var(--sf-text-2)',
    fontWeight: active ? 700 : 400,
  };
}

export function BitrateCalculatorPanel(_props: Props) {
  const { t } = useTranslation();

  const [uploadSpeed, setUploadSpeed] = useState('');
  const [speedEntered, setSpeedEntered] = useState(false);
  const [isRecommended, setIsRecommended] = useState(true);

  const [resolution, setResolution] = useState('1080p');
  const [customW, setCustomW] = useState(1280);
  const [customH, setCustomH] = useState(720);
  const [fps, setFps] = useState(60);
  const [bpp, setBpp] = useState(0.10);
  const [audioBitrate, setAudioBitrate] = useState(160);
  const [usagePct, setUsagePct] = useState(80);
  const [showObsGuide, setShowObsGuide] = useState(false);

  const isCustom = resolution === 'custom';
  const w = isCustom ? customW : PRESETS[resolution].w;
  const h = isCustom ? customH : PRESETS[resolution].h;

  const videoBitrate = Math.round((w * h * fps * bpp) / 1000);
  const totalBitrate = videoBitrate + audioBitrate;
  const neededUpload = ((totalBitrate / 1000) / (usagePct / 100));
  const exceedsTwitch = totalBitrate > 6000;

  const rec = useMemo(() => {
    if (!speedEntered || !uploadSpeed) return null;
    const v = parseFloat(uploadSpeed);
    if (isNaN(v) || v <= 0) return null;
    return getRecommendation(v);
  }, [speedEntered, uploadSpeed]);

  const handleCalculate = () => {
    const v = parseFloat(uploadSpeed);
    if (isNaN(v) || v <= 0) return;
    setSpeedEntered(true);
    const r = getRecommendation(v);
    setResolution(r.res);
    setFps(r.fps);
    setBpp(r.bpp);
    setAudioBitrate(r.audio);
    setIsRecommended(true);
  };

  const markManual = () => setIsRecommended(false);

  const label = (k: string) => {
    const v = t(`bitrate.${k}`);
    return v.startsWith('bitrate.') ? k : v;
  };

  const fmtLabel = (k: string) => label(k);

  const speedVal = speedEntered && uploadSpeed ? parseFloat(uploadSpeed) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={`sf-heading ${styles.heading}`}>
          {fmtLabel('title')}
        </h2>
        <p className="text-muted text-sm">
          {fmtLabel('subtitle')}
        </p>
      </div>

      {/* Internet speed */}
      <div className="glass-card sf-card--tight">
        <h3 className={styles.sectionTitle}>
          {fmtLabel('speedSection')}
        </h3>
        <p className={`text-xs text-muted mb-3`}>
          {fmtLabel('speedDesc')}
        </p>
        <div className={styles.speedRow}>
          <input type="number" step="0.1" min={0.5} max={1000}
            value={uploadSpeed}
            onChange={(e) => { setUploadSpeed(e.target.value); setSpeedEntered(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCalculate(); }}
            placeholder={fmtLabel('speedPlaceholder')}
            className="sf-input"
            style={{ width: 120 }} />
          <span className={styles.speedUnit}>Mbps</span>
          <button onClick={handleCalculate}
            disabled={!uploadSpeed || isNaN(parseFloat(uploadSpeed))}
            className={`sf-btn sf-btn-primary ${styles.calcBtn}`}>
            {fmtLabel('calculate')}
          </button>
          <a href="https://fast.com" target="_blank" rel="noopener noreferrer"
            className={styles.fastLink}>
            {fmtLabel('openFast')} ↗
          </a>
        </div>
        {rec && (
          <div className={styles.resultBanner} style={{
            background: 'rgba(16,185,129,0.08)', color: '#34d399',
            borderLeft: '3px solid #34d399',
          }}>
            {label('safeBitrateResult').replace('{bitrate}', rec.maxBitrate.toString())}
          </div>
        )}
      </div>

      {/* Recommendation */}
      {rec && (
        <div className={`glass-card sf-card--tight ${styles.recBorder}`}>
          <div className={styles.recHeader}>
            <div>
              <h3 className={styles.recTitle}>
                {fmtLabel('recommendationTitle')}
              </h3>
              <p className={styles.recDesc}>
                {fmtLabel('recommendationDesc')}
              </p>
            </div>
            {!isRecommended && (
              <button onClick={handleCalculate}
                className={`sf-btn ${styles.recApplyBtn}`}>
                {fmtLabel('applySettings')}
              </button>
            )}
          </div>
          <div className={styles.recGrid}>
            <MiniBox label={fmtLabel('resolution')} value={rec.label} color="#60a5fa" />
            <MiniBox label={fmtLabel('fps')} value={`${rec.fps} fps`} color="#34d399" />
            <MiniBox label={fmtLabel('videoBitrate')} value={`${rec.videoBitrate} kbps`} color="#a78bfa" />
            <MiniBox label={fmtLabel('totalBitrate')} value={`${rec.totalBitrate} kbps`} color="#fbbf24" />
            <MiniBox label={fmtLabel('audio')} value={`${rec.audio} kbps`} color="#fb923c" />
          </div>
        </div>
      )}

      {/* Calculator form */}
      <div className="glass-card sf-card">
        <div className={styles.formHeader}>
          <h3 className={styles.formTitle}>
            {fmtLabel('manualMode')}
          </h3>
          {rec && (
            <span className={styles.modeBadge} style={{
              background: isRecommended ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
              color: isRecommended ? '#34d399' : '#fbbf24',
            }}>
              {isRecommended ? fmtLabel('recommendedBadge') : fmtLabel('manualBadge')}
            </span>
          )}
        </div>

        {/* Resolution */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>
            {fmtLabel('resolution')}
          </div>
          <div className={styles.pillGroup}>
            {Object.keys(PRESETS).map((r) => (
              <button key={r} onClick={() => { setResolution(r); markManual(); }}
                className={styles.pillBtn}
                style={btnStyle(resolution === r, '#60a5fa')}>
                {r}
              </button>
            ))}
            <button onClick={() => { setResolution('custom'); markManual(); }}
              className={styles.pillBtn}
              style={btnStyle(isCustom, '#a78bfa')}>
              {fmtLabel('custom')}
            </button>
          </div>
          {isCustom && (
            <div className={styles.customInputRow}>
              <input type="number" value={customW} min={320} max={3840} step={2}
                onChange={(e) => { setCustomW(Number(e.target.value)); markManual(); }}
                className="sf-input" style={{ width: 100 }}
                placeholder={fmtLabel('width')} />
              <span className={styles.speedUnit} style={{ alignSelf: 'center' }}>×</span>
              <input type="number" value={customH} min={240} max={2160} step={2}
                onChange={(e) => { setCustomH(Number(e.target.value)); markManual(); }}
                className="sf-input" style={{ width: 100 }}
                placeholder={fmtLabel('height')} />
            </div>
          )}
          <div className={styles.resolutionHint}>
            {w} × {h}
          </div>
        </div>

        {/* FPS */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>
            {fmtLabel('fps')}
          </div>
          <div className={styles.pillGroup}>
            {FPS_OPTIONS.map((f) => (
              <button key={f} onClick={() => { setFps(f); markManual(); }}
                className={styles.pillBtn}
                style={btnStyle(fps === f, '#34d399')}>
                {f} fps
              </button>
            ))}
          </div>
        </div>

        {/* BPP */}
        <div className={styles.fieldGroup}>
          <div className={styles.sliderHeader}>
            <span className={styles.sliderLabel}>
              {fmtLabel('bpp')}
            </span>
            <span className={styles.sliderValue} style={{ color: '#60a5fa' }}>
              {bpp.toFixed(2)}
            </span>
          </div>
          <input type="range" min={0.01} max={0.15} step={0.01} value={bpp}
            onChange={(e) => { setBpp(Number(e.target.value)); markManual(); }}
            className={styles.slider} style={{ accentColor: '#7c3aed' }} />
          <div className={styles.sliderHint}>
            {fmtLabel('bppDesc')}
          </div>
        </div>

        {/* Audio bitrate */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>
            {fmtLabel('audio')}
          </div>
          <div className={styles.pillGroup}>
            {AUDIO_OPTIONS.map((a) => (
              <button key={a} onClick={() => { setAudioBitrate(a); markManual(); }}
                className={styles.pillBtn}
                style={btnStyle(audioBitrate === a, '#fbbf24')}>
                {a} kbps
              </button>
            ))}
          </div>
        </div>

        {/* Usage % */}
        <div>
          <div className={styles.sliderHeader}>
            <span className={styles.sliderLabel}>
              {fmtLabel('usage')}
            </span>
            <span className={styles.sliderValue} style={{ color: '#34d399' }}>
              {usagePct}%
            </span>
          </div>
          <input type="range" min={50} max={100} step={1} value={usagePct}
            onChange={(e) => setUsagePct(Number(e.target.value))}
            className={styles.slider} style={{ accentColor: '#7c3aed' }} />
          <div className={styles.sliderHint}>
            {fmtLabel('usageDesc')}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="glass-card sf-card">
        <div className={styles.resultsGrid}>
          <ResultBox label={fmtLabel('videoBitrate')} value={`${videoBitrate.toLocaleString()}`} unit="kbps" color="#60a5fa" />
          <ResultBox label={fmtLabel('totalBitrate')} value={`${totalBitrate.toLocaleString()}`} unit="kbps" color="#a78bfa" />
          <ResultBox label={fmtLabel('needed')} value={`${neededUpload.toFixed(1)}`} unit="mbps" color="#fbbf24" />
        </div>

        {exceedsTwitch && (
          <div className={styles.warningBox} style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
            {fmtLabel('warning')}
          </div>
        )}
        {!exceedsTwitch && videoBitrate > 0 && (
          <div className={styles.warningBox} style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
            {fmtLabel('recommendation')}
          </div>
        )}

        {speedEntered && speedVal > 0 && (
          <div className={styles.connectionBox} style={{
            background: neededUpload <= speedVal ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            color: neededUpload <= speedVal ? '#34d399' : '#f87171',
            borderLeft: `3px solid ${neededUpload <= speedVal ? '#34d399' : '#f87171'}`,
          }}>
            {neededUpload <= speedVal
              ? label('connectionOk').replace('{needed}', neededUpload.toFixed(1)).replace('{upload}', speedVal.toFixed(1))
              : label('connectionWarn').replace('{needed}', neededUpload.toFixed(1)).replace('{upload}', speedVal.toFixed(1))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="glass-card sf-card--tight">
        <div className={styles.aboutTitle}>
          {fmtLabel('aboutTitle')}
        </div>
        <div className={styles.aboutText}>
          {fmtLabel('aboutText')}
        </div>
      </div>

      {/* OBS Guide */}
      <div className="glass-card sf-card--tight">
        <button onClick={() => setShowObsGuide(!showObsGuide)}
          className={styles.obsToggleBtn}>
          <span>{fmtLabel('obsGuide')}</span>
          <span className={styles.obsToggleArrow} style={{ transform: showObsGuide ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </button>

        {showObsGuide && (
          <div className={styles.obsContent}>
            {rec && (
              <div className={styles.obsRecBanner}>
                {label('obsGuideForSpeed').replace('{speed}', speedVal.toFixed(1)).replace('{label}', rec.label)}
              </div>
            )}
            <p className="mb-3">{fmtLabel('obsGuideDesc')}</p>

            <div className={styles.obsSummaryBox}>
              <div className={styles.obsSummaryTitle}>
                {fmtLabel('obsGuideSummary')}
              </div>
              <SummaryRow label={fmtLabel('videoBitrate')} value={`${videoBitrate} kbps`} />
              <SummaryRow label={fmtLabel('audio')} value={`${audioBitrate} kbps`} />
              <SummaryRow label="Encoder" value="x264 / NVENC" />
              <SummaryRow label={fmtLabel('fps')} value={`${fps} fps`} />
              <SummaryRow label="Resolución" value={`${w} × ${h}`} />
              <SummaryRow label="Keyframe" value="2 s" />
            </div>

            <SectionTitle text={fmtLabel('obsGuideVideo')} />
            <p className="mb-3">{fmtLabel('obsGuideOutputStep')}</p>
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
              <li className="mb-2"><strong>{fmtLabel('obsGuideVideoBitrate')}</strong> <code className={styles.code}>{videoBitrate}</code> kbps</li>
              <li className="mb-2"><strong>{fmtLabel('obsGuideAudioBitrate')}</strong> <code className={styles.code}>{audioBitrate}</code> kbps</li>
              <li><strong>{fmtLabel('obsGuideEncoderItem')}</strong> <code className={styles.code}>x264</code> / <code className={styles.code}>NVENC H.264</code> / <code className={styles.code}>AMF</code></li>
            </ul>

            <SectionTitle text={fmtLabel('obsGuideAdvanced')} />
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
              <li className="mb-2"><strong>{fmtLabel('obsGuideKeyframeItem')}</strong> <code className={styles.code}>2</code> {fmtLabel('obsGuideKeyframeDesc')}</li>
              <li className="mb-2"><strong>{fmtLabel('obsGuidePreset')}</strong> <code className={styles.code}>veryfast</code> (x264) o <code className={styles.code}>P6: Slower</code> (NVENC) {fmtLabel('obsGuidePresetDesc')}</li>
              <li><strong>{fmtLabel('obsGuideProfile')}</strong> <code className={styles.code}>high</code></li>
            </ul>

            <SectionTitle text={fmtLabel('obsGuideAudio')} />
            <p className="mb-3">{fmtLabel('obsGuideAudioDesc')}</p>
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
              <li className="mb-2"><strong>{fmtLabel('obsGuideSampleRate')}</strong> <code className={styles.code}>48 kHz</code></li>
              <li className="mb-2"><strong>{fmtLabel('obsGuideAudioBitrateItem')}</strong> <code className={styles.code}>{audioBitrate}</code> kbps</li>
            </ul>

            <SectionTitle text={fmtLabel('obsGuideVideoTab')} />
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.5rem' }}>
              <li className="mb-2"><strong>{fmtLabel('obsGuideBaseRes')}</strong> {fmtLabel('obsGuideBaseResDesc')}</li>
              <li className="mb-2"><strong>{fmtLabel('obsGuideOutputRes')}</strong> <code className={styles.code}>{w} × {h}</code></li>
              <li className="mb-2"><strong>{fmtLabel('obsGuideFpsItem')}</strong> <code className={styles.code}>{fps}</code></li>
              <li><strong>{fmtLabel('obsGuideFilter')}</strong> <code className={styles.code}>Lanczos</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className={styles.resultBox}>
      <div className={styles.resultValue} style={{ color }}>{value}</div>
      <div className={styles.resultUnit}>{unit}</div>
      <div className={styles.resultLabel}>{label}</div>
    </div>
  );
}

function MiniBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={styles.miniBox}>
      <div className={styles.miniValue} style={{ color }}>{value}</div>
      <div className={styles.miniLabel}>{label}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div className={styles.sectionTitleSub}>{text}</div>
  );
}
