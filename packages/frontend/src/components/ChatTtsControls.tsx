import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { useTts } from '../contexts/TtsContext';
import { getVoices, cancelAll } from '../utils/tts';
import { useSocketEvent } from '../hooks/useSocket';
import { Toggle } from './Toggle';
import styles from './ChatTtsControls.module.css';

export function ChatTtsControls() {
  const { t } = useTranslation();
  const tts = useTts();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [piperProgress, setPiperProgress] = useState<{stage?: string, percent?: number} | null>(null);

  useSocketEvent('tts:piper-download-progress', (data: {stage?: string, percent?: number}) => {
    if (data.stage === 'done') {
      setPiperProgress(null);
    } else {
      setPiperProgress(data);
    }
  });

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const update = () => setVoices(getVoices());
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  return (
    <div className={`${styles.ttsBox} ${tts.enabled ? styles.ttsBoxEnabled : styles.ttsBoxDisabled}`}>
      <div className="flex-between mb-1">
        <div className="flex-row--gap-sm" style={{ alignItems: 'center' }}>
          <span className="text-dim" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('chat.tts')}</span>
          <Toggle
            checked={tts.enabled}
            onChange={(c) => { tts.setEnabled(c); if (!c) cancelAll(); }}
            size="sm"
          />
        </div>
        {tts.enabled && (
          <button
            onClick={() => cancelAll()}
            className={styles.collapseArrow}
          >{t('chat.detener')}</button>
        )}
      </div>
      {tts.enabled && (
        <div className="flex-col--gap-sm">
          <div className="flex-row--gap-sm" style={{ marginBottom: '0.2rem', alignItems: 'center' }}>
            <span className="text-dim" style={{ fontSize: '0.8rem', minWidth: 45 }}>Motor</span>
            <select
              value={tts.engine}
              onChange={(e) => tts.setEngine(e.target.value as 'native' | 'piper')}
              style={{
                flex: 1, padding: '0.4rem 0.6rem', borderRadius: 6,
                border: '1px solid var(--sf-border)',
                background: '#13132e', color: '#e2e8f0',
                fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="native">Windows / Chrome (Nativo)</option>
              <option value="piper">Piper TTS (Servidor Local)</option>
            </select>
          </div>

          {tts.engine === 'piper' && (
            <div className="flex-col--gap-sm" style={{ marginTop: '0.4rem', padding: '0.6rem', background: 'rgba(0,0,0,0.25)', borderRadius: 6 }}>
              <div className="flex-row--gap-sm" style={{ marginBottom: '0.5rem', alignItems: 'center' }}>
                <span className="text-dim" style={{ fontSize: '0.8rem', minWidth: 45 }}>Idioma</span>
                <select
                  value={tts.piperLang}
                  onChange={(e) => tts.setPiperLang(e.target.value as 'es' | 'en')}
                  style={{
                    flex: 1, padding: '0.4rem 0.6rem', borderRadius: 6,
                    border: '1px solid var(--sf-border)',
                    background: '#13132e', color: '#e2e8f0',
                    fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="es">Castellano (España)</option>
                  <option value="en">Inglés (EEUU)</option>
                </select>
              </div>
              <span className="text-dim" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                Piper TTS se descargará automáticamente la primera vez que se use un idioma.
              </span>
              {piperProgress && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#a78bfa', marginBottom: 2 }}>
                    <span>{piperProgress.stage === 'extracting' ? 'Extrayendo...' : 'Descargando...'}</span>
                    <span>{piperProgress.percent}%</span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${piperProgress.percent}%`, height: '100%', background: '#7c3aed', transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {tts.engine === 'native' && window.speechSynthesis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.4rem' }}>
              <div className="flex-row--gap-sm" style={{ alignItems: 'center' }}>
                <span className="text-dim" style={{ fontSize: '0.8rem', minWidth: 45 }}>{t('chat.voz')}</span>
                <select
                  value={tts.voiceURI ?? ''}
                  onChange={(e) => tts.setVoiceURI(e.target.value || null)}
                  style={{
                    flex: 1, padding: '0.4rem 0.6rem', borderRadius: 6,
                    border: '1px solid var(--sf-border)',
                    background: '#13132e', color: '#e2e8f0',
                    fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">{t('chat.vozPorDefecto')}</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-row--gap-sm" style={{ alignItems: 'center' }}>
                <span className="text-dim" style={{ fontSize: '0.8rem', minWidth: 45 }}>{t('chat.velocidad')}</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={tts.rate}
                  onChange={(e) => tts.setRate(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer', height: '1.2rem' }}
                />
                <span className="text-dim" style={{ fontSize: '0.8rem', minWidth: 32, textAlign: 'right' }}>{tts.rate.toFixed(1)}x</span>
              </div>
              <div className="flex-row--gap-sm" style={{ alignItems: 'center' }}>
                <span className="text-dim" style={{ fontSize: '0.8rem', minWidth: 45 }}>{t('chat.volumen')}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={tts.volume}
                  onChange={(e) => tts.setVolume(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer', height: '1.2rem' }}
                />
                <span className="text-dim" style={{ fontSize: '0.8rem', minWidth: 32, textAlign: 'right' }}>{Math.round(tts.volume * 100)}%</span>
              </div>
            </div>
          )}

          <div className="sf-divider" style={{ margin: '0.8rem 0 0.5rem 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div className="flex-between">
              <span className="text-dim" style={{ fontSize: '0.8rem' }}>{t('chat.ttsFilterOwn')}</span>
              <Toggle checked={tts.filters.excludeOwn} onChange={(c) => tts.setFilters({ ...tts.filters, excludeOwn: c })} size="md" />
            </div>
            <div className="flex-between">
              <span className="text-dim" style={{ fontSize: '0.8rem' }}>{t('chat.ttsFilterLinks')}</span>
              <Toggle checked={tts.filters.excludeLinks} onChange={(c) => tts.setFilters({ ...tts.filters, excludeLinks: c })} size="md" />
            </div>
            <div className="flex-between">
              <span className="text-dim" style={{ fontSize: '0.8rem' }}>{t('chat.ttsFilterBots')}</span>
              <Toggle checked={tts.filters.excludeBots} onChange={(c) => tts.setFilters({ ...tts.filters, excludeBots: c })} size="md" />
            </div>
            <div className="flex-between">
              <span className="text-dim" style={{ fontSize: '0.8rem' }}>{t('chat.ttsReadAuthor')}</span>
              <Toggle checked={tts.filters.readAuthor} onChange={(c) => tts.setFilters({ ...tts.filters, readAuthor: c })} size="md" />
            </div>
          </div>
          {tts.filters.excludeBots && (
            <input
              type="text"
              value={tts.filters.botNames}
              onChange={(e) => tts.setFilters({ ...tts.filters, botNames: e.target.value })}
              placeholder={t('chat.ttsBotPlaceholder')}
              className="sf-input"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', marginTop: '0.2rem', borderRadius: 6 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
