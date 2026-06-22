import { useTranslation } from '../i18n/context';
import { SOUNDS, setMasterVolume, type SoundKey } from '../utils/sounds';
import styles from './ChatSoundSelector.module.css';

interface Props {
  selectedSound: SoundKey | '';
  soundVolume: number;
  onSoundChange: (sound: SoundKey | '') => void;
  onVolumeChange: (volume: number) => void;
}

function pillClasses(active: boolean, extra?: string) {
  return `${styles.pillBtn} ${active ? styles['pillBtn--active'] : ''} ${extra || ''}`;
}

export function ChatSoundSelector({ selectedSound, soundVolume, onSoundChange, onVolumeChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.soundRow}>
      <span className="text-dim" style={{ fontSize: '0.7rem', fontWeight: 500 }}>{t('chat.sonido')}</span>
      <div className="flex-row--gap-sm flex-wrap">
        <button
          onClick={() => onSoundChange('')}
          className={pillClasses(selectedSound === '', styles['pillBtn--xs'])}
        >{t('chat.sinSonido')}</button>
        {(['pop', 'ding', 'chime', 'notification'] as SoundKey[]).map((s) => (
          <button
            key={s}
            onClick={() => onSoundChange(s)}
            className={pillClasses(selectedSound === s, styles['pillBtn--xs'])}
            onMouseEnter={() => { setMasterVolume(soundVolume); SOUNDS[s](); }}
          >{s === 'pop' ? t('chat.sonidoPop') : s === 'ding' ? t('chat.sonidoDing') : s === 'chime' ? t('chat.sonidoChime') : t('chat.sonidoNotif')}</button>
        ))}
      </div>
      <div className={styles.volRange}>
        <span className="text-dim" style={{ fontSize: '0.6rem', minWidth: 16 }}>🔈</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={soundVolume}
          onChange={(e) => { onVolumeChange(parseFloat(e.target.value)); setMasterVolume(parseFloat(e.target.value)); }}
          style={{ width: 56, accentColor: '#7c3aed', cursor: 'pointer' }}
          title={t('chat.volumenSonidos')}
        />
        <span className="text-dim" style={{ fontSize: '0.6rem', minWidth: 16 }}>🔊</span>
      </div>
    </div>
  );
}
