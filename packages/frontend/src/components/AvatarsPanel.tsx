import { useState, useCallback } from 'react';
import { useTranslation } from '../i18n/context';
import { useAvatarConfig } from '../avatars/avatarStore';
import { getAvailableThemes } from '../avatars/AvatarThemeMapper';
import { Toggle } from './Toggle';
import styles from './AvatarsPanel.module.css';

interface Props {
  channel: string;
}

const THEME_META: Record<string, { icon: string; nameKey: string; descKey: string }> = {
  default:   { icon: '🤖', nameKey: 'avatars.themeDefault',   descKey: 'avatars.themeDefaultDesc' },
  cyberpunk: { icon: '🌆', nameKey: 'avatars.themeCyberpunk', descKey: 'avatars.themeCyberpunkDesc' },
  '8bits':   { icon: '🕹️', nameKey: 'avatars.theme8bits',    descKey: 'avatars.theme8bitsDesc' },
};

const EVENTS = [
  { key: 'chat',         icon: '💬', labelKey: 'avatars.eventChat' },
  { key: 'bits',         icon: '💎', labelKey: 'avatars.eventBits' },
  { key: 'subscription', icon: '⭐', labelKey: 'avatars.eventSub' },
  { key: 'raid',         icon: '⚔️', labelKey: 'avatars.eventRaid' },
  { key: 'follow',       icon: '❤️', labelKey: 'avatars.eventFollow' },
];

const COMMANDS = [
  { cmd: '!dance',   defaultCooldown: 5 },
  { cmd: '!wave',    defaultCooldown: 3 },
  { cmd: '!jump',    defaultCooldown: 2 },
  { cmd: '!explode', defaultCooldown: 10 },
  { cmd: '!sleep',   defaultCooldown: 0 },
];

