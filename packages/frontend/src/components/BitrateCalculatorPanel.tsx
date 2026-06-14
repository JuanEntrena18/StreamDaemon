import { useState, useMemo } from 'react';
import { useTranslation } from '../i18n/context';

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

function btnStyle(active: boolean, color: string, disabled?: boolean): React.CSSProperties {
  return {
    padding: '0.35rem 0.75rem', borderRadius: 6, border: '1px solid',
    fontSize: '0.82rem', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 700 : 400, opacity: disabled ? 0.5 : 1,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : 'var(--sf-text-2)',
    borderColor: active ? color : 'var(--sf-border)',
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
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--sf-text)' }}>
          {fmtLabel('title')}
        </h2>
        <p style={{ color: 'var(--sf-text-2)', fontSize: '0.875rem' }}>
          {fmtLabel('subtitle')}
        </p>
      </div>

      {/* Internet speed */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--sf-text)' }}>
          {fmtLabel('speedSection')}
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--sf-text-2)', marginBottom: '0.75rem' }}>
          {fmtLabel('speedDesc')}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="number" step="0.1" min={0.5} max={1000}
            value={uploadSpeed}
            onChange={(e) => { setUploadSpeed(e.target.value); setSpeedEntered(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCalculate(); }}
            placeholder={fmtLabel('speedPlaceholder')}
            className="sf-input"
            style={{ width: 120 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--sf-text-3)' }}>Mbps</span>
          <button onClick={handleCalculate}
            disabled={!uploadSpeed || isNaN(parseFloat(uploadSpeed))}
            className="sf-btn sf-btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}>
            {fmtLabel('calculate')}
          </button>
          <a href="https://fast.com" target="_blank" rel="noopener noreferrer"
            style={{
              fontSize: '0.78rem', color: '#60a5fa', textDecoration: 'none',
              padding: '0.35rem 0.75rem', borderRadius: 6,
              border: '1px solid rgba(96,165,250,0.3)',
            }}>
            {fmtLabel('openFast')} ↗
          </a>
        </div>
        {rec && (
          <div style={{
            marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6,
            fontSize: '0.78rem',
            background: 'rgba(16,185,129,0.08)', color: '#34d399',
            borderLeft: '3px solid #34d399',
          }}>
            {label('safeBitrateResult').replace('{bitrate}', rec.maxBitrate.toString())}
          </div>
        )}
      </div>

      {/* Recommendation */}
      {rec && (
        <div className="glass-card" style={{
          padding: '1.25rem', marginBottom: '1rem',
          border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.2rem', color: '#34d399' }}>
                {fmtLabel('recommendationTitle')}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--sf-text-3)', marginBottom: '0' }}>
                {fmtLabel('recommendationDesc')}
              </p>
            </div>
            {!isRecommended && (
              <button onClick={handleCalculate}
                className="sf-btn"
                style={{
                  fontSize: '0.78rem', padding: '0.35rem 0.75rem',
                  background: 'rgba(16,185,129,0.1)', color: '#34d399',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}>
                {fmtLabel('applySettings')}
              </button>
            )}
          </div>
          <div style={{
            marginTop: '0.75rem', display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem',
          }}>
            <MiniBox label={fmtLabel('resolution')} value={rec.label} color="#60a5fa" />
            <MiniBox label={fmtLabel('fps')} value={`${rec.fps} fps`} color="#34d399" />
            <MiniBox label={fmtLabel('videoBitrate')} value={`${rec.videoBitrate} kbps`} color="#a78bfa" />
            <MiniBox label={fmtLabel('totalBitrate')} value={`${rec.totalBitrate} kbps`} color="#fbbf24" />
            <MiniBox label={fmtLabel('audio')} value={`${rec.audio} kbps`} color="#fb923c" />
          </div>
        </div>
      )}

      {/* Calculator form */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sf-text)', margin: 0 }}>
            {fmtLabel('manualMode')}
          </h3>
          {rec && (
            <span style={{
              fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: 4,
              textTransform: 'uppercase', fontWeight: 700,
              background: isRecommended ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
              color: isRecommended ? '#34d399' : '#fbbf24',
            }}>
              {isRecommended ? fmtLabel('recommendedBadge') : fmtLabel('manualBadge')}
            </span>
          )}
        </div>

        {/* Resolution */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.5rem' }}>
            {fmtLabel('resolution')}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {Object.keys(PRESETS).map((r) => (
              <button key={r} onClick={() => { setResolution(r); markManual(); }}
                style={btnStyle(resolution === r, '#60a5fa')}>
                {r}
              </button>
            ))}
            <button onClick={() => { setResolution('custom'); markManual(); }}
              style={btnStyle(isCustom, '#a78bfa')}>
              {fmtLabel('custom')}
            </button>
          </div>
          {isCustom && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="number" value={customW} min={320} max={3840} step={2}
                onChange={(e) => { setCustomW(Number(e.target.value)); markManual(); }}
                className="sf-input" style={{ width: 100 }}
                placeholder={fmtLabel('width')} />
              <span style={{ color: 'var(--sf-text-3)', alignSelf: 'center' }}>×</span>
              <input type="number" value={customH} min={240} max={2160} step={2}
                onChange={(e) => { setCustomH(Number(e.target.value)); markManual(); }}
                className="sf-input" style={{ width: 100 }}
                placeholder={fmtLabel('height')} />
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)', marginTop: '0.3rem' }}>
            {w} × {h}
          </div>
        </div>

        {/* FPS */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.5rem' }}>
            {fmtLabel('fps')}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {FPS_OPTIONS.map((f) => (
              <button key={f} onClick={() => { setFps(f); markManual(); }}
                style={btnStyle(fps === f, '#34d399')}>
                {f} fps
              </button>
            ))}
          </div>
        </div>

        {/* BPP */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)' }}>
              {fmtLabel('bpp')}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa' }}>
              {bpp.toFixed(2)}
            </span>
          </div>
          <input type="range" min={0.01} max={0.15} step={0.01} value={bpp}
            onChange={(e) => { setBpp(Number(e.target.value)); markManual(); }}
            style={{ width: '100%', accentColor: '#7c3aed' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)' }}>
            {fmtLabel('bppDesc')}
          </div>
        </div>

        {/* Audio bitrate */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.5rem' }}>
            {fmtLabel('audio')}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {AUDIO_OPTIONS.map((a) => (
              <button key={a} onClick={() => { setAudioBitrate(a); markManual(); }}
                style={btnStyle(audioBitrate === a, '#fbbf24')}>
                {a} kbps
              </button>
            ))}
          </div>
        </div>

        {/* Usage % */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)' }}>
              {fmtLabel('usage')}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
              {usagePct}%
            </span>
          </div>
          <input type="range" min={50} max={100} step={1} value={usagePct}
            onChange={(e) => setUsagePct(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#7c3aed' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--sf-text-3)' }}>
            {fmtLabel('usageDesc')}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <ResultBox label={fmtLabel('videoBitrate')} value={`${videoBitrate.toLocaleString()}`} unit="kbps" color="#60a5fa" />
          <ResultBox label={fmtLabel('totalBitrate')} value={`${totalBitrate.toLocaleString()}`} unit="kbps" color="#a78bfa" />
          <ResultBox label={fmtLabel('needed')} value={`${neededUpload.toFixed(1)}`} unit="mbps" color="#fbbf24" />
        </div>

        {exceedsTwitch && (
          <div style={{
            marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6,
            fontSize: '0.78rem', background: 'rgba(239,68,68,0.1)', color: '#f87171',
          }}>
            {fmtLabel('warning')}
          </div>
        )}
        {!exceedsTwitch && videoBitrate > 0 && (
          <div style={{
            marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6,
            fontSize: '0.78rem', background: 'rgba(16,185,129,0.1)', color: '#34d399',
          }}>
            {fmtLabel('recommendation')}
          </div>
        )}

        {speedEntered && speedVal > 0 && (
          <div style={{
            marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6,
            fontSize: '0.78rem',
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
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--sf-text)' }}>
          {fmtLabel('aboutTitle')}
        </div>
        <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--sf-text-2)' }}>
          {fmtLabel('aboutText')}
        </div>
      </div>

      {/* OBS Guide */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <button onClick={() => setShowObsGuide(!showObsGuide)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            color: 'var(--sf-text)', fontSize: '0.82rem', fontWeight: 600, padding: 0,
          }}>
          <span>{fmtLabel('obsGuide')}</span>
          <span style={{ fontSize: '0.9rem', transition: 'transform 0.2s', transform: showObsGuide ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </button>

        {showObsGuide && (
          <div style={{ marginTop: '1rem', fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--sf-text-2)' }}>
            {rec && (
              <div style={{
                padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem',
                background: 'rgba(16,185,129,0.08)', color: '#34d399',
                borderLeft: '3px solid #34d399', fontSize: '0.75rem',
              }}>
                {label('obsGuideForSpeed').replace('{speed}', speedVal.toFixed(1)).replace('{label}', rec.label)}
              </div>
            )}
            <p style={{ marginBottom: '0.75rem' }}>{fmtLabel('obsGuideDesc')}</p>

            <div style={{
              padding: '0.75rem', borderRadius: 6, marginBottom: '1rem',
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)',
              fontFamily: 'monospace', fontSize: '0.82rem',
            }}>
              <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: '0.4rem', fontFamily: 'Inter, sans-serif' }}>
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
            <p>{fmtLabel('obsGuideOutputStep')}</p>
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuideVideoBitrate')}</strong> <code style={codeStyle}>{videoBitrate}</code> kbps</li>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuideAudioBitrate')}</strong> <code style={codeStyle}>{audioBitrate}</code> kbps</li>
              <li><strong>{fmtLabel('obsGuideEncoderItem')}</strong> <code style={codeStyle}>x264</code> / <code style={codeStyle}>NVENC H.264</code> / <code style={codeStyle}>AMF</code></li>
            </ul>

            <SectionTitle text={fmtLabel('obsGuideAdvanced')} />
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuideKeyframeItem')}</strong> <code style={codeStyle}>2</code> {fmtLabel('obsGuideKeyframeDesc')}</li>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuidePreset')}</strong> <code style={codeStyle}>veryfast</code> (x264) o <code style={codeStyle}>P6: Slower</code> (NVENC) {fmtLabel('obsGuidePresetDesc')}</li>
              <li><strong>{fmtLabel('obsGuideProfile')}</strong> <code style={codeStyle}>high</code></li>
            </ul>

            <SectionTitle text={fmtLabel('obsGuideAudio')} />
            <p>{fmtLabel('obsGuideAudioDesc')}</p>
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuideSampleRate')}</strong> <code style={codeStyle}>48 kHz</code></li>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuideAudioBitrateItem')}</strong> <code style={codeStyle}>{audioBitrate}</code> kbps</li>
            </ul>

            <SectionTitle text={fmtLabel('obsGuideVideoTab')} />
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.5rem' }}>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuideBaseRes')}</strong> {fmtLabel('obsGuideBaseResDesc')}</li>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuideOutputRes')}</strong> <code style={codeStyle}>{w} × {h}</code></li>
              <li style={{ marginBottom: '0.25rem' }}><strong>{fmtLabel('obsGuideFpsItem')}</strong> <code style={codeStyle}>{fps}</code></li>
              <li><strong>{fmtLabel('obsGuideFilter')}</strong> <code style={codeStyle}>Lanczos</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const codeStyle: React.CSSProperties = {
  background: 'rgba(124,58,237,0.12)', padding: '0.1rem 0.35rem', borderRadius: 4,
  color: '#a78bfa', fontSize: '0.78rem',
};

function ResultBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{ background: 'var(--sf-surface)', borderRadius: 8, padding: '0.75rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--sf-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{unit}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--sf-text-2)', marginTop: '0.15rem' }}>{label}</div>
    </div>
  );
}

function MiniBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--sf-surface)', borderRadius: 6, padding: '0.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--sf-text-3)' }}>{label}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
      <span>{label}</span>
      <span style={{ color: '#c084fc', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sf-text)', marginBottom: '0.4rem', marginTop: '0.25rem' }}>
      {text}
    </div>
  );
}
