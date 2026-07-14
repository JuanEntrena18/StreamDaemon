import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { useTts } from '../contexts/TtsContext';
import { getVoices, cancelAll } from '../utils/tts';
import { Toggle } from './Toggle';
import styles from './ChatTtsControls.module.css';

export function ChatTtsControls() {
  const { t } = useTranslation();
  const tts = useTts();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

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
        <div className="flex-row--gap-sm">
          <span className="text-dim" style={{ fontSize: '0.7rem', fontWeight: 500 }}>{t('chat.tts')}</span>
          <Toggle
            checked={tts.enabled}
            onChange={(c) => { tts.setEnabled(c); if (!c) cancelAll(); }}
            size="sm"
          />
        </div>
        {tts.enabled && window.speechSynthesis && (
          <button
            onClick={() => cancelAll()}
            className={styles.collapseArrow}
          >{t('chat.detener')}</button>
        )}
      </div>
      {tts.enabled && window.speechSynthesis && (
        <div className="flex-col--gap-sm">
          <div className="flex-row--gap-sm">
            <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 34 }}>{t('chat.voz')}</span>
            <select
              value={tts.voiceURI ?? ''}
              onChange={(e) => tts.setVoiceURI(e.target.value || null)}
              style={{
                flex: 1, padding: '0.2rem 0.4rem', borderRadius: 4,
                border: '1px solid var(--sf-border)',
                background: '#13132e', color: '#e2e8f0',
                fontSize: '0.7rem', fontFamily: 'inherit', outline: 'none',
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
          <div className="flex-row--gap-sm">
            <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 34 }}>{t('chat.velocidad')}</span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={tts.rate}
              onChange={(e) => tts.setRate(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
            <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 24 }}>{tts.rate.toFixed(1)}x</span>
          </div>
          <div className="flex-row--gap-sm">
            <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 34 }}>{t('chat.volumen')}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={tts.volume}
              onChange={(e) => tts.setVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
            <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 24 }}>{Math.round(tts.volume * 100)}%</span>
          </div>
          <div className="sf-divider" style={{ margin: '0.35rem 0' }} />
          <div className="flex-col--gap-sm">
            <div className="flex-between">
              <span className="text-dim" style={{ fontSize: '0.65rem' }}>{t('chat.ttsFilterOwn')}</span>
              <Toggle checked={tts.filters.excludeOwn} onChange={(c) => tts.setFilters({ ...tts.filters, excludeOwn: c })} size="sm" />
            </div>
            <div className="flex-between">
              <span className="text-dim" style={{ fontSize: '0.65rem' }}>{t('chat.ttsFilterLinks')}</span>
              <Toggle checked={tts.filters.excludeLinks} onChange={(c) => tts.setFilters({ ...tts.filters, excludeLinks: c })} size="sm" />
            </div>
            <div className="flex-between">
              <span className="text-dim" style={{ fontSize: '0.65rem' }}>{t('chat.ttsFilterBots')}</span>
              <Toggle checked={tts.filters.excludeBots} onChange={(c) => tts.setFilters({ ...tts.filters, excludeBots: c })} size="sm" />
            </div>
            <div className="flex-between">
              <span className="text-dim" style={{ fontSize: '0.65rem' }}>{t('chat.ttsReadAuthor')}</span>
              <Toggle checked={tts.filters.readAuthor} onChange={(c) => tts.setFilters({ ...tts.filters, readAuthor: c })} size="sm" />
            </div>
          </div>
          {tts.filters.excludeBots && (
            <input
              type="text"
              value={tts.filters.botNames}
              onChange={(e) => tts.setFilters({ ...tts.filters, botNames: e.target.value })}
              placeholder={t('chat.ttsBotPlaceholder')}
              className="sf-input"
              style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}
            />
          )}
        </div>
      )}
    </div>
  );
}
