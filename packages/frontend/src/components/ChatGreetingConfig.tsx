import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { apiGet, apiPut } from '../utils/api';
import { Toggle } from './Toggle';
import styles from './ChatGreetingConfig.module.css';

interface Props {
  channel: string;
}

export function ChatGreetingConfig({ channel }: Props) {
  const { t } = useTranslation();
  const [greetingEnabled, setGreetingEnabled] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState('¡Bienvenido {user} al canal!');
  const [greetingOpen, setGreetingOpen] = useState(false);

  useEffect(() => {
    if (!channel) return;
    apiGet(`/chat/greeting-config?channel=${encodeURIComponent(channel)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.enabled === 'boolean') {
          setGreetingEnabled(data.enabled);
          if (data.message) setGreetingMessage(data.message);
        }
      })
      .catch(() => {});
  }, [channel]);

  return (
    <div className={`${styles.greetingBox} ${greetingEnabled ? styles.greetingBoxEnabled : styles.greetingBoxDisabled}`}>
      <div className="flex-between mb-1">
        <div className="flex-row--gap-sm">
          <span className="text-dim" style={{ fontSize: '0.7rem', fontWeight: 500 }}>
            {t('chat.greeting')}
          </span>
          <Toggle
            checked={greetingEnabled}
            onChange={async (c) => {
              setGreetingEnabled(c);
              await apiPut('/chat/greeting-config', { channel, enabled: c });
            }}
            size="sm"
          />
        </div>
        <button
          onClick={() => setGreetingOpen(!greetingOpen)}
          className={styles.collapseArrow}
          style={{ transform: greetingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >▼</button>
      </div>
      {greetingOpen && (
        <div className="flex-col--gap-sm">
          <div className="flex-row--gap-sm">
            <span className="text-dim" style={{ fontSize: '0.65rem', minWidth: 44 }}>
              {t('chat.greetingMsg')}
            </span>
            <input
              type="text"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              onBlur={() => apiPut('/chat/greeting-config', { channel, message: greetingMessage })}
              placeholder="¡Bienvenido {user} al canal!"
              className="sf-input"
              style={{ flex: 1, fontSize: '0.78rem', fontFamily: 'monospace' }}
            />
          </div>
          {greetingMessage.includes('{user}') && (
            <div className={styles.greetingPreview}>
              {t('chat.greetingPreview')}: <span style={{ color: '#a78bfa' }}>
                {greetingMessage.replace(/\{user\}/g, '@' + (channel || 'usuario'))}
              </span>
            </div>
          )}
          <div className={styles.greetingHint}>{t('chat.greetingDelay')}</div>
        </div>
      )}
    </div>
  );
}