export function AvatarsPanel({ channel }: Props) {
  const { t } = useTranslation();
  const { config, updateField } = useAvatarConfig();
  const [copied, setCopied] = useState(false);

  const overlayBaseUrl = import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const overlayUrl = `${overlayBaseUrl}/overlay.html?mode=avatars&channel=${channel}&backend=${encodeURIComponent(backendUrl)}`;

  const themes = getAvailableThemes();

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

  const toggleEvent = (key: string) => {
    updateField('eventActions', {
      ...(config.eventActions || {}),
      [key]: !(config.eventActions?.[key] ?? true),
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={`sf-heading ${styles.heading}`}>
          👾 {t('avatars.title')}
          <span className={styles.betaBadge}>🧪 BETA</span>
        </h2>
        <p className={styles.subtitle}>
          {t('avatars.subtitle')}
        </p>
      </div>

      {/* Enable toggle */}
      <div className={`glass-card ${styles.card}`}>
        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>{t('avatars.enableLabel')}</div>
            <div className={styles.toggleDesc}>{t('avatars.enableDesc')}</div>
          </div>
          <Toggle
            checked={config.enabled}
            onChange={() => updateField('enabled', !config.enabled)}
            size="md"
          />
        </div>
      </div>

      {/* Theme selector */}
      <div className={`glass-card ${styles.card}`} style={{ marginTop: '1rem' }}>
        <p className={styles.sectionTitle}>🎨 {t('avatars.themeTitle')}</p>
        <p className={styles.sectionDesc}>{t('avatars.themeDesc')}</p>
        <div className={styles.themesGrid}>
          {themes.map((themeId) => {
            const meta = THEME_META[themeId] || { icon: '🎮', nameKey: themeId, descKey: '' };
            const isActive = config.theme === themeId;
            return (
              <button
                key={themeId}
                className={isActive ? styles.themeCardActive : styles.themeCard}
                onClick={() => updateField('theme', themeId)}
              >
                <span className={styles.themeIcon}>{meta.icon}</span>
                <div className={styles.themeInfo}>
                  <div className={styles.themeName}>{t(meta.nameKey)}</div>
                  {meta.descKey && <div className={styles.themeDesc}>{t(meta.descKey)}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Avatar limits */}
      <div className={`glass-card ${styles.card}`} style={{ marginTop: '1rem' }}>
        <p className={styles.sectionTitle}>📊 {t('avatars.limitsTitle')}</p>
        <p className={styles.sectionDesc}>{t('avatars.limitsDesc')}</p>

        <div style={{ marginBottom: '1rem' }}>
          <div className={styles.toggleRow} style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)' }}>{t('avatars.maxAvatars')}</span>
            <span className={styles.sliderValue}>{config.maxAvatars}</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={config.maxAvatars}
            onChange={(e) => updateField('maxAvatars', parseInt(e.target.value, 10))}
            className={styles.slider}
          />
        </div>

        <div className={styles.toggleRow}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)' }}>{t('avatars.physics')}</span>
          </div>
          <Toggle
            checked={config.physicsEnabled}
            onChange={() => updateField('physicsEnabled', !config.physicsEnabled)}
            size="sm"
          />
        </div>

        <div className={styles.toggleRow} style={{ marginTop: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--sf-text-2)' }}>{t('avatars.nametags')}</span>
          </div>
          <Toggle
            checked={config.nametagsVisible}
            onChange={() => updateField('nametagsVisible', !config.nametagsVisible)}
            size="sm"
          />
        </div>
      </div>

      {/* Chat commands */}
      <div className={`glass-card ${styles.card}`} style={{ marginTop: '1rem' }}>
        <div className={styles.toggleRow} style={{ marginBottom: '1rem' }}>
          <div>
            <p className={styles.sectionTitle} style={{ marginBottom: 0 }}>🤖 {t('avatars.commandsTitle')}</p>
            <p className={styles.sectionDesc} style={{ marginBottom: 0 }}>{t('avatars.commandsDesc')}</p>
          </div>
          <Toggle
            checked={config.commandsEnabled ?? true}
            onChange={() => updateField('commandsEnabled', !config.commandsEnabled)}
            size="sm"
          />
        </div>

        <div className={styles.commandsGrid}>
          {COMMANDS.map(({ cmd, defaultCooldown }) => (
            <div key={cmd} className={styles.commandRow}>
              <span className={styles.commandName}>{cmd}</span>
              <span className={styles.commandCooldown}>
                {config.commandCooldowns?.[cmd] ?? defaultCooldown}s cooldown
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Event reactions */}
      <div className={`glass-card ${styles.card}`} style={{ marginTop: '1rem' }}>
        <p className={styles.sectionTitle}>⚡ {t('avatars.eventsTitle')}</p>
        <p className={styles.sectionDesc}>{t('avatars.eventsDesc')}</p>
        <div className={styles.eventsGrid}>
          {EVENTS.map(({ key, icon, labelKey }) => (
            <div key={key} className={styles.eventRow}>
              <span className={styles.eventLabel}>
                <span className={styles.eventIcon}>{icon}</span>
                {t(labelKey)}
              </span>
              <Toggle
                checked={config.eventActions?.[key] ?? true}
                onChange={() => toggleEvent(key)}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Overlay URL */}
      <div className={`glass-card ${styles.card}`} style={{ marginTop: '1rem' }}>
        <p className={styles.sectionTitle}>🔌 {t('avatars.overlayTitle')}</p>
        <p className={styles.sectionDesc}>{t('avatars.overlayDesc')}</p>
        <code className={styles.urlBox}>{overlayUrl}</code>
        <button
          onClick={copyUrl}
          className={`sf-btn ${copied ? 'sf-btn-ghost' : 'sf-btn-primary'} ${styles.copyBtn}`}
        >
          {copied ? t('obs.copiado') : t('obs.copiar')}
        </button>
      </div>

      {/* Beta info */}
      <div className={styles.betaInfo}>
        <div className={styles.betaInfoTitle}>🧪 {t('avatars.betaInfoTitle')}</div>
        {t('avatars.betaInfoText')}
      </div>
    </div>
  );
}
